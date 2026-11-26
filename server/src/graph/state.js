import { Annotation } from '@langchain/langgraph';

const replace = (_prev, next) => next;

/**
 * LangGraph StateGraph schema for the conversational resume optimization pipeline.
 */
export const ResumeGraphState = Annotation.Root({
  conversationId: Annotation({ reducer: replace, default: () => '' }),
  userMessage: Annotation({ reducer: replace, default: () => '' }),
  currentMessageId: Annotation({ reducer: replace, default: () => null }),

  conversation: Annotation({ reducer: replace, default: () => null }),
  history: Annotation({ reducer: replace, default: () => [] }),
  summary: Annotation({ reducer: replace, default: () => '' }),

  resume: Annotation({ reducer: replace, default: () => null }),
  initialResume: Annotation({ reducer: replace, default: () => null }),
  currentVersionId: Annotation({ reducer: replace, default: () => null }),
  indexedVersionId: Annotation({ reducer: replace, default: () => null }),

  activeJd: Annotation({ reducer: replace, default: () => null }),
  activeCompany: Annotation({ reducer: replace, default: () => null }),

  intents: Annotation({ reducer: replace, default: () => [] }),
  plan: Annotation({ reducer: replace, default: () => [] }),
  entities: Annotation({
    reducer: replace,
    default: () => ({
      company: null,
      targetRole: null,
      language: null,
      locale: null,
      sections: [],
      jdText: null,
    }),
  }),
  needsClarification: Annotation({ reducer: replace, default: () => false }),
  pendingClarification: Annotation({ reducer: replace, default: () => null }),

  stepResults: Annotation({ reducer: replace, default: () => [] }),
  changes: Annotation({ reducer: replace, default: () => [] }),
  agentTrace: Annotation({ reducer: replace, default: () => [] }),

  committedVersion: Annotation({ reducer: replace, default: () => null }),
  versionActionResult: Annotation({ reducer: replace, default: () => null }),
  qaResponse: Annotation({ reducer: replace, default: () => '' }),
  finalResponse: Annotation({ reducer: replace, default: () => '' }),

  emit: Annotation({ reducer: replace, default: () => () => {} }),
  deps: Annotation({ reducer: replace, default: () => ({}) }),
});
