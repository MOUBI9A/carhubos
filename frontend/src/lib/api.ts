import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5406/api',
  withCredentials: true, // Send HttpOnly cookie on every request
  timeout: 15000,
});

// ── Response interceptor ──────────────────────────────────────────────────────
// Redirect to /login on 401 so every page is covered without per-call handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Only redirect in a browser context and avoid redirect loops on the login page
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
