import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ZodError } from 'zod';
import { logger } from './logger.js';
import { DEFAULT_LLM_TIMEOUT_MS, withTimeout } from './timeout.js';

function formatSchemaError(err) {
  const zodErr = err instanceof ZodError ? err : err?.cause instanceof ZodError ? err.cause : null;
  if (zodErr) {
    return zodErr.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
  }
  return err?.message || 'Unknown schema validation error';
}

/**
 * Invoke a LangChain chat model with structured output and retry up to `maxRetries` times
 * on schema/parsing failure, feeding the exact validation error back to the model.
 */
export async function invokeWithSchemaRetry({
  model,
  schema,
  systemPrompt,
  userPrompt,
  maxRetries = 2,
  timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
  context = {},
}) {
  const structuredModel = model.withStructuredOutput(schema);
  const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const rawResult = await withTimeout(
        structuredModel.invoke(messages),
        timeoutMs,
        context.agent ? `${context.agent} LLM call` : 'LLM structured call'
      );
      return schema.parse(rawResult);
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.statusCode === 504) {
        throw err;
      }

      lastError = err;
      const errorFeedback = formatSchemaError(err);
      logger.warn(
        { ...context, attempt: attempt + 1, maxAttempts: maxRetries + 1, errorFeedback },
        'Structured output validation failed'
      );

      if (attempt < maxRetries) {
        messages.push(
          new HumanMessage(
            `Your previous output failed schema validation with error(s): ${errorFeedback}. ` +
              `Fix the structure and types to satisfy the schema strictly without inventing any facts.`
          )
        );
      }
    }
  }

  throw lastError;
}
