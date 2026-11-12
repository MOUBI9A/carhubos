# CarHub OS production page-load audit — 2026-11-12

User reported: “This page couldn’t load — Reload to try again, or go back.” on www.carhub.codes/dashboard.

## Scope and limitations

Audited live Vercel production main f950d923, the repository, and read-only account data. The user's signed-in in-app browser tab was not accessible to the testing connection; browser and Opera connectors were unavailable. No cookies, authentication secrets, or live account passwords were extracted. No production database or site configuration was modified.

## Individual live page requests: all 42 returned HTTP 200 with HTML

Public/auth: /, /landing, /login, /signup, /verify-email, /onboarding, /privacy, /support, /terms (9/9).
Owner/manager: /dashboard, /dashboard/guardian, /dashboard/erp, /dashboard/reports, /dashboard/fleet, /dashboard/fleet/200a6c27-e99b-4fdd-ab47-a3652ede96a2, /dashboard/bookings, /dashboard/customers, /dashboard/vault, /dashboard/vault-files, /dashboard/hub, /dashboard/accidents, /dashboard/finance, /dashboard/waitlist, /dashboard/blacklist, /dashboard/search, /dashboard/staff, /dashboard/billing, /dashboard/diagnostics, /dashboard/work-orders, /dashboard/settings (21/21).
Agent: /agent, /agent/guardian, /agent/tasks, /agent/inspections, /agent/diagnostics (5/5).
Administrator: /admin, /admin/pulse, /admin/agencies (3/3).
Renter: /portal, /portal/inspections, /portal/book, /portal/history (4/4).

**Important:** Anonymous HTTP 200 does not prove that authenticated client rendering and functionality work.

## Runtime and browser evidence

- Chromium headless with installed Google Chrome checked 18 public/protected URLs without an authenticated session. Public routes rendered without uncaught client JS exceptions; protected routes navigated to /login. Some requests were canceled during redirects but a sampled JS bundle, hero image and favicon all returned HTTP 200 on independent fetch.
- Vercel logs showed HTTP 200 on /api/auth/me after successful login, /api/analytics/command-centre, /api/cars, /api/maintenance/predictive-overview and /api/work-orders/metrics/summary. One /api/auth/me HTTP 401 preceded a successful login and was an expected unauthenticated request. Historical container crashes were on an older deployment, not the current production deployment.
- All 11 existing test accounts are verified. Owner/manager/agent accounts have active agency memberships and completed agency onboarding; renter/root admin appropriately have no agency.
- The reported phrase matches the generic fallback shown for uncaught client-side exceptions in newer Next.js versions. Next.js documents that the actual client exception is visible in the browser console. The specific exception and page component remain unconfirmed because the authenticated browser console was inaccessible.

## Reproducible flaw and repair proposal

1. Agent sidebar had a link to /dashboard/work-orders, which is OWNER/MANAGER-only. Default AGENT does not have work_order.manage API permission. Remove this inaccessible link without loosening backend permissions. Owner and manager links remain available.
2. Add app-level and root-layout recoverable render-error boundaries with retry, safe home link, and sanitized user-facing message. This handles Next.js page render failures but does not prove the initial reported failure is resolved.
3. Add an error-boundary unit test and role-based navigation E2E assertions.

## Validation

On the base production branch, frontend Vitest 51/51 passed (12 files), TypeScript passed, scoped lint passed, and production frontend build passed.

No production merge/deployment performed. Do not claim an authenticated production end-to-end page audit or resolved initial browser error until tested with the actual signed-in browser.

References: https://nextjs.org/docs/messages/client-side-exception-occurred ; https://nextjs.org/docs/app/getting-started/error-handling
