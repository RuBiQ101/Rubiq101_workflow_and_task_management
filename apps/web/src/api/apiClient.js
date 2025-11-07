// src/api/apiClient.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  // Simple: token stored in localStorage after login
  return localStorage.getItem('token');
}

async function request(path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  headers.set('Accept', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (opts.body && !(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.message || 'Request failed');
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  } else {
    if (!res.ok) throw new Error('Request failed');
    return res.text();
  }
}

// convenience helpers
export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
