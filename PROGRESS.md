# PROGRESS — CarHub / "Fider" market-readiness

> Living handoff for resuming the build. Source-of-truth docs: **`docs/AUDIT_BACKLOG.md`** (phased task list) + **`docs/PRODUCT_VISION.md`** (target product) + **`docs/DESIGN_VISION.md`** (target frontend/design, Phase 12) + **`CLAUDE.md`** (project guide). This file is the "where we are right now" snapshot.
> Last updated after commit `7e2bbf9` (Phase 5B **fully complete** — renter portal UI verified E2E + document vault view + self-contained consent demo). **Phase 5 (5A capability engine + 5B renter/consent) is DONE.** Next up: **Phase 11 — SaaS Business Layer** (see §1).
> **2026-07-18 addendum:** `docs/DESIGN_VISION.md` added — full audit of the current frontend (generic dark glass-morphism, one neon-purple accent, all-caps headings, zero real imagery anywhere in the product) + the target "lux/humanized" direction + a ready-to-send master prompt for the full frontend rebuild (**Phase 12**, added to `docs/AUDIT_BACKLOG.md`). Read it before starting Phase 12 work.

## The goal
Take this multi-tenant car-rental SaaS from demo → market-ready. B2B SaaS: the **founder** (ROOT_ADMIN) runs the platform; **agencies** (OWNER + staff) are paying subscribers; **renters** are end users. Three big architectural additions from the vision: (1) capability-based access, (2) SaaS business layer, (3) renter portal + consent/QR. Plus the hardening phases 0–10. Done = the **Market-Ready Checklist** at the bottom of the backlog.

## Founder decisions (locked)
- **VAT inclusive** (`taxAmount = total × 20/120`). · **Billing = manual invoicing** (no Stripe; founder activates/marks-paid in a founder console). · **Plans = free during beta** (build the entitlements/metering/gating engine; keep limits open + prices as editable config; a BETA plan grants everything). · **i18n = FR (default) + AR (RTL) + EN**. · **Trial = 14 days**. · **Deploy target = deferred to the Phase 9 gate**. · **Workflow = commit verified milestones directly to `main`** (no phase branches).

## Local run
```
docker compose up -d db                         # Postgres (root .env has DB_USER/PASSWORD/NAME)
cd backend && npx prisma migrate deploy
node -r dotenv/config prisma/seed.js            # base demo (WIPES); then:
node -r dotenv/config prisma/seed-roles.js      # idempotent: users, memberships, renter vault, (soon) plans/subs
npm run start:dev                               # http://localhost:5406/api
cd frontend && npm run dev                      # http://localhost:3002
```
Logins (password `admin123`): `root@ owner@ manager@ agent@ renter@` `carhub.os`. `tsc`: `cd backend && npx tsc --noEmit` (and same in `frontend`). Tests: `cd backend && npx jest` (17 tests, 3 suites).

## DONE (committed to `main`, each tsc+jest green, most verifier-checked)
- **Phase 0** security incident — secrets purged/rotated, git history scrubbed, repo private, register privilege-escalation + tenant-hijack closed.
- **Phase 1** correctness/authz — ThrottlerGuard + `@Throttle`, JWT fail-fast, trust role-gating + audit, payments/expenses cross-agency IDOR, invoice reconciliation, double-booking txn guard, HMAC identity hash.
- **Phase 2** data foundation — SQLite→**Postgres** (`e5f3474`-lineage), money **Float→Decimal(12,2)** + `DecimalToNumberInterceptor` (API returns numbers), Task.agencyId, Agency soft-delete + trust-graph Cascade→SetNull, recompute() txn.
- **Landing + rebrand to "Fider"** (`3f0bdb5`, `3955d87`) — honest hero/features, interactive `TrustConsole` demo, `#solutions`/`#enterprise`, real contact section (WhatsApp `+212616880653` / `hamzamoadin37@gmail.com`), working `/signup`. **`frontend/src/lib/api.ts`** 401 interceptor exempts public routes (`/`, `/landing`, `/login`, `/signup`) — was bouncing the landing to login.
- **Phase 7 partial** — mobile hamburger nav (`Sidebar.tsx` off-canvas + `DashboardLayout.tsx` + public `PublicNav.tsx`), Modal a11y (`ui/Modal.tsx`: focus trap/Escape/ARIA/restore), booking date inputs reject past dates.
- **Phase 3 partial** — inclusive VAT (`bookings.service.ts` taxAmount).
- **Phase 5A CAPABILITY ENGINE — COMPLETE** (`73631df`,`e7bc279`,`7fe1ddb`), verified E2E:
  - `backend/src/common/capabilities.ts` — `AGENCY_CAPABILITIES`(21), `PLATFORM_CAPABILITIES`(7), `ROLE_PRESETS` (OWNER=21/MANAGER=19/AGENT=14), `STAFF_PRESETS`.
  - `AgencyMembership` model (userId+agencyId+capabilities[]+rolePreset). `prisma/capability-presets.js` mirror for seeds.
  - `common/guards/capabilities.guard.ts` + `common/decorators/require-capabilities.decorator.ts` — tenant-scoped (membership keyed on JWT userId+agencyId), ROOT_ADMIN bypass, fail-closed. Wired to bookings/payments/expenses/cars/customers controllers.
  - `backend/src/agency-staff/` — GET/POST `/agency/staff`, PATCH `:id/capabilities`, DELETE `:id` (staff.manage-gated, anti-escalation).
  - `frontend/src/app/(owner)/dashboard/staff/` — owner Staff & Access UI. (Verifier caught + we fixed: membership-lockout in register/seed, create() escalation, P2003 delete, last-staff.manage guard.)
- **Phase 5B CONSENT/RENTER — BACKEND COMPLETE** (`e5f3474`,`0a742a0`), invariant verified:
  - Schema: `User.renterIdentityId`, `Customer.userId`, `ConsentGrant` (grantor/agency/scope[]/status PENDING→APPROVED→REVOKED|EXPIRED/expiresAt), `Notification`, and **`RenterDocument`** global renter-owned vault (migration `20260718050242_renter_document_vault`).
  - `backend/src/consent/consent.service.ts` — **invariant enforcement ≈ L134-155**: an agency reads a renter's vault docs ONLY via an active (APPROVED, not revoked, not expired), in-scope, same-agency grant; else 403. `@Cron` expiry sweep.
  - `backend/src/portal/` — RENTER self-scoped: GET `/portal/me` (profile+trust), `/portal/bookings`, `/portal/notifications` (+`:id/read`), GET `/portal/consent`, POST `/portal/consent/:id/approve|revoke`. `guards/renter.guard.ts`.
  - `POST /agency/consent/request`, `GET /agency/consent/documents/:renterUserId` (customer.view). Verifier FAIL (consent read the agency's OWN customer docs = decorative gate) → FIXED with the distinct global vault + capability-gated `customers.controller.ts`. Seed gives `renter@carhub.os` a RenterIdentity + 2 vault docs.

## LEFT TO DO (in order)

### 0. ✅ DONE — Phase 5B renter portal UI (commit `7e2bbf9`, verified E2E)
Renter portal fully wired + verified in-browser as `renter@carhub.os`:
- `GET /portal/documents` added (self-scoped renter view of own `RenterDocument` vault) + "My Documents" card on the portal.
- Renter `qrHash` provisioned in seed (`FDR-VAULT-SAMI-8F2A4C7E`); seed now also creates a PENDING consent request + notification so the portal opens with something to review.
- Consent approve (PENDING→ACTIVE) + revoke (ACTIVE→REVOKED) verified in the UI; the invariant holds E2E — agency vault read 403→200 (in-scope only)→403; non-renter 403 on portal. QR badge modal works. No console errors; tsc green, jest 17/17.
- (Optional later polish: renter document *upload* needs file storage — deferred to Phase 9 infra; booking auto-link + signed portal-claim invite deferred.)

### 1. Phase 11 — SaaS Business Layer (NOT STARTED; manual billing per founder)
Spec in `docs/AUDIT_BACKLOG.md` "PHASE 11". Order: (a) **schema** `Plan`/`Subscription`/`PlatformInvoice` + seed a BETA plan (unlimited/free) + `STARTER/PRO/BUSINESS` rows (limits: STARTER 15 cars/2 staff/150 bkg~299 MAD; PRO 50/8/1000~799; BUSINESS unlimited~1999 — config only during beta) + backfill each agency an ACTIVE BETA `Subscription` (trialEndsAt = now+14d); (b) **`EntitlementsService`** the app checks (limits + feature flags) + a plan gate; (c) usage metering + limit enforcement + upgrade prompts; (d) tenant lifecycle/dunning (TRIAL→ACTIVE→PAST_DUE→SUSPENDED→CANCELED; suspend guard); (e) **founder metrics** dashboard (MRR, active tenants, trials, conversion, churn, plan mix); (f) **support/impersonation** — wire the existing `ForensicService` (audited); (g) manual founder console to activate/mark-paid subscriptions + issue `PlatformInvoice`.

### 2. Phase 3 rest — financial lifecycle
Security **deposits** (capture at contract → HELD at hand-over → RETURNED/refund → CLAIMED + damage charge). Wire owner Finance UI to `/payments/pending` + verify (backlog says backend exists). Partial payments / refunds (`POST /payments`). Leave-a-review prompt on completion.

### 3. Phase 4 — rental lifecycle
Return/damage flow (require POST_RENTAL inspection, diff vs PRE_RENTAL, auto-charge). Contract e-sign (guard `contracts.controller.ts`, real signature-capture, gate ACTIVE on SIGNED). Overdue → OVERDUE state + late fees (fix `automations.service.ts` cron spam). Rate tiers/seasonality/extras.

### 4. Phase 6 — performance
Bookings list server-side pagination (`bookings.service.ts` loads all + filters in memory). Analytics **SQL aggregates** not JS sums (`analytics.service.ts`) — the **command-centre endpoint is slow** (loads ALL payments unbounded); this is why the owner dashboard hangs on skeletons after a backend restart. `trust.assess()` stop recompute-on-read. Indexes (Payment `(invoiceId,status)`+date, Booking dates). `startsWith` search.

### 5. Phase 7 rest — UX/a11y/i18n
**i18n FR default + AR/RTL + EN** (next-intl; externalize strings; `lang`/`dir`; Intl dates/currency) — biggest remaining UX item. Contrast floor (no functional text < white/60 or 11px). Dead buttons firing fake success toasts (admin/finance/accidents/vault) — disable or wire. Chart tap/focus + SR table. Login page false **"AES-256 JWT ENCRYPTION"** claim — remove (still on `/login`).

### 6. Phase 8 — tests + CI
Backend unit tests on money/trust/auth/**capability guard**/**consent** (some exist: `consent.service.spec.ts`, `trust.identity.spec.ts`). Multi-tenant authz E2E (agency A → 403/404 on agency B). Re-enable ESLint (`react-hooks/rules-of-hooks`, `no-floating-promises`) as errors. **GitHub Actions CI** (both `tsc`, `jest`, lint, Playwright) blocking on PR.

### 7. Phase 9 — deploy (HUMAN GATE)
Migrate-on-deploy, managed Postgres + volume + backups, PDF engine runtime (Puppeteer won't run serverless; HTML-escape inputs), one deploy target + build-time `NEXT_PUBLIC_API_URL`, error tracking/healthchecks. **PAUSE for founder**: deploy target/host + production go-live approval. (GitHub Student Pack hosting/domain perks are intended for here.)

### 8. Phase 10 — final pass
`/security-review` + `/code-review` on the full diff; re-run the 8-dimension audit; close/deferring every remaining C/H.

### 9. Phase 12 — Design & Frontend Rebuild (NOT STARTED; full brief in `docs/DESIGN_VISION.md`)
Presentation-layer-only rebuild of the entire frontend (public site + owner/agent/admin/renter portals) replacing the current generic dark glass-morphism/neon-purple/all-caps look with a warm, premium, photographic "lux/humanized" system. Sequence: design tokens + component kit → public marketing site → owner dashboard (18 sections) → agent/admin/renter portals. No backend/schema/business-logic changes. See `docs/AUDIT_BACKLOG.md` PHASE 12 for the checklist and `docs/DESIGN_VISION.md` for the audit + the copy-paste master prompt.

## Open questions / mid-debugging
- **Renter portal WIP** (§0) unverified — died at browser login. Verify + commit; add `GET /portal/documents` + provision renter `qrHash`.
- **SaaS schema worker (§1) made no changes** — start Phase 11 fresh.
- **Dashboard command-centre is slow** (§4) — not a bug, but the owner dashboard shows skeletons for a while / hangs while the backend dev-server restarts (watch mode) during concurrent backend edits.
- **Account session limit resets 8am Africa/Casablanca** — background subagents unavailable until then; the supervisor can still work solo within limits.
- Scope-vocab: `RenterDocument.type` + consent scope use granular types (`CIN_FRONT/CIN_BACK/DRIVING_LICENSE/PASSPORT`).

## Worker fleet note
Custom `.claude/agents/*` types are NOT dispatchable in this environment — dispatch `general-purpose` with a pinned `model` (opus for security/db/verify, sonnet for build). Run the adversarial **verifier on every change before commit** — it has caught two product-bricking defects so far (5A membership lockout, 5B decorative consent gate).
