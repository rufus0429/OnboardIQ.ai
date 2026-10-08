/**
 * Centralized API Client for OnboardIQ
 * Handles authentication headers, standard envelope parsing, and error normalization.
 */

import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchApi(endpoint, options = {}) {
  let token = null;
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && auth.currentUser && !options._retry) {
    // Force token refresh
    token = await auth.currentUser.getIdToken(true);
    headers['Authorization'] = `Bearer ${token}`;
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      _retry: true
    });
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    // If not JSON (e.g. 500 HTML page)
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    return null;
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText;
    throw new Error(`API Error (${response.status}): ${errorMsg}`);
  }

  return data.data; // standard envelope unwrapping
}

export const api = {
  get: (endpoint) => fetchApi(endpoint, { method: 'GET' }),
  post: (endpoint, body) => fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) => fetchApi(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => fetchApi(endpoint, { method: 'DELETE' }),
};
