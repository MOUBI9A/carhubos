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

- **Never commit secrets.** `backend/.env` (gitignored) holds `JWT_SECRET`, `DATABASE_URL`, `IDENTITY_PEPPER`, Twilio keys. Root `.env` (gitignored) holds `DB_USER/DB_PASSWORD/DB_NAME` (+ a local `JWT_SECRET` only so `docker compose` interpolation of the `backend` service passes). `*.env.example` = placeholders only.
- **Fail-fast, no fallbacks:** the app throws at boot if `JWT_SECRET` is unset; trust hashing throws if `IDENTITY_PEPPER` is unset. Never reintroduce a hardcoded default secret.
- `*.db`, `dist/`, `.next/`, `.env*` (except `.env.example`) are gitignored.

---

## 4. Architecture

**Request flow:** `main.ts` (ValidationPipe, DecimalToNumberInterceptor, cookie parser, CORS) → `AuthGuard` (verifies JWT cookie, sets `req.user = {…payload, id: sub}`) → `RolesGuard` (`@Roles`) → controller → service (all tenant logic) → Prisma.

**Backend modules** (`backend/src/<feature>/` = `*.controller.ts` + `*.service.ts` + `*.module.ts` + `dto/`):
`auth` · `users` · `agencies` · `cars` · `bookings` · `contracts` · `inspections` · `payments` · `expenses` · `invoices`(in payments) · `customers` · `trust` · `refusal-logs` · `analytics` · `saas-admin` · `automations` · `notifications` · `maintenance` · `documents` · `hub` (B2B) · `search` · `public` · `ai-vision` · `integrations` · `webhooks` · `pdf-engine` · `audit-logs` · `tasks` · `common` (guards + decorators + interceptors) · `prisma`.

**Domain models (22, `backend/prisma/schema.prisma`):** Agency, User, Car, CarDocument, MaintenanceRecord, Booking, Invoice, Payment, Expense, Customer, CustomerDocument, Inspection, Contract, AutomationRule, Task, WebhookSubscription, HubListing, AuditLog — and the **Trust Network (Pillar 6):** RenterIdentity, RenterReview, BlacklistEntry, RefusalLog. Trust models are **cross-tenant by design** (an agency sees another agency's flags on the same physical renter) — handle their deletes/cascades with care.

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

- `cd backend && npx jest`. Real coverage is currently thin (identity-hash golden test + a controller test) — the backlog Phase 8 builds it out (money/trust/auth units, multi-tenant authz E2E, CI). Add tests alongside risky changes even when not strictly required.

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

---

## 10. Phase progress (see the backlog for detail)

- **Phase 0** ✅ security incident — secrets purged/rotated, git history scrubbed, repo private, register authz fixed.
- **Phase 1** ✅ correctness & authz — throttler, JWT fail-fast, trust role-gating, payments/expenses IDOR, invoice reconciliation, double-booking guard, HMAC identity hash.
- **Phase 2** ✅ data foundation — Postgres switch, money `Decimal(12,2)` + `DecimalToNumberInterceptor`, `Task.agencyId`, Agency soft-delete + trust-cascade→SetNull, `recompute()` in txn, idempotent seeds.
- **Phase 5** ✅ roles (mock → real) — **5A Capability Engine** (catalog + `AgencyMembership` + `CapabilitiesGuard` + `@RequireCapabilities` + staff-mgmt API + owner Staff & Access UI; ROLE_PRESETS OWNER=21/MANAGER=19/AGENT=14, ROOT_ADMIN bypass, fail-closed). **5B Renter portal + Consent/QR** (self-scoped `/portal/*`, `ConsentGrant` + global `RenterDocument` vault, invariant: no agency PII read without an active in-scope same-agency time-boxed grant — verified E2E). Landing/rebrand to **Fider** + mobile nav + Modal a11y + inclusive VAT also landed.
- **Phase 11** ✅ SaaS business layer — `Plan`/`Subscription`/`PlatformInvoice`, `EntitlementsService` (limits + feature flags, fail-open to BETA), usage metering + dunning gates on cars/staff/bookings create, manual founder billing console (metrics/MRR, change plan, extend trial, issue+pay invoice), audited impersonation (`/saas-admin/agency/:id/impersonate` + `/auth/exit-impersonation` + banner). Agency billing page + founder metrics dashboard + real agencies console. Free-during-beta (BETA plan grants all); Stripe deferred (post-beta, human-gated). Seeds: `prisma/seed-plans.js`.
- **Remaining hardening** ⏳ **Phase 3** deposits/refunds, **4** rental lifecycle, **6** perf, **7** i18n FR/AR/EN + a11y + dead-buttons, **8** tests/CI, **9** deploy (HUMAN GATE), **10** final audit, **12** design/frontend rebuild.
- **Phase 12** 🔄 **Design & frontend rebuild — "Fider Lux"** (in progress) — presentation-layer only. Warm graphite/cream + restrained violet + sparing brass; Fraunces/Hanken/IBM Plex Mono; killed the blanket `uppercase font-black` heading rule; `.glass` retuned to warm solid (propagates app-wide); imagery kit (`Avatar`/`AgencyImage`/`CarPhoto`) with real-photo swap slots. **Done:** foundation (`46968f1`) + public marketing/auth (`44a59ef`). **Next:** owner dashboard, then agent/admin/renter. Direction chosen via a design judge panel (synthesis: "Graphite & Brass — Concierge"). Brief: `docs/DESIGN_VISION.md`; checklist: `docs/AUDIT_BACKLOG.md` PHASE 12. Design tokens live in `frontend/src/app/globals.css` @theme; kit in `frontend/src/components/ui/`.
