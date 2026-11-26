import * as conversationService from '../../services/conversation.js';

/**
 * LangGraph loadContext node:
 * Fetches conversation metadata, rolling summary, last 8 messages, current resume version,
 * and stored JD/company context without loading the full chat history into prompts.
 */
export async function loadContextNode(state) {
  state.emit?.('status', {
    phase: 'loading_context',
    message: 'Loading conversation context and active resume version...',
  });

  const deps = state.deps || {};
  const convService = deps.conversationService || conversationService;
  const firestore = deps.firestore;

  const detail = await convService.getConversationDetail(state.conversationId, firestore);
  const conv = detail.conversation || {};

  const priorMessages = (detail.messages || []).filter(
    (msg) => !state.currentMessageId || msg.id !== state.currentMessageId
  );
  const recentMessages = priorMessages.slice(-8);

  return {
    conversation: conv,
    summary: conv.summary || '',
    history: recentMessages,
    resume: detail.currentResume || null,
    initialResume: detail.currentResume ? structuredClone(detail.currentResume) : null,
    currentVersionId: conv.currentVersionId || null,
    indexedVersionId: conv.indexedVersionId || null,
    activeJd: conv.activeJd || null,
    activeCompany: conv.activeCompany || null,
  };
}
