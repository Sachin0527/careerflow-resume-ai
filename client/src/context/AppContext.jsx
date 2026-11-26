import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { getOrCreateClientId } from '../api/client.js';
import * as api from '../api/conversationsApi.js';
import { streamChatMessage } from '../api/sseChat.js';
import { appReducer, initialAppState } from './appReducer.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const abortRef = useRef(null);

  const loadConversation = useCallback(async (conversationId) => {
    if (!conversationId) return;
    dispatch({ type: 'SELECT_CONVERSATION', payload: conversationId });
    try {
      const [detail, versionsRes] = await Promise.all([
        api.getConversationDetail(conversationId),
        api.listVersions(conversationId),
      ]);
      dispatch({
        type: 'LOAD_DETAIL_SUCCESS',
        payload: {
          ...detail,
          versions: versionsRes.versions || [],
        },
      });
    } catch (err) {
      dispatch({ type: 'LOAD_DETAIL_ERROR', payload: err.message });
    }
  }, []);

  const initializeWorkspace = useCallback(async () => {
    const clientId = getOrCreateClientId();
    dispatch({ type: 'SET_CLIENT_ID', payload: clientId });
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'LOAD_CONVERSATIONS_START' });
    try {
      const res = await api.listConversations(clientId);
      const list = res.conversations || [];
      dispatch({ type: 'LOAD_CONVERSATIONS_SUCCESS', payload: list });
      if (list.length > 0) {
        await loadConversation(list[0].id);
      } else {
        const created = await api.createConversation({ clientId });
        dispatch({ type: 'ADD_CONVERSATION', payload: created.conversation });
      }
    } catch (err) {
      dispatch({ type: 'LOAD_CONVERSATIONS_SUCCESS', payload: [] });
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [loadConversation]);

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  const handleCreateConversation = useCallback(async () => {
    if (!state.clientId) return;
    try {
      const res = await api.createConversation({ clientId: state.clientId });
      dispatch({ type: 'ADD_CONVERSATION', payload: res.conversation });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.clientId]);

  const handleDeleteConversation = useCallback(
    async (conversationId) => {
      try {
        await api.deleteConversation(conversationId);
        dispatch({ type: 'REMOVE_CONVERSATION', payload: conversationId });
        const nextList = state.conversations.filter((c) => c.id !== conversationId);
        if (state.activeConversationId === conversationId && nextList.length > 0) {
          await loadConversation(nextList[0].id);
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    },
    [state.conversations, state.activeConversationId, loadConversation]
  );

  const handleUploadResume = useCallback(
    async (file) => {
      if (!state.activeConversationId || !file) return;
      dispatch({ type: 'SET_UPLOADING_RESUME', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      try {
        const res = await api.uploadResumeFile(state.activeConversationId, file);
        const versionsRes = await api.listVersions(state.activeConversationId);
        dispatch({
          type: 'RESUME_UPLOADED',
          payload: {
            version: res.version,
            resume: res.resume,
            versions: versionsRes.versions || [res.version],
          },
        });
      } catch (err) {
        dispatch({ type: 'SET_UPLOADING_RESUME', payload: false });
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    },
    [state.activeConversationId]
  );

  const refreshDiffAndVersions = useCallback(async (conversationId, newVersionId) => {
    const versionsRes = await api.listVersions(conversationId);
    const versions = versionsRes.versions || [];
    let comparison = null;
    if (versions.length >= 2 && newVersionId) {
      const idx = versions.findIndex((v) => v.id === newVersionId);
      const prev = idx >= 0 && versions[idx + 1] ? versions[idx + 1] : versions[1];
      if (prev && prev.id !== newVersionId) {
        comparison = await api.compareVersions(conversationId, prev.id, newVersionId);
      }
    }
    return { versions, comparison };
  }, []);

  const handleSendMessage = useCallback(
    async (content) => {
      const trimmed = content.trim();
      if (!trimmed || !state.activeConversationId || state.isStreaming) return;

      const convId = state.activeConversationId;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'STREAM_START', payload: { content: trimmed } });

      let committedVersionId = null;
      let sawErrorEvent = false;

      try {
        await streamChatMessage({
          conversationId: convId,
          content: trimmed,
          signal: controller.signal,
          onEvent: (eventName, data) => {
            switch (eventName) {
              case 'status':
                dispatch({ type: 'STREAM_STATUS', payload: data });
                break;
              case 'route':
                dispatch({ type: 'STREAM_ROUTE', payload: data });
                break;
              case 'agent_start':
                dispatch({ type: 'STREAM_AGENT_START', payload: data });
                break;
              case 'agent_step':
                dispatch({ type: 'STREAM_AGENT_STEP', payload: data });
                break;
              case 'agent_end':
                dispatch({ type: 'STREAM_AGENT_END', payload: data });
                break;
              case 'token':
                dispatch({ type: 'STREAM_TOKEN', payload: data });
                break;
              case 'version':
                committedVersionId = data?.version?.id || committedVersionId;
                dispatch({
                  type: 'VERSION_UPDATED',
                  payload: {
                    version: data?.version,
                    resume: data?.resume,
                    canUndo: data?.canUndo,
                    canRedo: data?.canRedo,
                  },
                });
                break;
              case 'error':
                sawErrorEvent = true;
                dispatch({
                  type: 'STREAM_ERROR',
                  payload: data?.message || 'An error occurred while processing your request.',
                });
                break;
              case 'done':
                if (!sawErrorEvent) {
                  dispatch({ type: 'STREAM_DONE', payload: data });
                }
                break;
              default:
                break;
            }
          },
        });

        if (committedVersionId) {
          const { versions, comparison } = await refreshDiffAndVersions(convId, committedVersionId);
          dispatch({
            type: 'VERSION_UPDATED',
            payload: { versions, comparison },
          });
        } else {
          const versionsRes = await api.listVersions(convId);
          dispatch({ type: 'SET_VERSIONS', payload: versionsRes.versions || [] });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'STREAM_ERROR', payload: err.message });
        }
      }
    },
    [state.activeConversationId, state.isStreaming, refreshDiffAndVersions]
  );

  const handleUndo = useCallback(async () => {
    if (!state.activeConversationId || !state.canUndo) return;
    try {
      const res = await api.undoVersion(state.activeConversationId);
      const versionsRes = await api.listVersions(state.activeConversationId);
      dispatch({
        type: 'VERSION_UPDATED',
        payload: {
          version: res.version,
          resume: res.resume,
          canUndo: res.canUndo,
          canRedo: res.canRedo,
          versions: versionsRes.versions || [],
        },
      });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.activeConversationId, state.canUndo]);

  const handleRedo = useCallback(async () => {
    if (!state.activeConversationId || !state.canRedo) return;
    try {
      const res = await api.redoVersion(state.activeConversationId);
      const versionsRes = await api.listVersions(state.activeConversationId);
      dispatch({
        type: 'VERSION_UPDATED',
        payload: {
          version: res.version,
          resume: res.resume,
          canUndo: res.canUndo,
          canRedo: res.canRedo,
          versions: versionsRes.versions || [],
        },
      });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.activeConversationId, state.canRedo]);

  const handleRestoreVersion = useCallback(
    async (versionId) => {
      if (!state.activeConversationId || !versionId) return;
      try {
        const res = await api.restoreVersion(state.activeConversationId, versionId);
        const { versions, comparison } = await refreshDiffAndVersions(
          state.activeConversationId,
          res.version.id
        );
        dispatch({
          type: 'VERSION_UPDATED',
          payload: {
            version: res.version,
            resume: res.resume,
            canUndo: res.canUndo,
            canRedo: res.canRedo,
            versions,
            comparison,
          },
        });
        dispatch({ type: 'SET_RIGHT_TAB', payload: 'preview' });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    },
    [state.activeConversationId, refreshDiffAndVersions]
  );

  const handleCompareVersions = useCallback(
    async (fromId, toId) => {
      if (!state.activeConversationId || !fromId || !toId) return;
      try {
        const comparison = await api.compareVersions(state.activeConversationId, fromId, toId);
        dispatch({ type: 'SET_COMPARISON', payload: comparison });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    },
    [state.activeConversationId]
  );

  const value = {
    state,
    dispatch,
    retryConnection: initializeWorkspace,
    loadConversation,
    createConversation: handleCreateConversation,
    deleteConversation: handleDeleteConversation,
    uploadResume: handleUploadResume,
    sendMessage: handleSendMessage,
    undo: handleUndo,
    redo: handleRedo,
    restoreVersion: handleRestoreVersion,
    compareVersions: handleCompareVersions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
