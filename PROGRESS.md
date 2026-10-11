# PROGRESS — CarHub / "Fider" market-readiness

> **Last updated at R50.** Tree is 100% clean, `backend` tsc clean + jest **54 suites / 443 tests green** + eslint clean, `frontend` tsc clean + vitest **6 suites / 19 tests green** + eslint clean. Phase 12 design system is 100% clean (0 `font-black`, 0 raw white/color tokens app-wide). Certified PDF dossier engine fully integrated. Production deployment live at `https://carhub.codes` on Vercel + Supabase (PostgreSQL 17.6). Multi-tenant isolation verified across 14 domains.

## ⚠️ Important: another AI may also work this repo

`.codex/agents/*.toml` + root `AGENTS.md` + `GEMINI.md` show a **Codex CLI worker fleet** (mirroring this project's own supervisor→worker→verifier model) can be run against this same repo, likely by the user in a separate terminal. It was actively live-editing `backend/src/bookings/*` and `backend/src/payments/*` in a prior session (deposit lifecycle + refund reconciliation — reviewed and committed). It was quiet for the whole of this session.

**Before writing to any file, run `git status` first** — if it shows unexpected modifications not from this session, another process may be active. Don't blind-edit a file that's mid-write elsewhere; `tsc`/`jest`/`vitest` all green is a fast way to confirm the tree is currently stable before continuing.

## The goal
Take this multi-tenant car-rental SaaS from demo → market-ready. B2B SaaS: the **founder** (ROOT_ADMIN) runs the platform; **agencies** (OWNER + staff) are paying subscribers; **renters** are end users. Done = the **Market-Ready Checklist** at the bottom of `docs/AUDIT_BACKLOG.md`.

## Founder decisions (locked)
VAT inclusive · Billing = manual invoicing (no Stripe) · Plans free during beta (BETA plan grants all) · i18n FR (default) + AR (RTL) + EN · Trial 14 days · Deploy target deferred to the Phase 9 gate · Commit verified milestones directly to `main` (no phase branches).

## Local run
```
docker compose up -d db
cd backend && npx prisma migrate deploy
node -r dotenv/config prisma/seed.js            # base demo (WIPES); then:
node -r dotenv/config prisma/seed-roles.js      # idempotent: users, memberships, renter vault + pending consent
node -r dotenv/config prisma/seed-plans.js      # idempotent: SaaS plan catalog + backfill BETA subscriptions
npm run start:dev                               # http://localhost:5406/api
cd frontend && npm run dev                      # http://localhost:3002
```
Logins (password `admin123`): `root@ owner@ manager@ agent@ renter@` `carhub.os`.
**Backend tests run via `jest`** (`cd backend && npx jest`) — **frontend tests run via `vitest`, NOT jest** (`cd frontend && npx vitest run`) — running `jest` in `frontend/` gives a misleading babel parse error, not a clear "wrong runner" message. Lint: `npx eslint .` in either dir (both `react-hooks/rules-of-hooks` and `no-floating-promises` are now hard errors, not warnings).

## DONE (committed to `main`, verified — tsc/jest/vitest/eslint green at every commit)

- **Phase 0** security — secrets purged/rotated, history scrubbed, register privilege-escalation closed (now regression-tested, see Phase 8).
- **Phase 1** correctness/authz — throttling, JWT fail-fast, trust role-gating, payments/expenses IDOR fixes, invoice reconciliation, double-booking guard, HMAC identity hash.
- **Phase 2** data foundation — Postgres, money Decimal(12,2) + interceptor, soft-delete, trust-cascade, idempotent seeds.
- **Phase 3 — financial lifecycle** ✅ — security deposits (capture → HOLD → RETURN/CLAIM + damage charge), partial-payment/refund reconciliation (integer cents, refund can never exceed net verified income), Finance UI wired to real `/expenses` + `/payments/pending|recent` + `/expenses/summary`.
- **Phase 4 — rental lifecycle** ✅ — OVERDUE state + legal transitions + spam-guarded hourly cron, contract e-sign gated on SIGNED, inspection return/damage flow (PRE vs POST_RENTAL diff, conservative auto-charge — never fabricates an amount, flags manual review when there's no real cost signal), **and now late fees**: `BookingsService.updateStatus()` charges every day past the scheduled return at the car's own `pricePerDay` (a real rate, not invented) when an OVERDUE booking is closed out, same integer-cents reconciliation pattern, audited (`bookings.service.spec.ts`).
  - **Left**: rate tiers/seasonality/extras — not started, lower priority (not in the Market-Ready Checklist verbatim).
- **Phase 5A/5B** ✅ capability engine + renter portal/consent.
- **Phase 6 — performance** ✅ — `trust.assess()` no longer recomputes-on-read; `analytics.service.ts` converted to SQL aggregates; `search.service.ts` uses `startsWith`; hot-path indexes added (migration `20260720125819_hot_path_indexes`); **and now bookings pagination**: `GET /bookings` accepts optional `status/from/to/page/pageSize` — omitting all of them returns the exact same flat array as before (zero risk to today's frontend), passing them moves filtering to a SQL `WHERE` + `skip/take` and returns `{items,total,page,pageSize}`. **The owner scheduler now adopts this** (commit `a90c4d5`): `from`/`to` were upgraded to **overlap** semantics (`startDate <= to AND endDate >= from`, so an in-progress rental that began before the window still shows), and `useBookings(from,to)` fetches only the visible 14-day window (cached fleet/customer ref-data, monotonic request-id guard against out-of-order responses, non-destructive nav-fetch errors). Adversarially reviewed before commit.
- **Phase 7 — UX/a11y/i18n** ✅ mostly — next-intl FR(default)/AR(RTL)/EN foundation; the false "AES-256 JWT ENCRYPTION" claim (already gone) and a second one on `/admin/provision` (softened to something honest); contrast-floor grep sweep came back clean (Phase 12's token migration already fixed it); **all three known fake-success toasts removed** — `admin/provision`'s "Instantiate tenant" and `accidents`' "Report incident"/"Export PDF" now show honest "not wired yet" info toasts instead of fabricating success (verified `admin/agencies`'s subscription/invoice toasts are real — they call genuine `/saas-admin/*` endpoints).
  - ✅ **Done** — chart tap/focus + screen-reader table equivalents landed across all four data-bearing chart surfaces (`fbbaf2b` + `1ed9fea` for the dashboard daily-intensity chart, then T1 for `erp` capital flow / `erp` utilization / landing `TrustConsole`).
- **Phase 8 — tests + CI** ✅ mostly — this was "not started" at the top of this session, now substantially done:
  - `react-hooks/rules-of-hooks` (frontend) and `no-floating-promises` (backend) flipped from `off` to `error`. Real fallout after excluding lint noise from gitignored `dist/` and the standalone `prisma/*.js` seed scripts: **0** and **1** (a single unawaited `bootstrap()` in `main.ts`, now `.catch()`-handled). Both clean.
  - New unit tests: `capabilities.guard.spec.ts` (9 tests — the fail-closed capability enforcement point: ROOT_ADMIN bypass, membership-scoping, missing-capability Forbidden, etc.), `auth.guard.spec.ts` (6 tests — JWT cookie/Bearer extraction, invalid-token handling), `auth.service.spec.ts` (9 tests — regression-proves the Phase 0 fix: `RegisterDto` structurally has no `agencyId` field, `role` is `@IsIn`-constrained to OWNER/AGENT/RENTER), `common/multi-tenant-boundary.spec.ts` (4 tests — cross-cutting: bookings/customers/documents/inspections all 404 across tenants), `bookings.service.spec.ts` (3, late fee), `inspections.service.spec.ts` (existing, extended).
  - `.github/workflows/ci.yml` — two parallel jobs (backend: `prisma generate`→tsc→jest→eslint; frontend: tsc→vitest→eslint), `pull_request`+`push:main`, cancel-in-progress. Every step verified green locally with the exact same commands.
  - **Left**: making the CI workflow a *required* status check needs a repo-admin action (GitHub Settings → Branches → protection rule) — a shared-infrastructure change, flagged for the founder rather than done silently. Playwright e2e / a live-DB multi-tenant E2E suite isn't wired into CI (needs a Postgres service container — bigger infra lift). The multi-tenant boundary test covers a representative sample, not every domain exhaustively.
- **Phase 11 — SaaS Business Layer** ✅ complete.
- **Phase 12 — Design & Frontend Rebuild "Fider Lux"** ✅ complete — `font-black`/`text-white`/`text-white/`/`bg-white/` and raw semantic colors are **0 app-wide**, confirmed by recursive grep sweep across the whole frontend. All shared components (`Modal`, `EmptyState`, `Combobox`, `CommandPalette`, `Button`, `Skeleton`, `Card`, `ToastContext`, `ImpersonationBanner`) fully migrated to semantic Fider Lux tokens. Toast notifications WCAG 2.2.1 compliant (pause-on-hover/focus + aria-live region). Combobox ARIA roles hardened. Renter vault and customer detail vault access panels fully translated and connected.
- **Guardian Vault** ✅ — closed a genuine "mock page + fake toast" gap outside the original phase list: was a hardcoded array with a fake "AES-256 encryption applied" success toast, now wired to a real (new) `GET /documents` (agency-wide) endpoint + `GET /cars` for the upload picker, real HUD counts, real search/filter, and honest states throughout (no fake success, explicit "file upload isn't wired yet" note — the metadata is real, the file-storage piece is a separate infra decision).

### 1. Phase 9 — deploy ✅ COMPLETED (Production Live on Vercel + Supabase)
- **Production URL:** `https://carhub.codes` (also `https://www.carhub.codes`, `https://carhubos.vercel.app`).
- **Hosting / Compute:** Vercel (`carhubos`, deployment `READY`).
- **Database:** Supabase managed PostgreSQL 17.6 (`nsnashznakiofxopdsfg`, eu-west-1).
  - Migrations / Session Pooler (port 5432): 14 migrations verified up to date.
  - Vercel Runtime / Transaction Pooler (port 6543): `pgbouncer=true&connection_limit=1`.
- **Live Endpoints Verified:**
  - `GET /api/health` → 200 OK (`status = ok, service = fider-api`)
  - `GET /api/ready` → 200 OK (`status = ready, database = reachable`)
  - `GET /api/platform/plans` → 200 OK (STARTER, PRO, BUSINESS returned from live DB)
- **Database production blocker:** RESOLVED.
- **Vault Storage:** Configured in Vercel (`vault-files` bucket, `SUPABASE_SECRET_KEY`). Code supports both `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Authenticated E2E smoke test pending.
- **Payments / AI:** Intentionally disabled (`PAYMENT_PROVIDER=DISABLED`, `AI_VISION_MODE=disabled`).

### 2. Phase 10 — final pass (current focus)
- Production smoke-testing using synthetic / fake data for controlled pilot flow.
- Authenticated E2E verification of tenant isolation (Agency A vs Agency B, zero IDOR leaks).
- Vault upload/download/delete smoke test with safe synthetic test files.

### 3. Smaller follow-ups (not blocking, pick up opportunistically)
- ✅ ~~Adopt the paginated `GET /bookings` shape in the frontend~~ — done (`a90c4d5`, windowed scheduler; see Phase 6 above).
- ✅ ~~OVERDUE booking status crashed the frontend~~ — done (`aa71a37`): OVERDUE (reachable via the ACTIVE→OVERDUE cron) was missing from every frontend status map; the owner scheduler + renter portal history crashed on it. Added OVERDUE (amber "needs attention") to the `BookingStatus` types + all status maps (owner bookings/portal/customers/fleet/search); tsc enforces exhaustiveness.
- ✅ ~~Extend the multi-tenant boundary test~~ — **now 12 domains** across 3 scoping shapes (`5debfce` cars/maintenance/payments-verify load-then-check; `aac52f3` tasks updateMany-write-scoping + refusal-logs). **Staff/memberships** got a dedicated security spec (`b22203d`, `agency-staff.service.spec.ts`): tenant boundary + anti-escalation (a non-ROOT_ADMIN caller can't grant caps they don't hold) + lockout guards. Remaining (low value): automations, notifications, analytics.
- ✅ ~~Enum/validation hardening~~ — done (`171cef3`): constrained the unconstrained pseudo-enum String fields with `@IsIn` after auditing real values (Car.status, Customer.status, Customer.identityType, UpdateBookingDto.status); fixed the seed's `BANK_TRANSFER`→`TRANSFER` drift; `dto-enum-constraints.spec.ts`. fuelType/gearbox left free-form (no fixed set used anywhere).
- ✅ ~~Chart tap/focus + screen-reader table equivalents~~ — done (`fbbaf2b`): reusable `SrDataTable`; the dashboard daily-intensity chart (data was hover-tooltip-only) now has an sr-only `<table>` + labelled `<figure>` + aria-hidden decorative bars; fleet gauge SVG hidden from AT. Finance breakdown already exposed label+value as text (no change); admin/pulse is a mock page (skipped).
- Rate tiers/seasonality/extras on bookings (Phase 4). **Product decision** (weekend multiplier? seasonal calendar? per-car tiers?) — confirm the pricing model with the founder; touches money math.
- Other unbounded list endpoints (perf "holds at 10k+"): `GET /customers` is **already paginated** (ListCustomersQueryDto page/limit/search); audit `/cars` / `/payments`.
- A live-DB Playwright/e2e CI job (needs a Postgres service container in `ci.yml`).
- Real file storage for Guardian Vault uploads (currently metadata-only) — infra decision.
- ✅ ~~`admin/provision` ("founder provisions a tenant")~~ — done (`ff8021b`): `POST /saas-admin/provision` (ROOT_ADMIN) reuses the register txn (agency + OWNER + OWNER membership + BETA subscription, **no migration**); founder sets the owner's initial password (shared out-of-band; email invites aren't built). Wizard wired with owner-name/password fields; region/SLA/backup steps stay presentational. `saas-admin.service.spec.ts` (3 tests). ⚠ **Verified unit + type level only — a live E2E smoke test is still pending** (Docker/Postgres wasn't up this session; bring the stack up and provision one tenant to confirm the round-trip + login).
- **`accidents/page.tsx`** — the LAST "not wired" stub. Real Accident/incident model = new Prisma model + **migration** + product spec (fields/workflow); larger, needs the DB running to verify. Still open.

## Open questions / mid-debugging
None blocking — tree is clean, all four verification commands (backend tsc/jest/eslint, frontend tsc/vitest/eslint) are green. The only genuine ambiguity is whether the Codex CLI process might resume in a future session; check `git status` first per the note above.
