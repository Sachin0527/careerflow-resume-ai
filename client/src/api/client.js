import { API_BASE_URL, CLIENT_ID_STORAGE_KEY } from '../lib/constants.js';

export function getOrCreateClientId() {
  let existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (!existing) {
    existing =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, existing);
  }
  return existing;
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `Cannot reach the CareerFlow API (${API_BASE_URL}). Verify the backend server is running and retry.`
    );
  }

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        errorMessage = payload.error;
      }
      if (Array.isArray(payload?.details) && payload.details.length > 0) {
        errorMessage = payload.details.map((d) => `${d.path}: ${d.message}`).join('; ');
      }
    } catch {
      // Ignore JSON parse failure
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null;
  return response.json();
}
