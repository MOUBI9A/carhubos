import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5406/api',
  withCredentials: true, // Send HttpOnly cookie on every request
  timeout: 15000,
});

// Public routes that must never be hijacked by the 401 redirect — a logged-out
// visitor is EXPECTED on these pages (the marketing site, auth screens). The root
// "/" runs its own role-based redirect, so leave it alone too.
const PUBLIC_PREFIXES = ['/landing', '/login', '/signup', '/verify-email', '/onboarding'];
function isPublicPath(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

// ── Response interceptor ──────────────────────────────────────────────────────
// Redirect to /login on 401, /verify-email on unverified 403, and /onboarding on incomplete 403.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const status = error?.response?.status;
      const code = error?.response?.data?.code;

      if (status === 401) {
        if (!isPublicPath(pathname)) {
          window.location.href = '/login';
        }
      } else if (status === 403) {
        if (code === 'EMAIL_VERIFICATION_REQUIRED' && !pathname.startsWith('/verify-email')) {
          window.location.href = '/verify-email';
        } else if (code === 'ONBOARDING_INCOMPLETE' && !pathname.startsWith('/onboarding')) {
          window.location.href = '/onboarding';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
