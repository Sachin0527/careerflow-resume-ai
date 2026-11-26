/**
 * LangGraph clarify node:
 * Emits a clarifying status and carries pendingClarification to respond without mutating the resume.
 */
export async function clarifyNode(state) {
  state.emit?.('status', {
    phase: 'clarifying',
    message: 'Request needs clarification before editing your resume...',
  });

  const question =
    state.pendingClarification ||
    'Could you share a bit more detail so I can help with your resume?';

  return {
    pendingClarification: question,
  };
}
