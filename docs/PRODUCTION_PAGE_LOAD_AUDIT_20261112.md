# CarHub OS production page-load audit — 2026-11-12

User reported: “This page couldn’t load — Reload to try again, or go back.” on www.carhub.codes/dashboard.

## Confirmed root cause — updated after the user's JavaScript stack trace

The user provided: \`Uncaught TypeError: Cannot read properties of undefined (reading 'toLocaleString')\` at the live chunk \`3mok_j0xqtmf7.js:1:16177\`.

I downloaded the **actual live production JavaScript chunk** from www.carhub.codes and matched the exact failing offset to the expression \`r.forecast30DaysMad.toLocaleString(...)\` (expression starts at character 16158). Source: \`frontend/src/app/(owner)/dashboard/components/AutomotiveOperationalPulse.tsx\`, the Automotive Workshop & Fleet Pulse component loaded by \`/dashboard\`.

The backend's \`GET /api/maintenance/predictive-overview\` actually returns \`projected30DayCostMad\`, \`totalVehicles\`, \`criticalCount\`, and \`attentionCount\` from \`PredictiveMaintenanceService.getFleetPredictiveOverview\`. The frontend previously expected **nonexistent** \`forecast30DaysMad\`, \`totalAssets\`, \`overdueAssets\`, and \`dueSoonAssets\`. The first undefined was immediately formatted, throwing during React rendering and crashing the entire dashboard.

**Fix:** align frontend types, UI labels, and currency formatting with the backend's actual response. Runtime-validate the forecast JSON so a malformed/stale 200 response omits that optional banner without crashing the command centre. The workshop metrics API returns the expected field names and does not need modification.

**Verification (updated):** the new three unit tests pass for the real backend response, a stale/malformed backend response, and zero-budget data. All **55 frontend unit tests** pass, TypeScript and scoped ESLint pass, and Next.js production build passes. A real local production-mode Chrome session rendered the command centre and the forecast banner with a mocked schema-correct response; the logged DOM showed \`13 fleet vehicles tracked • 2 critical • 5 need attention\`, \`12.345,50 MAD\`, and **zero JavaScript errors**. Chrome with a malformed response also showed no JavaScript exceptions, though the optional banner was omitted. Neither run used live customer accounts or modified production data.

**Status:** fix is in a review branch pending CI and safe deployment; the original bug is definitively mapped but not fixed on the live domain until release.

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
- The reported phrase matches the generic fallback shown for uncaught client-side exceptions in newer Next.js versions. Next.js documents that the actual client exception is visible in the browser console. This was true at initial audit time; the later user-provided console trace definitively identified the component and crash expression (see confirmed root cause above).

## Reproducible flaw and repair proposal

1. Agent sidebar had a link to /dashboard/work-orders, which is OWNER/MANAGER-only. Default AGENT does not have work_order.manage API permission. Remove this inaccessible link without loosening backend permissions. Owner and manager links remain available.
2. Add app-level and root-layout recoverable render-error boundaries with retry, safe home link, and sanitized user-facing message. This handles Next.js page render failures but does not prove the initial reported failure is resolved.
3. Add an error-boundary unit test and role-based navigation E2E assertions.

## Validation

On the base production branch, frontend Vitest 51/51 passed (12 files), TypeScript passed, scoped lint passed, and production frontend build passed.

No production merge/deployment was performed by the page-load audit. The exact error was later identified from the user's browser trace and repaired in a new commit; do not claim the production site is fixed before the hotfix is merged, deployed, and rechecked.

References: https://nextjs.org/docs/messages/client-side-exception-occurred ; https://nextjs.org/docs/app/getting-started/error-handling
