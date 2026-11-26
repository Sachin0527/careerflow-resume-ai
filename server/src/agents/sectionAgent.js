import { createChatModel } from '../config/llm.js';
import { env } from '../config/env.js';
import {
  SECTION_CONSISTENCY_SYSTEM_PROMPT,
  SECTION_ENHANCE_SYSTEM_PROMPT,
} from '../prompts/section.js';
import { sectionRewriteOutputSchema } from '../schemas/agentOutput.js';
import { invokeWithSchemaRetry } from '../utils/retryWithSchema.js';

/**
 * Section Enhancement Agent.
 * Enhances requested sections (strong action verbs, XYZ impact formula, "[X]" placeholders),
 * then runs a whole-document consistency pass (tense, dates, punctuation, bullet length).
 */
export async function run({
  resume,
  instructions = '',
  targetSections = [],
  entities = {},
  context = {},
  onStep = () => {},
}) {
  const sections =
    targetSections.length > 0
      ? targetSections
      : entities?.sections?.length > 0
        ? entities.sections
        : ['basics.summary', 'experience', 'projects', 'skills'];

  const deps = context?.deps || {};
  const proModel = deps.proModel || createChatModel(env.GEMINI_PRO_MODEL, 0.4);
  const consistencyModel = deps.consistencyModel || createChatModel(env.GEMINI_PRO_MODEL, 0.2);

  onStep(
    `Enhancing section(s) [${sections.join(', ')}] with XYZ impact statements and [X] placeholders...`
  );
  const enhanced = await invokeWithSchemaRetry({
    model: proModel,
    schema: sectionRewriteOutputSchema,
    systemPrompt: SECTION_ENHANCE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        targetSections: sections,
        instructions:
          instructions ||
          `Enhance ${sections.join(', ')} with strong action verbs, XYZ impact framing, and [X] placeholders where metrics are missing.`,
        resume,
      },
      null,
      2
    ),
    maxRetries: 2,
    context: { agent: 'sectionAgent', stage: 'enhance', sections },
  });

  onStep('Running whole-document consistency pass (tense, date format, punctuation, bullet length)...');
  const consistent = await invokeWithSchemaRetry({
    model: consistencyModel,
    schema: sectionRewriteOutputSchema,
    systemPrompt: SECTION_CONSISTENCY_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        enhancedSections: sections,
        resume: enhanced.updatedResume,
      },
      null,
      2
    ),
    maxRetries: 2,
    context: { agent: 'sectionAgent', stage: 'consistency' },
  });

  const mergedChanges = [...enhanced.changes, ...consistent.changes];
  const mergedReasoning = [...enhanced.reasoning, ...consistent.reasoning].slice(0, 4);

  return {
    updatedResume: consistent.updatedResume,
    changes: mergedChanges,
    reasoning: mergedReasoning,
    extras: {
      enhancedSections: sections,
      consistencyPassApplied: true,
      consistencyEditsCount: consistent.changes.length,
    },
  };
}
