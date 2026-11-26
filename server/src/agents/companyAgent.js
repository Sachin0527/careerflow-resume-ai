import { createChatModel } from '../config/llm.js';
import { env } from '../config/env.js';
import {
  COMPANY_PROFILE_SYSTEM_PROMPT,
  COMPANY_REWRITE_SYSTEM_PROMPT,
} from '../prompts/company.js';
import {
  companyProfileSchema,
  companyRewriteOutputSchema,
} from '../schemas/agentOutput.js';
import {
  getCachedCompanyProfile,
  saveCompanyProfile,
} from '../services/companyCache.js';
import { BadRequestError } from '../utils/errors.js';
import { invokeWithSchemaRetry } from '../utils/retryWithSchema.js';
import { searchTavilyQueries } from '../utils/tavily.js';

/**
 * Company Research & Optimization Agent.
 * Searches Tavily (3-5 queries), caches company profile for 7 days in Firestore,
 * and rewrites summary + bullets to reflect company values and tone.
 */
export async function run({
  resume,
  instructions = '',
  targetSections = [],
  entities = {},
  context = {},
  onStep = () => {},
}) {
  const company = (
    entities?.company ||
    context?.activeCompany ||
    resume?.meta?.targetCompany ||
    ''
  ).trim();

  if (!company) {
    throw new BadRequestError('Target company is required for Company Optimization Agent.');
  }

  const deps = context?.deps || {};
  const fastModel = deps.fastModel || createChatModel(env.GEMINI_FAST_MODEL, 0);
  const proModel = deps.proModel || createChatModel(env.GEMINI_PRO_MODEL, 0.4);
  const getCache = deps.getCachedCompanyProfile || getCachedCompanyProfile;
  const saveCache = deps.saveCompanyProfile || saveCompanyProfile;
  const searchFn = deps.searchTavilyQueries || searchTavilyQueries;

  onStep(`Checking 7-day company profile cache for ${company}...`);
  let cached = await getCache(company);
  let companyProfile;
  let sources;
  let fromCache = false;
  let tavilyFallback = false;
  let tavilyWarning = null;

  if (cached) {
    fromCache = true;
    companyProfile = cached.profile;
    sources = cached.sources;
    onStep(`Using cached company profile for ${company} (within 7-day TTL).`);
  } else {
    const queries = [
      `"${company}" company core values culture mission`,
      `"${company}" engineering blog OR engineering culture`,
      `"${company}" hiring criteria interview values`,
      `"${company}" recent news product strategy`,
    ];

    onStep(`Searching Tavily (${queries.length} queries) for ${company} culture & hiring signals...`);
    const searchResult = await searchFn(queries, { maxResults: 4 });
    sources = searchResult.sources || [];
    tavilyFallback = Boolean(searchResult.failed || (searchResult.queryResults || []).length === 0);
    tavilyWarning = tavilyFallback
      ? `Live company web search was unavailable (${searchResult.failureReason || 'no results'}); tailored using conservative public knowledge of ${company}.`
      : null;

    if (tavilyFallback) {
      onStep(tavilyWarning);
    } else {
      onStep(`Synthesizing ${company} profile and caching for 7 days...`);
    }

    const formattedResults = (searchResult.queryResults || [])
      .map(
        (q) =>
          `Query: ${q.query}\n` +
          q.results
            .map((r) => `- [${r.title || 'Source'}](${r.url || ''}): ${(r.content || '').slice(0, 500)}`)
            .join('\n')
      )
      .join('\n\n');

    companyProfile = await invokeWithSchemaRetry({
      model: fastModel,
      schema: companyProfileSchema,
      systemPrompt: COMPANY_PROFILE_SYSTEM_PROMPT,
      userPrompt: `Target company: ${company}\n\nSearch results:\n${formattedResults || 'No web snippets returned; infer only conservative, well-known public engineering expectations.'}`,
      maxRetries: 2,
      context: { agent: 'companyAgent', stage: 'profile', company },
    });

    if (!tavilyFallback && sources.length > 0) {
      await saveCache(company, { profile: companyProfile, sources });
    }
  }

  onStep(`Rewriting resume summary and experience bullets for ${company}...`);
  const rewrite = await invokeWithSchemaRetry({
    model: proModel,
    schema: companyRewriteOutputSchema,
    systemPrompt: COMPANY_REWRITE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        targetCompany: company,
        companyProfile,
        targetSections: targetSections.length > 0 ? targetSections : ['basics.summary', 'experience'],
        instructions: instructions || `Optimize resume for ${company}.`,
        resume,
      },
      null,
      2
    ),
    maxRetries: 2,
    context: { agent: 'companyAgent', stage: 'rewrite', company },
  });

  const updatedResume = {
    ...rewrite.updatedResume,
    meta: {
      ...rewrite.updatedResume.meta,
      targetCompany: company,
    },
  };

  const reasoning = tavilyWarning
    ? [...rewrite.reasoning.slice(0, 3), tavilyWarning]
    : rewrite.reasoning;

  return {
    updatedResume,
    changes: rewrite.changes,
    reasoning,
    extras: {
      company,
      companyProfile,
      sources,
      fromCache,
      tavilyFallback,
      ...(tavilyWarning ? { tavilyWarning } : {}),
    },
  };
}
