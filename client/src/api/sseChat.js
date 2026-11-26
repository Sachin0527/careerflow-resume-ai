import { API_BASE_URL } from '../lib/constants.js';

/**
 * Stream SSE chat events from POST /api/conversations/:id/messages using fetch + ReadableStream.
 */
export async function streamChatMessage({ conversationId, content, signal, onEvent }) {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ content }),
      signal,
    }
  );

  if (!response.ok) {
    let message = `Failed to send message (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // Ignore parse error
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('Streaming response body unavailable in this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const dispatchBlock = (block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    let eventName = 'message';
    const dataLines = [];
    for (const line of trimmed.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) return;
    const rawData = dataLines.join('\n');
    try {
      onEvent?.(eventName, JSON.parse(rawData));
    } catch {
      onEvent?.(eventName, { text: rawData });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';
    for (const part of parts) {
      dispatchBlock(part);
    }
  }

  if (buffer.trim()) {
    dispatchBlock(buffer);
  }
}
