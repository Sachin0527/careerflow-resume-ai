import { DEFAULT_LLM_TIMEOUT_MS, withTimeout } from './timeout.js';

/**
 * Extract plain text from a LangChain message/chunk content field (string or content-part array).
 */
export function extractMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
}

/**
 * Stream tokens from a LangChain chat model when `.stream()` is available,
 * falling back to `.invoke()` (e.g. simple test mocks) and emitting `token` SSE events.
 */
export async function streamModelResponse({
  model,
  messages,
  emit,
  timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
}) {
  const runStream = async () => {
    if (typeof model?.stream === 'function') {
      let fullText = '';
      const stream = await model.stream(messages);
      for await (const chunk of stream) {
        const text = extractMessageText(chunk?.content ?? chunk);
        if (text) {
          fullText += text;
          emit?.('token', { text });
        }
      }
      if (fullText) {
        return fullText;
      }
    }

    const response = await model.invoke(messages);
    const fullText = extractMessageText(response?.content ?? response);
    if (fullText) {
      emit?.('token', { text: fullText });
    }
    return fullText;
  };

  return withTimeout(runStream(), timeoutMs, 'Gemini response stream');
}
