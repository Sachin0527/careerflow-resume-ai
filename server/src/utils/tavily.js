import { TavilySearch } from '@langchain/tavily';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { DEFAULT_TAVILY_TIMEOUT_MS, withTimeout } from './timeout.js';

/**
 * Run multiple Tavily search queries concurrently with timeouts and graceful fallback.
 * Never throws: if all queries fail or time out, returns `{ queryResults: [], sources: [], failed: true, failureReason }`.
 */
export async function searchTavilyQueries(
  queries,
  { maxResults = 4, searchDepth = 'basic', timeoutMs = DEFAULT_TAVILY_TIMEOUT_MS, tool } = {}
) {
  let tavily;
  try {
    tavily =
      tool ||
      new TavilySearch({
        maxResults,
        searchDepth,
        tavilyApiKey: env.TAVILY_API_KEY,
      });
  } catch (initErr) {
    logger.warn({ err: initErr.message }, 'Failed to initialize TavilySearch client');
    return {
      queryResults: [],
      sources: [],
      failed: true,
      failureReason: initErr.message || 'Tavily initialization failed',
    };
  }

  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      const response = await withTimeout(
        tavily.invoke({ query }),
        timeoutMs,
        'Tavily web search'
      );
      if (response?.error) {
        throw new Error(response.error);
      }
      const results = Array.isArray(response?.results) ? response.results : [];
      return { query, results };
    })
  );

  const queryResults = [];
  const sourceUrls = new Set();
  const failureMessages = [];

  for (let i = 0; i < settled.length; i++) {
    const item = settled[i];
    if (item.status === 'fulfilled') {
      queryResults.push(item.value);
      for (const r of item.value.results) {
        if (r?.url) sourceUrls.add(r.url);
      }
    } else {
      const msg = item.reason?.message || 'Tavily query failed';
      failureMessages.push(msg);
      logger.warn({ query: queries[i], err: msg }, 'Tavily search query failed');
    }
  }

  const failed = queryResults.length === 0;
  return {
    queryResults,
    sources: [...sourceUrls],
    failed,
    failureReason: failed ? failureMessages[0] || 'No web search results returned' : null,
  };
}
