import { API_BASE_URL } from '../lib/constants.js';
import { apiRequest } from './client.js';

export async function listConversations(clientId) {
  return apiRequest(`/conversations?clientId=${encodeURIComponent(clientId)}`);
}

export async function createConversation({ clientId, title }) {
  return apiRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({ clientId, ...(title ? { title } : {}) }),
  });
}

export async function getConversationDetail(conversationId) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}`);
}

export async function deleteConversation(conversationId) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
  });
}

export async function uploadResumeFile(conversationId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}/resume`, {
    method: 'POST',
    body: formData,
  });
}

export async function listVersions(conversationId) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}/versions`);
}

export async function undoVersion(conversationId) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}/undo`, {
    method: 'POST',
  });
}

export async function redoVersion(conversationId) {
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}/redo`, {
    method: 'POST',
  });
}

export async function restoreVersion(conversationId, versionId) {
  return apiRequest(
    `/conversations/${encodeURIComponent(conversationId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: 'POST' }
  );
}

export async function compareVersions(conversationId, fromVersionId, toVersionId) {
  const params = new URLSearchParams({ from: fromVersionId, to: toVersionId });
  return apiRequest(`/conversations/${encodeURIComponent(conversationId)}/compare?${params}`);
}

export function getExportUrl(conversationId, format = 'pdf', versionId = null) {
  const params = new URLSearchParams({ format });
  if (versionId) params.set('versionId', versionId);
  return `${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/export?${params}`;
}
