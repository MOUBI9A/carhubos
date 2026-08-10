# CLAUDE.md — Fider

Multi-tenant SaaS ERP for car-rental agencies, localized for **Morocco** (currency **MAD**, **20% VAT**).
**Public brand = "Fider"** (tagline *"the trust layer for mobility"*) — rebranded from "Infinity"/"CarHub" across the frontend (nav, footer, login, `/signup`, metadata). The repo dir is still `carhubos`; internal-only CSS class names (`.btn-infinity`) are unchanged.
Being taken from demo → market-ready. **This file + [docs/AUDIT_BACKLOG.md](docs/AUDIT_BACKLOG.md) + [docs/DESIGN_VISION.md](docs/DESIGN_VISION.md) are the source of truth.** Older docs (`docs/README.md`, `docs/PRODUCTION_READINESS_REPORT.md`, the dossiers) are historical and may be stale — trust these three. **Keep this file current at the end of every phase.**

**Public surface:** `/landing` (marketing — hero, features, `#solutions` with an interactive client-side **Trust Console** demo, `#enterprise`, honest capability tiles, `#contact` with WhatsApp `+212616880653` + email `hamzamoadin37@gmail.com`), `/login`, `/signup` (agency onboarding → `POST /auth/register` creates OWNER + agency → auto-login). Note: `lib/api.ts`'s 401 interceptor exempts public routes (`/landing`,`/login`,`/signup`,`/`) so logged-out visitors aren't bounced.

---

## 1. Stack

| Layer | Tech | Notes |
|---|---|---|
| Backend | **NestJS** + Prisma | port **5406**, global prefix **`/api`**, entry `backend/src/main.ts` |
| Frontend | **Next.js 16** + React + Tailwind | port **3002** |
| Database | **PostgreSQL 15** | local dev via Docker (`docker compose up -d db`); prod host TBD (Phase 9) |
| Auth | JWT in HttpOnly cookie `infinity_token` | `AuthGuard` + `RolesGuard`; global `ThrottlerGuard` |
| Validation | `class-validator` DTOs | global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`) |
| Tests | Jest | `cd backend && npx jest` |

**MCP tools available in this project** (2026-07-18): `.mcp.json` connects Claude Code to the Docker MCP Toolkit gateway (`MCP_DOCKER`, `dev_workflow` profile) — GitHub (repos/files/issues/PRs/search) and Atlassian (Jira/Confluence) tools, both OAuth-authorized (`docker mcp oauth ls` → `authorized`; GitHub account `MOUBI9A`). Use them when a task actually calls for it (checking/filing a GitHub issue, opening a PR, a Jira ticket, searching a repo) — this does **not** change the locked workflow decision in §9 (commit verified milestones directly to `main`, no phase branches) unless the founder says otherwise. If a session reports these tools as unavailable/ungated, it needs an app restart to pick up `.mcp.json` — the connection itself (`docker mcp client ls`) is already live.

---

## 2. Run it locally

```bash
# 0. Docker Desktop must be running.
# 1. Postgres (reads root .env: DB_USER / DB_PASSWORD / DB_NAME — gitignored)
docker compose up -d db

# 2. Backend
cd backend
npx prisma migrate deploy                    # apply migrations
node -r dotenv/config prisma/seed.js         # base demo data (WIPES + reseeds)
node -r dotenv/config prisma/seed-roles.js   # idempotent: logins/role, memberships, renter vault + pending consent
node -r dotenv/config prisma/seed-plans.js   # idempotent: SaaS plan catalog + backfill BETA subscriptions
npm run start:dev                            # http://localhost:5406/api

# 3. Frontend (separate terminal)
cd frontend && npm run dev                   # http://localhost:3002

# Tests / typecheck
cd backend && npx tsc --noEmit && npx jest
```

**Seed logins** (local only, password `admin123`): `root@`(ROOT_ADMIN) · `owner@`(OWNER) · `manager@`(MANAGER) · `agent@`(AGENT) · `renter@`(RENTER) — all `@carhub.os`.

> Raw seed/scripts need `-r dotenv/config` (they don't auto-load `.env` the way the Prisma CLI does).

---

## 3. Environment & secrets

- **Never commit secrets.** `backend/.env` (gitignored) holds `JWT_SECRET`, `DATABASE_URL`, `IDENTITY_PEPPER`, `CREDENTIALS_ENCRYPTION_KEY` (encrypts agency GPS credentials; required before any agency can connect a provider), Twilio keys. Root `.env` (gitignored) holds `DB_USER/DB_PASSWORD/DB_NAME` (+ a local `JWT_SECRET` only so `docker compose` interpolation of the `backend` service passes). `*.env.example` = placeholders only.
- **Fail-fast, no fallbacks:** the app throws at boot if `JWT_SECRET` is unset; trust hashing throws if `IDENTITY_PEPPER` is unset; GPS credential encryption/decryption throws if `CREDENTIALS_ENCRYPTION_KEY` is unset. Never reintroduce a hardcoded default secret.
- `*.db`, `dist/`, `.next/`, `.env*` (except `.env.example`) are gitignored.

---

## 4. Architecture

**Request flow:** `main.ts` (ValidationPipe, DecimalToNumberInterceptor, cookie parser, CORS) → `AuthGuard` (verifies JWT cookie, sets `req.user = {…payload, id: sub}`) → `RolesGuard` (`@Roles`) → controller → service (all tenant logic) → Prisma.

**Backend modules** (`backend/src/<feature>/` = `*.controller.ts` + `*.service.ts` + `*.module.ts` + `dto/`):
`auth` · `users` · `agencies` · `cars` · `bookings` · `contracts` · `inspections` · `payments` · `expenses` · `invoices`(in payments) · `customers` · `trust` · `refusal-logs` · `analytics` · `saas-admin` · `automations` · `notifications` · `maintenance` · `documents` · `hub` (B2B) · `search` · `public` · `ai-vision` · `integrations` · `webhooks` · `pdf-engine` · `audit-logs` · `tasks` · `payment-gateway` · `checkout` · `vault` (Supabase Storage-backed file vault, `settings.manage`-gated — dormant until `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set) · `telematics` (GPS/tracker integration — provider-agnostic adapters MOCK/TRACCAR, live position + **starter-interrupt immobilization behind a hard safety interlock**; needs `CREDENTIALS_ENCRYPTION_KEY`; see [docs/TELEMATICS.md](docs/TELEMATICS.md) **before** touching immobilization) · `common` (guards + decorators + interceptors + `crypto.ts` AES-256-GCM credential encryption) · `prisma`.

**Domain models (`backend/prisma/schema.prisma`):** Agency, User, Car, CarDocument, MaintenanceRecord, Booking, Invoice, Payment, Expense, Customer, CustomerDocument, Inspection, Contract, AutomationRule, Task, WebhookSubscription, HubListing, AuditLog — the **Trust Network (Pillar 6):** RenterIdentity, RenterReview, BlacklistEntry, RefusalLog — and **Telematics:** TelematicsIntegration (one per agency, encrypted provider credentials), TelematicsCommand (every mobility command *and refusal*, with the telemetry snapshot it was decided on). Trust models are **cross-tenant by design** (an agency sees another agency's flags on the same physical renter) — handle their deletes/cascades with care.

---

## 5. Conventions & invariants (do not violate)

1. **Tenant isolation.** Every business query is scoped by `agencyId` — `where: { …, agencyId }`. The caller's `agencyId` comes from `@CurrentUser()` (JWT), never from the request body. A cross-tenant read/write is an IDOR bug → return **404** (`NotFoundException`), don't leak existence with 403.
2. **Roles.** `ROOT_ADMIN, OWNER, MANAGER, AGENT, RENTER` (plain strings, exact casing). Gate with `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...)`. `RolesGuard` returns `true` when a handler has no `@Roles` → put the guard at class level and decorate only the restricted handlers. Public `POST /auth/register` may only self-assign `OWNER/AGENT/RENTER` and may **never** accept an `agencyId` (join = signed invite, not built yet).
3. **Money = `Decimal`.** Monetary columns are `Decimal @db.Decimal(12,2)`; Prisma returns `Prisma.Decimal` (Decimal.js), **not** `number`. Do money math with the Decimal API (`.plus/.minus/.times/.equals/.gte/.toDecimalPlaces(2)`) — never `+ - * /`, `Math.round`, or `>`/`<` against a Decimal, and never string-interpolate a Decimal into math. Compare amounts in **integer cents**. The global `DecimalToNumberInterceptor` (`common/interceptors/`) converts Decimals → JS **numbers** in JSON responses, so the **API/wire contract stays numeric** (the frontend expects numbers). Non-money floats (`Car.currentRoi`, `RenterIdentity.globalScore`) stay `Float`.
4. **Trust identity hashing.** `HMAC-SHA256(IDENTITY_PEPPER, normalize(cin))` (`trust.service.ts`). Deterministic (equality matching needs it). `IDENTITY_PEPPER` is required and **must never change** once real data exists (re-hash/backfill required) — this is a documented Phase-2 constraint.
5. **Transactions for check-then-act.** Money reconciliation and booking-overlap re-checks run inside `prisma.$transaction`, using the **`tx`** client for the guard read (not `this.prisma`). Throw inside the callback to abort atomically.
6. **Validation.** DTOs with `class-validator`; the global pipe strips unknown props (`whitelist`) and rejects them (`forbidNonWhitelisted`). Constrain enum-like strings with `@IsIn([...])`.
7. **Audit.** Sensitive actions (e.g. blacklist create/lift) write an `AuditLog` via the `@Global` `AuditLogsService` (`log(agencyId, actorId, action, entityType, entityId, before?, after?)`).
8. **Rate limiting.** `ThrottlerGuard` is global (default 100/60s); auth routes are `@Throttle({ default: { limit: 5, ttl: 60000 } })`. (Multi-replica needs a shared store — Phase 9.)

---

## 6. Database workflow

- Schema: `backend/prisma/schema.prisma` (datasource = `postgresql`, `url = env("DATABASE_URL")`).
- New migration: `npx prisma migrate dev --name <change>`. In non-interactive shells `migrate dev` may refuse a data-loss/cast confirm — fall back to `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel schema.prisma --script > migration.sql`, place it under a new `migrations/<ts>_<name>/`, then `prisma migrate deploy`.
- Migration history was reset to a single `init_postgres` in Phase 2 (no prod data). `migration_lock.toml` = `postgresql`.
- After schema changes: `npx prisma generate`, then fix service types, then `tsc --noEmit`.
- Seeds (`prisma/seed.js`, `seed-roles.js`, `seed-trust.js`) are standalone `node -r dotenv/config` scripts; `seed.js` wipes first (rerun `seed-roles.js` after). Making them idempotent + `NODE_ENV`-guarded is a Phase-2 item.

---

## 7. Testing

- `cd backend && npx jest` — unit tests, real Postgres not required (mocked Prisma). 31+ suites covering money/state-machine flows (deposits, late fees, refund reconciliation), tenant-boundary regressions (`common/multi-tenant-boundary.spec.ts` across ~13 domains), auth/capabilities fail-closed guards, and forensic/impersonation. Add tests alongside risky changes even when not strictly required.
- `cd frontend && npx vitest run` — frontend unit tests.
- **Live-DB e2e:** `backend/test/tenant-isolation.e2e-spec.ts` (Nest's Jest e2e scaffold, `npx jest --config test/jest-e2e.json`) runs against a **real Postgres**, not mocked Prisma — proves login + a cross-tenant 404 over actual HTTP. It registers its own fresh, run-scoped users via `POST /auth/register` and tears them down in `afterAll`, so it needs **no seed data** — just `DATABASE_URL` + `JWT_SECRET` + `IDENTITY_PEPPER` pointed at an empty (freshly migrated) DB. Runs in CI (below) and locally against `docker compose up -d db` + `npx prisma migrate deploy`.
- **CI** (`.github/workflows/ci.yml`, 3 jobs): `backend` (tsc/jest/eslint, mocked), `backend-e2e` (a `postgres:15` service container → `prisma migrate deploy` → the live-DB e2e spec above), `frontend` (tsc/vitest/eslint). Not yet a **required** PR check (repo-admin setting — Phase 9 item).

---

## 8. Gotchas (bitten us before)

- Prisma `Decimal` **serializes to a JSON string** — that's why the interceptor exists. New endpoints returning money get it for free (plain objects/arrays only; Buffers/streams like PDFs pass through).
- `git checkout` of a branch where a file is tracked, then a fast-forward that removes it, **deletes the working copy** — cost us the local `dev.db` once (restored from a bundle).
- `docker compose` interpolates **all** services, so the `backend` service's `${JWT_SECRET:?}` must resolve even when you only `up -d db`.
- The three May migrations were Postgres-flavored while the datasource was SQLite — that mismatch blocked `prisma migrate` before Phase 2.
- Money math on `Float` drifts (`333.33×3 ≠ 999.99`); always Decimal cents.

---

## 9. How this repo is being built (orchestration)

A **supervisor** decomposes each backlog phase into small tasks with **exact file ownership**, dispatches each to the cheapest capable **worker** (see `.claude/agents/`), and **verifies before committing**. Rules that keep it smooth:

- **Disjoint file ownership** for anything run in parallel — never two workers on the same file at once. Schema-touching work (shared `schema.prisma`) is **serialized**.
- **Verify before commit:** a `verifier` pass on each change (or per batch); **always individual** for security / money / DB / migration changes. Never commit red (tsc or tests failing).
- **Branch/commit:** currently working directly on `main` (per owner's choice). Keep `tsc --noEmit` + `jest` green at every commit. Conventional, descriptive commit messages.
- **Human gates:** Phase 0 (secret rotation / history rewrite — done), Phase 2 (destructive migration — done), Phase 9 (deploy target + go-live), and any product decision (DB host, VAT model, i18n scope).
- **Docs:** update `CLAUDE.md` + the backlog + any stale doc at the end of every phase.
- **Two AI agents share this checkout** (a Lead Developer and a Co-Developer, plus possibly the Codex fleet in §10). **[COORDINATION.md](COORDINATION.md) is the async channel between them (protocol, live status board, open lanes)** — read it before your first write of a session, claim contended work in its "Live status board", and check its "Open findings" list for cross-cutting issues one agent flagged for the other to own. Neither agent sees the other's conversation; anything the other needs to know goes in that file, not in chat.

---

## 10. Phase progress (see the backlog for detail)

- **Phase 0** ✅ security incident — secrets purged/rotated, git history scrubbed, repo private, register authz fixed.
- **Phase 1** ✅ correctness & authz — throttler, JWT fail-fast, trust role-gating, payments/expenses IDOR, invoice reconciliation, double-booking guard, HMAC identity hash.
- **Phase 2** ✅ data foundation — Postgres switch, money `Decimal(12,2)` + `DecimalToNumberInterceptor`, `Task.agencyId`, Agency soft-delete + trust-cascade→SetNull, `recompute()` in txn, idempotent seeds.
- **Phase 5** ✅ roles (mock → real) — **5A Capability Engine** (catalog + `AgencyMembership` + `CapabilitiesGuard` + `@RequireCapabilities` + staff-mgmt API + owner Staff & Access UI; ROLE_PRESETS OWNER=23/MANAGER=20/AGENT=15 after the telematics grants, ROOT_ADMIN bypass, fail-closed). **5B Renter portal + Consent/QR** (self-scoped `/portal/*`, `ConsentGrant` + global `RenterDocument` vault, invariant: no agency PII read without an active in-scope same-agency time-boxed grant — verified E2E). Landing/rebrand to **Fider** + mobile nav + Modal a11y + inclusive VAT also landed.
- **Phase 3** ✅ financial lifecycle — deposits (capture→HOLD→RETURN/CLAIM+damage charge), partial-payment/refund reconciliation hardened (integer cents, refund can't exceed net verified income), Finance UI wired to real endpoints. `backend/src/bookings/dto/deposit.dto.ts`, `payments.service.ts`.
- **Phase 4** ✅ — inspection return/damage flow (POST vs PRE_RENTAL diff, conservative auto-charge, never fabricates an amount), contract e-sign gated on SIGNED, late fees (OVERDUE→COMPLETED charges at the car's own daily rate). Rate tiers/seasonality still not started (lower priority).
- **Phase 6** ✅ mostly — `trust.assess()` no longer recomputes-on-read, `analytics.service.ts` converted to SQL aggregates, search uses `startsWith`, hot-path indexes added, `GET /bookings` accepts optional pagination params. The owner scheduler now sends a visible-window `from`/`to` (**overlap** semantics — `startDate <= to AND endDate >= from`) so it fetches only the on-screen window, not the whole booking history. `GET /customers` and `GET /cars` (R47) now both accept optional `page`/`limit`/`search` (backward-compatible: bare capped array when omitted); the frontend doesn't send them yet on either page — adopting the paginated UI is a remaining perf follow-up (product/UX call, `COORDINATION.md` Lane 3b). Payments list endpoints stay `take`-capped only.
- **Phase 7** ✅ mostly — next-intl FR(default)/AR(RTL)/EN foundation; contrast floor and fake-success-toast audits both came back clean/fixed (verified `admin/agencies`'s toasts are real; fixed `admin/provision` + `accidents`' fake ones). Chart a11y **complete** — all four data-bearing surfaces (dashboard daily-intensity, `erp` capital flow, `erp` utilization, landing `TrustConsole` gauge) now have an sr-only `<table>` equivalent or documented reasoning for not needing one, `aria-hidden` decoration, touch-reachable tooltips, and next-intl number formatting. **R47 (2026-08-05):** found and closed a real i18n regression — translation keys had been defined but never wired into JSX across 9 owner-dashboard files and the whole renter portal (English rendered regardless of active locale), left half-done by background agents interrupted mid-task in a prior session; also fixed `formatDate`/`formatDateTime` calls silently defaulting to French on every locale. See `COORDINATION.md` R47.
- **Phase 8** ✅ mostly — `react-hooks/rules-of-hooks` + `no-floating-promises` re-enabled as errors (0 and 1 real violations respectively, both fixed); new tests for `capabilities.guard`, `auth.guard`, `auth.service` (the two fail-closed enforcement points every other guard relies on), and a cross-cutting multi-tenant boundary spec; `.github/workflows/ci.yml` (backend+frontend, tsc/tests/lint). Making CI a required PR check needs a repo-admin setting — flagged for the founder. No live-DB e2e in CI yet.
- **Phase 11** ✅ SaaS business layer — `Plan`/`Subscription`/`PlatformInvoice`, `EntitlementsService` (limits + feature flags, fail-open to BETA), usage metering + dunning gates on cars/staff/bookings create, manual founder billing console (metrics/MRR, change plan, extend trial, issue+pay invoice), audited impersonation (`/saas-admin/agency/:id/impersonate` + `/auth/exit-impersonation` + banner). Agency billing page + founder metrics dashboard + real agencies console. Free-during-beta (BETA plan grants all); Stripe deferred (post-beta, human-gated). Seeds: `prisma/seed-plans.js`.
- **Phase 12** ✅ **Design & frontend rebuild — "Fider Lux"** complete — presentation-layer only. Warm graphite/cream + restrained violet + sparing brass; Fraunces/Hanken/IBM Plex Mono; killed the blanket `uppercase font-black` heading rule (0 files app-wide, confirmed by a final sweep); `.glass` retuned to warm solid; imagery kit (`Avatar`/`AgencyImage`/`CarPhoto`/`TrustSeal`) with real AI-generated photography dropped in. Public site, owner dashboard, agent/admin/renter portals all done, including the flagship renter portal page and the public-site footer (found still on the old system in a later audit, fixed). Direction chosen via a design judge panel (synthesis: "Graphite & Brass — Concierge"). Brief: `docs/DESIGN_VISION.md`; checklist: `docs/AUDIT_BACKLOG.md` PHASE 12. Design tokens live in `frontend/src/app/globals.css` @theme; kit in `frontend/src/components/ui/`.
- **Guardian Vault** ✅ was a mock page with a fake "AES-256 encryption applied" toast (outside the phase list above) — wired to a real (new) `GET /documents` endpoint; file storage itself is still a follow-up.
- **Follow-ups closed since:** owner scheduler adopts windowed `/bookings` (overlap query) + OVERDUE handled app-wide; multi-tenant boundary spec at 12 domains + a staff privilege-escalation spec; pseudo-enum `@IsIn` hardening + seed drift fix; chart a11y (sr-only data table); **founder tenant provisioning wired** (`/saas-admin/provision`, no migration — unit+type verified; live smoke test done 2026-07-24: provisioned a real agency+owner, new owner logged in, `/agencies/me` + public subdomain lookup both resolved correctly, cleaned up after). Backend jest **108** tests.
- **Payments** ✅ mostly — online checkout (mock + real env-gated Stripe adapter), `CheckoutSession`/`payment-gateway` layer, settleCheckout idempotency, ROOT_ADMIN platform audit endpoint. **SaaS-subscription checkout (V1) done** (2026-07-27, `COORDINATION.md` R46) — founder-locked rules: self-serve **upgrades only** (downgrades go through support), one-shot full new-plan price (no proration), applied immediately on webhook settlement, silent no-op on a failed payment. `POST /payments/checkout/subscription` gated on the new `billing.manage` capability (OWNER-only); `CheckoutSession.targetPlanId`/`platformInvoiceId` carry the in-flight upgrade; `settleCheckout`'s `SAAS_SUBSCRIPTION` branch creates the `PlatformInvoice` already-PAID at settlement (never earlier, so a failed checkout can't leave a phantom ISSUED invoice) and mirrors `SaasAdminService.updateSubscription`'s field writes/audit shape so the founder console and this webhook stay consistent. Runs alongside the manual founder console by design (founder accepted the concurrent-write risk for V1). **Blocked by Founder:** Stripe live test alone (needs real `.env` keys). See `COORDINATION.md` Open lanes.
- **Vault file storage** ✅ complete end-to-end — Supabase Storage-backed (`VaultFile` model, `vault` module, signed-URL download, `settings.manage`-gated), real founder project keys configured and live-verified (R41). Agency-wide file manager UI at `/dashboard/vault-files` (R39). **Entity-linking (R42):** `CarDocument.vaultFileId` FK (IDOR-checked) + `RenterDocument.storagePath/mimeType/sizeBytes` own columns (cross-tenant/consent-gated, doesn't reuse `VaultFile`'s single-agency model) — first-ever `POST /portal/documents` + consent-gated agency download endpoint. **Guardian Vault car-document upload UI (R43, Phase 1):** `VaultFileAttachment` in the fleet detail page's Register/Renew document modals + "View file" action; shared client helper at `frontend/src/lib/vault.ts`. **Renter portal upload + agency consent-gated viewer (R44, Phase 2):** `UploadDocumentModal` on `/portal` ("My documents"); `VaultAccessPanel` on the customer detail page bridges the (unlinked-by-schema) `Customer`↔renter `User` gap via a QR-resolved `renterUserId` cached client-side — real consent-gated reads only, never a bypass — with a mandatory-display identity-cross-check warning (added after a concurrent audit flagged the un-warned version as a wrong-renter PII-misattribution risk, `docs/AUDIT_2026-07-26.md` #1). **Remaining:** a real `Customer`↔renter-`User` schema link (product decision, not guessed at) would remove the need for that bridge entirely.
- **Full platform QA sweep** ✅ done (2026-08-05, `COORDINATION.md` R47) — live-browser walkthrough of all ~30 routes across every role (Owner/Agent/Renter/Root Admin/public), in FR/AR/EN. Found and repaired real JSX corruption + finished half-wired i18n left by 3 background agents interrupted mid-task in a prior session (owner dashboard); independently found and fixed the same class of gap on the renter portal, plus a locale-fallback date-formatting bug. Landed `cars` pagination parity with `customers` (backend only). Fixed a real fleet-utilization metrics bug (`getUtilizationMetrics` interval-overlap + future-day-clamping — fed the dashboard's Health Score and advisor thresholds). Backend **49 suites / 392 tests**, tsc clean backend+frontend. Full detail in `COORDINATION.md` R47.
- **Telematics / GPS** ✅ (2026-08-09, `feat-telematics-gps`) — agencies connect **their own** GPS account (we never resell hardware or hold position history) to locate a vehicle and, under a hard interlock, immobilize it. Provider-agnostic adapters (MOCK + TRACCAR) mirroring the payment-gateway split; the safety interlock lives in `TelematicsService`, above the adapter, so no future provider can skip it. **Immobilization is a starter interrupt — it blocks the NEXT start and can never cut a running engine**; refused unless live telemetry shows stationary (≤3 km/h) AND a fix ≤180s old (the guard that stops a stale "0 km/h" authorising an immobilization at motorway speed) AND ignition off. Refusals are persisted + audit-logged, not silent. Credentials AES-256-GCM at rest (`CREDENTIALS_ENCRYPTION_KEY`, fail-fast, never selected into a response or an audit row); agency-supplied `baseUrl` screened by the existing webhooks SSRF host guard, https-only, redirects not followed. New `telematics.view` / `telematics.command` capabilities (command = OWNER only) **plus a data migration backfilling them onto existing memberships** — a capability added to the catalog does not retroactively reach already-materialised `AgencyMembership.capabilities`, which was found live as an immediate 403 for a seeded owner. **Read [docs/TELEMATICS.md](docs/TELEMATICS.md) before touching immobilization.** Known gap: the two new UI surfaces are English-only (see that doc §6).
- **Remaining:** Phase 9 (deploy — **HUMAN GATE**, needs the founder), Phase 10 (final review — do last), rate tiers (product decision), webhooks DNS-rebinding SSRF guard now closed (see `COORDINATION.md` R37). Live-DB e2e in CI (`backend-e2e` job) and the `accidents` real model + migration are both done — CI now also runs the full Playwright suite (`e2e` job, added after fixing its Phase-12-stale locators — see `39ef838`/CI update). Frontend pagination UI for customers/cars (backend ready, see Phase 6) is the one open perf item.
- **Note:** a separate Codex CLI worker fleet (`.codex/agents/*.toml`) may be run against this same repo concurrently (by the user, in another terminal) — check `git status` before editing any file, especially `backend/src/bookings/*`/`backend/src/payments/*`, its usual working files.
