import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  withCredentials: true,
});

// ── Request interceptor — attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('halaqa_token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────
// proxy.js translates all QF 401s (permission errors) → 403 before they
// reach the frontend. So any 401 here is a genuine session expiry from our
// own backend — safe to logout unconditionally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('halaqa_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;