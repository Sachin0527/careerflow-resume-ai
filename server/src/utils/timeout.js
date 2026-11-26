import { GatewayTimeoutError } from './errors.js';

export const DEFAULT_LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 60000;
export const DEFAULT_TAVILY_TIMEOUT_MS = Number(process.env.TAVILY_TIMEOUT_MS) || 12000;
export const MAX_JD_TEXT_CHARS = 15000;

/**
 * Race a promise against a timer and reject with GatewayTimeoutError if it exceeds `timeoutMs`.
 */
export async function withTimeout(promise, timeoutMs, label = 'Operation') {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new GatewayTimeoutError(
              `${label} timed out after ${Math.round(timeoutMs / 1000)}s.`
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
