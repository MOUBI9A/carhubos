import axios from 'axios';

// In local development the Nest API listens on :5406. In Vercel Services,
// vercel.json exposes the backend service under /_/backend/*, so browser calls
// must stay same-origin and include the Nest global /api prefix. An explicit
// NEXT_PUBLIC_API_URL still wins for other deployment targets.
const defaultApiUrl =
  process.env.NODE_ENV === 'production' ? '/_/backend/api' : 'http://localhost:5406/api';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultApiUrl,
  withCredentials: true, // Send HttpOnly cookie on every request
  timeout: 15000,
});

// Public routes that must never be hijacked by the 401 redirect — a logged-out
// visitor is EXPECTED on these pages (the marketing site, auth screens). The root
// "/" runs its own role-based redirect, so leave it alone too.
const PUBLIC_PREFIXES = ['/landing', '/login', '/signup'];
function isPublicPath(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

// ── Response interceptor ──────────────────────────────────────────────────────
// Redirect to /login on 401 so every protected page is covered without per-call
// handling — but never bounce a public/marketing route.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
