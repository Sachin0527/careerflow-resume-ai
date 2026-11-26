import { createChatModel } from '../config/llm.js';
import { env } from '../config/env.js';
import { TRANSLATION_SYSTEM_PROMPT } from '../prompts/translation.js';
import { translationOutputSchema } from '../schemas/agentOutput.js';
import { BadRequestError } from '../utils/errors.js';
import { invokeWithSchemaRetry } from '../utils/retryWithSchema.js';
import { searchTavilyQueries } from '../utils/tavily.js';

function resolveLanguageAndLocale(entities = {}) {
  const rawLocale = (entities.locale || '').trim();
  const rawLanguage = (entities.language || '').trim();

  if (!rawLocale && !rawLanguage) {
    return null;
  }

  if (rawLocale && rawLanguage) {
    return { language: rawLanguage, locale: rawLocale };
  }

  if (rawLocale) {
    const langFromLocale = rawLocale.split(/[-_]/)[0].toLowerCase();
    return { language: langFromLocale, locale: rawLocale };
  }

  // Fallback mapping for common language codes/names when locale is omitted
  const normalized = rawLanguage.toLowerCase();
  const defaults = {
    es: 'es-ES',
    spanish: 'es-ES',
    fr: 'fr-FR',
    french: 'fr-FR',
    de: 'de-DE',
    german: 'de-DE',
    pt: 'pt-BR',
    portuguese: 'pt-BR',
    en: 'en-US',
    english: 'en-US',
  };
  const iso = normalized.length === 2 ? normalized : normalized.slice(0, 2);
  return {
    language: defaults[normalized] ? defaults[normalized].split('-')[0] : iso,
    locale: defaults[normalized] || iso,
  };
}

/**
 * Translation & Localization Agent.
 * Searches Tavily for local hiring conventions and translates + localizes full resume JSON.
 */
export async function run({
  resume,
  instructions = '',
  targetSections = [],
  entities = {},
  context = {},
  onStep = () => {},
}) {
  const target = resolveLanguageAndLocale(entities);
  if (!target) {
    throw new BadRequestError(
      'Target language or locale is required for Translation & Localization Agent.'
    );
  }

  const { language, locale } = target;
  const deps = context?.deps || {};
  const proModel = deps.proModel || createChatModel(env.GEMINI_PRO_MODEL, 0.4);
  const searchFn = deps.searchTavilyQueries || searchTavilyQueries;

  onStep(`Searching Tavily for ${locale} CV/resume hiring conventions...`);
  const queries = [
    `${locale} resume CV hiring conventions photo personal information`,
    `${locale} curriculum vitae date format length section order`,
  ];
  const searchResult = await searchFn(queries, { maxResults: 3 });
  const tavilyFallback = Boolean(
    searchResult.failed || (searchResult.queryResults || []).length === 0
  );
  const tavilyWarning = tavilyFallback
    ? `Live local hiring convention search was unavailable (${searchResult.failureReason || 'no results'}); applied standard ${locale} regional conventions.`
    : null;

  if (tavilyFallback) {
    onStep(tavilyWarning);
  }

  const conventionSnippets = (searchResult.queryResults || [])
    .map(
      (q) =>
        `Query: ${q.query}\n` +
        q.results
          .map((r) => `- [${r.title || 'Source'}](${r.url || ''}): ${(r.content || '').slice(0, 450)}`)
          .join('\n')
    )
    .join('\n\n');

  onStep(`Translating and localizing full resume JSON to ${locale} (${language})...`);
  const result = await invokeWithSchemaRetry({
    model: proModel,
    schema: translationOutputSchema,
    systemPrompt: TRANSLATION_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        targetLanguage: language,
        targetLocale: locale,
        targetSections,
        instructions: instructions || `Translate and localize resume for ${locale}.`,
        localHiringResearch: conventionSnippets || 'Apply standard regional CV conventions.',
        resume,
      },
      null,
      2
    ),
    maxRetries: 2,
    context: { agent: 'translationAgent', language, locale },
  });

  const updatedResume = {
    ...result.updatedResume,
    meta: {
      ...result.updatedResume.meta,
      language,
      locale,
    },
  };

  const localizationNotes = tavilyWarning
    ? [...(result.localizationNotes || []), tavilyWarning]
    : result.localizationNotes;

  return {
    updatedResume,
    changes: result.changes,
    reasoning: result.reasoning,
    extras: {
      language,
      locale,
      localizationNotes,
      sources: searchResult.sources || [],
      tavilyFallback,
      ...(tavilyWarning ? { tavilyWarning } : {}),
    },
  };
}
