import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createChatModel } from '../../config/llm.js';
import { env } from '../../config/env.js';
import { QA_SYSTEM_PROMPT } from '../../prompts/router.js';
import * as versioningService from '../../services/versioning.js';
import { streamModelResponse } from '../../utils/streamLlm.js';

/**
 * LangGraph qa node:
 * Answers questions about the resume, match gaps, or past versions without modifying the resume.
 */
export async function qaNode(state) {
  state.emit?.('status', {
    phase: 'answering',
    message: 'Answering based on your current resume and version history...',
  });

  const deps = state.deps || {};
  const fastModel = deps.fastModel || createChatModel(env.GEMINI_FAST_MODEL, 0);
  const verService = deps.versioningService || versioningService;

  let versions = [];
  try {
    if (state.conversationId) {
      versions = (await verService.list(state.conversationId, deps.firestore)).slice(0, 10);
    }
  } catch {
    versions = [];
  }

  const userPrompt = JSON.stringify(
    {
      userMessage: state.userMessage,
      rollingSummary: state.summary || '',
      recentMessages: (state.history || []).map((m) => ({
        role: m.role,
        content: String(m.content || '').slice(0, 800),
      })),
      activeCompany: state.activeCompany,
      activeJdPreview: state.activeJd ? state.activeJd.slice(0, 800) : null,
      versions,
      currentResume: state.resume,
    },
    null,
    2
  );

  const qaResponse = await streamModelResponse({
    model: fastModel,
    messages: [new SystemMessage(QA_SYSTEM_PROMPT), new HumanMessage(userPrompt)],
    emit: state.emit,
  });

  return {
    qaResponse: qaResponse || 'I checked your resume, but could not generate an answer. Please try rephrasing.',
  };
}
