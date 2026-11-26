import { createChatModel } from '../config/llm.js';
import { env } from '../config/env.js';
import {
  JD_EXTRACT_SYSTEM_PROMPT,
  JD_REWRITE_SYSTEM_PROMPT,
  JD_SCORE_SYSTEM_PROMPT,
} from '../prompts/jdMatch.js';
import {
  jdExtractionSchema,
  jdRewriteOutputSchema,
  jdScoringSchema,
} from '../schemas/agentOutput.js';
import {
  indexJdChunks,
  indexResumeChunks,
  queryMatchingResumeChunks,
} from '../services/vectorStore.js';
import { BadRequestError } from '../utils/errors.js';
import { invokeWithSchemaRetry } from '../utils/retryWithSchema.js';
import { MAX_JD_TEXT_CHARS } from '../utils/timeout.js';

/**
 * Compute exact weighted JD match score per spec:
 * required skills 50%, responsibilities 30%, seniority/experience 20%.
 */
export function computeWeightedMatchScore({
  requiredSkillsScore,
  responsibilitiesScore,
  seniorityScore,
}) {
  return Math.round(
    requiredSkillsScore * 0.5 + responsibilitiesScore * 0.3 + seniorityScore * 0.2
  );
}

/**
 * Job Description Matching Agent.
 * Extracts JD requirements, maps requirements to Pinecone resume chunks,
 * computes weighted 50/30/20 match score, and rewrites target sections.
 */
export async function run({
  resume,
  instructions = '',
  targetSections = [],
  entities = {},
  context = {},
  onStep = () => {},
}) {
  const jdText = (entities?.jdText || context?.activeJd || '').trim();
  if (!jdText) {
    throw new BadRequestError('Job description text is required for JD Matching Agent.');
  }
  if (jdText.length > MAX_JD_TEXT_CHARS) {
    throw new BadRequestError(
      `Job description exceeds the ${MAX_JD_TEXT_CHARS.toLocaleString()} character limit (${jdText.length.toLocaleString()} provided). Please trim it to key skills and responsibilities.`
    );
  }

  const deps = context?.deps || {};
  const fastModel = deps.fastModel || createChatModel(env.GEMINI_FAST_MODEL, 0);
  const proModel = deps.proModel || createChatModel(env.GEMINI_PRO_MODEL, 0.4);
  const ensureResumeFn = deps.indexResumeChunks || indexResumeChunks;
  const indexJdFn = deps.indexJdChunks || indexJdChunks;
  const queryChunksFn = deps.queryMatchingResumeChunks || queryMatchingResumeChunks;

  const conversationId = context?.conversationId || '';
  const versionId = context?.currentVersionId || 'active';

  onStep('Extracting required skills, responsibilities, and seniority from JD...');
  const extractedJd = await invokeWithSchemaRetry({
    model: fastModel,
    schema: jdExtractionSchema,
    systemPrompt: JD_EXTRACT_SYSTEM_PROMPT,
    userPrompt: `Job Description:\n\n${jdText}`,
    maxRetries: 2,
    context: { agent: 'jdMatchAgent', stage: 'extract' },
  });

  let retrievedMappings = [];
  if (conversationId) {
    onStep('Indexing resume/JD chunks and retrieving top matches from Pinecone...');
    if (context?.indexedVersionId !== versionId) {
      await ensureResumeFn({ conversationId, versionId, resume });
    }
    await indexJdFn({ conversationId, jdText });

    const queries = [
      ...extractedJd.requiredSkills.slice(0, 6),
      ...extractedJd.responsibilities.slice(0, 6),
    ];
    retrievedMappings = await queryChunksFn({
      conversationId,
      queries: queries.length > 0 ? queries : [jdText.slice(0, 400)],
      topK: 3,
    });
  } else {
    onStep('Skipping Pinecone indexing (no conversationId provided); evaluating directly...');
  }

  onStep('Computing weighted JD match score (50/30/20) and identifying skill gaps...');
  const scoreEval = await invokeWithSchemaRetry({
    model: fastModel,
    schema: jdScoringSchema,
    systemPrompt: JD_SCORE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        extractedJd,
        retrievedMappings,
        resume,
      },
      null,
      2
    ),
    maxRetries: 2,
    context: { agent: 'jdMatchAgent', stage: 'score' },
  });

  const matchScore = computeWeightedMatchScore(scoreEval);

  onStep(`Rewriting target sections for JD alignment (score: ${matchScore}/100)...`);
  const rewrite = await invokeWithSchemaRetry({
    model: proModel,
    schema: jdRewriteOutputSchema,
    systemPrompt: JD_REWRITE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        extractedJd,
        matchEvaluation: {
          matchScore,
          matchedSkills: scoreEval.matchedSkills,
          missingSkills: scoreEval.missingSkills,
          suggestions: scoreEval.suggestions,
        },
        retrievedMappings,
        targetSections:
          targetSections.length > 0 ? targetSections : ['basics.summary', 'experience', 'skills'],
        instructions: instructions || 'Align the requested sections with the job description.',
        resume,
      },
      null,
      2
    ),
    maxRetries: 2,
    context: { agent: 'jdMatchAgent', stage: 'rewrite' },
  });

  const targetRole = entities?.targetRole || extractedJd.roleTitle || rewrite.updatedResume.meta?.targetRole || null;
  const updatedResume = {
    ...rewrite.updatedResume,
    meta: {
      ...rewrite.updatedResume.meta,
      targetRole,
    },
  };

  return {
    updatedResume,
    changes: rewrite.changes,
    reasoning: rewrite.reasoning,
    extras: {
      matchScore,
      scoreBreakdown: {
        requiredSkills: scoreEval.requiredSkillsScore,
        responsibilities: scoreEval.responsibilitiesScore,
        seniority: scoreEval.seniorityScore,
      },
      matchedSkills: scoreEval.matchedSkills,
      missingSkills: scoreEval.missingSkills,
      suggestions: scoreEval.suggestions,
      retrievedMappings,
      extractedJd,
    },
  };
}
