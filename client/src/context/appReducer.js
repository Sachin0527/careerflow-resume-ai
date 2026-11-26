export const initialAppState = {
  clientId: '',
  conversations: [],
  loadingConversations: true,
  activeConversationId: null,
  activeConversation: null,
  loadingDetail: false,
  messages: [],
  currentResume: null,
  currentVersion: null,
  versions: [],
  canUndo: false,
  canRedo: false,
  uploadingResume: false,
  isStreaming: false,
  streamStatus: null,
  activeStream: null,
  lastComparison: null,
  rightTab: 'preview',
  error: null,
};

export function appReducer(state, action) {
  switch (action.type) {
    case 'SET_CLIENT_ID':
      return { ...state, clientId: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOAD_CONVERSATIONS_START':
      return { ...state, loadingConversations: true };
    case 'LOAD_CONVERSATIONS_SUCCESS':
      return { ...state, loadingConversations: false, conversations: action.payload };
    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        activeConversationId: action.payload.id,
        activeConversation: action.payload,
        messages: [],
        currentResume: null,
        currentVersion: null,
        versions: [],
        canUndo: false,
        canRedo: false,
        lastComparison: null,
        rightTab: 'preview',
      };
    case 'REMOVE_CONVERSATION': {
      const remaining = state.conversations.filter((c) => c.id !== action.payload);
      const nextActiveId =
        state.activeConversationId === action.payload ? remaining[0]?.id || null : state.activeConversationId;
      return {
        ...state,
        conversations: remaining,
        activeConversationId: nextActiveId,
        ...(state.activeConversationId === action.payload
          ? {
              activeConversation: null,
              messages: [],
              currentResume: null,
              currentVersion: null,
              versions: [],
              canUndo: false,
              canRedo: false,
              lastComparison: null,
            }
          : {}),
      };
    }
    case 'SELECT_CONVERSATION':
      return {
        ...state,
        activeConversationId: action.payload,
        loadingDetail: Boolean(action.payload),
        lastComparison: null,
        error: null,
      };
    case 'LOAD_DETAIL_SUCCESS': {
      const { conversation, messages, currentResume, currentVersion, canUndo, canRedo, versions } =
        action.payload;
      return {
        ...state,
        loadingDetail: false,
        activeConversation: conversation,
        messages: messages || [],
        currentResume: currentResume || null,
        currentVersion: currentVersion || null,
        canUndo: Boolean(canUndo),
        canRedo: Boolean(canRedo),
        versions: versions || [],
        conversations: state.conversations.map((c) =>
          c.id === conversation.id ? { ...c, ...conversation } : c
        ),
      };
    }
    case 'LOAD_DETAIL_ERROR':
      return { ...state, loadingDetail: false, error: action.payload };
    case 'SET_UPLOADING_RESUME':
      return { ...state, uploadingResume: action.payload };
    case 'RESUME_UPLOADED': {
      const { version, resume, versions } = action.payload;
      const updatedTitle =
        resume?.basics?.name && state.activeConversation?.title === 'New Resume Session'
          ? `${resume.basics.name} — Resume`
          : state.activeConversation?.title;
      return {
        ...state,
        uploadingResume: false,
        currentResume: resume,
        currentVersion: version,
        versions: versions || [version],
        canUndo: Boolean(version.canUndo),
        canRedo: Boolean(version.canRedo),
        activeConversation: state.activeConversation
          ? { ...state.activeConversation, title: updatedTitle, currentVersionId: version.id }
          : null,
        conversations: state.conversations.map((c) =>
          c.id === state.activeConversationId ? { ...c, title: updatedTitle } : c
        ),
      };
    }
    case 'STREAM_START':
      return {
        ...state,
        isStreaming: true,
        error: null,
        messages: [
          ...state.messages,
          { id: `temp-user-${Date.now()}`, role: 'user', content: action.payload.content },
        ],
        streamStatus: 'Thinking...',
        activeStream: {
          plan: [],
          steps: [],
          tokens: '',
          matchExtras: null,
        },
      };
    case 'STREAM_STATUS':
      return { ...state, streamStatus: action.payload?.message || 'Working...' };
    case 'STREAM_ROUTE':
      return {
        ...state,
        activeStream: state.activeStream
          ? {
              ...state.activeStream,
              plan: action.payload?.plan || [],
              steps: (action.payload?.plan || []).map((step, index) => ({
                agent: step.agent,
                stepIndex: index,
                status: 'pending',
                subSteps: [],
                reasoning: [],
                durationMs: null,
                extras: null,
              })),
            }
          : null,
      };
    case 'STREAM_AGENT_START': {
      if (!state.activeStream) return state;
      const { agent, stepIndex } = action.payload;
      const steps = [...state.activeStream.steps];
      if (steps[stepIndex]) {
        steps[stepIndex] = { ...steps[stepIndex], status: 'running' };
      } else {
        steps.push({
          agent,
          stepIndex,
          status: 'running',
          subSteps: [],
          reasoning: [],
          durationMs: null,
          extras: null,
        });
      }
      return { ...state, activeStream: { ...state.activeStream, steps } };
    }
    case 'STREAM_AGENT_STEP': {
      if (!state.activeStream) return state;
      const { stepIndex, message } = action.payload;
      const steps = state.activeStream.steps.map((s) =>
        s.stepIndex === stepIndex ? { ...s, subSteps: [...s.subSteps, message] } : s
      );
      return { ...state, activeStream: { ...state.activeStream, steps } };
    }
    case 'STREAM_AGENT_END': {
      if (!state.activeStream) return state;
      const { stepIndex, status, durationMs, reasoning, extras } = action.payload;
      const steps = state.activeStream.steps.map((s) =>
        s.stepIndex === stepIndex
          ? {
              ...s,
              status: status || 'completed',
              durationMs: durationMs ?? s.durationMs,
              reasoning: reasoning || s.reasoning,
              extras: extras || s.extras,
            }
          : s
      );
      const matchExtras =
        typeof extras?.matchScore === 'number' ? extras : state.activeStream.matchExtras;
      return { ...state, activeStream: { ...state.activeStream, steps, matchExtras } };
    }
    case 'STREAM_TOKEN':
      return {
        ...state,
        activeStream: state.activeStream
          ? { ...state.activeStream, tokens: state.activeStream.tokens + (action.payload?.text || '') }
          : null,
      };
    case 'VERSION_UPDATED': {
      const { version, resume, canUndo, canRedo, versions, comparison } = action.payload;
      return {
        ...state,
        currentResume: resume ?? state.currentResume,
        currentVersion: version ?? state.currentVersion,
        canUndo: canUndo ?? state.canUndo,
        canRedo: canRedo ?? state.canRedo,
        ...(versions ? { versions } : {}),
        ...(comparison !== undefined ? { lastComparison: comparison } : {}),
      };
    }
    case 'STREAM_DONE': {
      const {
        messageId,
        content,
        agentTrace,
        versionId,
        currentVersion,
        canUndo,
        canRedo,
        versions,
      } = action.payload;
      const matchExtras = state.activeStream?.matchExtras || null;
      const assistantMsg = {
        id: messageId || `assistant-${Date.now()}`,
        role: 'assistant',
        content: content || state.activeStream?.tokens || '',
        agentTrace: agentTrace || [],
        versionId: versionId || null,
        matchExtras,
      };
      return {
        ...state,
        isStreaming: false,
        streamStatus: null,
        activeStream: null,
        messages: [...state.messages, assistantMsg],
        currentVersion: currentVersion ?? state.currentVersion,
        canUndo: canUndo ?? state.canUndo,
        canRedo: canRedo ?? state.canRedo,
        ...(versions ? { versions } : {}),
      };
    }
    case 'STREAM_ERROR':
      return {
        ...state,
        isStreaming: false,
        streamStatus: null,
        activeStream: null,
        messages: [
          ...state.messages,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            isError: true,
            content: action.payload || 'Something went wrong while processing your message.',
          },
        ],
      };
    case 'SET_VERSIONS':
      return { ...state, versions: action.payload };
    case 'SET_COMPARISON':
      return {
        ...state,
        lastComparison: action.payload,
        rightTab: 'changes',
      };
    case 'SET_RIGHT_TAB':
      return { ...state, rightTab: action.payload };
    default:
      return state;
  }
}
