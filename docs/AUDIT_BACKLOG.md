# CarHub / Infinity OS — Engineering Audit & Market-Readiness Backlog

> Produced 2026-07-17 by an 8-dimension senior-engineer review of the actual code.
> Severity: **C**ritical / **H**igh / **M**edium / **L**ow. Work top-down by phase.
> Definition of "done" for the program is the **Market-Ready Checklist** at the bottom.

---

## ⚠ PHASE 0 — SECURITY INCIDENT (do before anything else; requires human confirmation)

The repo has a live remote (`github.com/MOUBI9A/carhubos`) containing real secrets and data. Verified against git.

> **STATUS: ✅ PHASE 0 CLOSED** (single `main` branch; history rewritten). All code/config committed + verifier-PASS; repo made **private**; `JWT_SECRET` **rotated**; git history **scrubbed** (`filter-repo`) and force-pushed clean. Pre-scrub backup bundle at `~/Desktop/carhubos-prescrub-backup.bundle` (contains old secrets — delete once satisfied).

- ✅ **[C] Committed secrets** — `backend/.env.example` sanitized; `docker-compose.yml` live `JWT_SECRET`+DB defaults removed (fail-fast). `JWT_SECRET` rotated in `backend/.env`. **DB password:** no live Postgres yet (SQLite in use) → nothing to rotate now; **do not reuse `carhub_secret_2026`** when provisioning Postgres in Phase 2. **`IDENTITY_PEPPER`:** never committed (only the placeholder was) → NOT rotated, to avoid breaking trust matching; weak value is a Phase 2 item.
- ✅ **[C] Committed database + PII** — removed from index + all history; `.gitignore` covers `*.db`, `*.db-journal` (local `dev.db` restored from snapshot, still gitignored).
- ✅ **[C] Committed build output** — 301 `backend/dist/` files removed from index + all history; `.gitignore` covers `dist/`/`.next/`.
- ✅ **[C] History purge** — `git filter-repo` stripped `dev.db`/`prisma/dev.db`/`dist` and redacted the two secret strings across all 5 commits; force-pushed. Verified 0 occurrences remain. Repo private. ⚠ Open checks: (a) any **forks** made while public retain old history; (b) GitHub may cache old commit SHAs server-side — contact GH Support to purge if maximum cleanliness is required.
- ✅ **[C] Anonymous privilege escalation** — `role` now `@IsIn(['OWNER','AGENT','RENTER'])`; ROOT_ADMIN/MANAGER not self-assignable. (rate-limiting is Phase 1.)
- ✅ **[C] Tenant hijack (IDOR)** — `agencyId` dropped from `RegisterDto` + service; public register can only create a fresh agency or a no-agency user.

**GATE: CLEARED** — rotation + history purge + repo-privacy confirmed done.
Follow-up for the invite-flow work: an anonymous caller can still self-select `role:"OWNER"` with no `agencyName` → OWNER with `agencyId:null` (inert cross-tenant; harden when the signed-invite join is built).

---

## PHASE 1 — Correctness & Authorization quick wins

- **[H] Bind the ThrottlerGuard** — configured but never bound (`app.module.ts:42`, no `APP_GUARD`). → Add `{provide:APP_GUARD, useClass:ThrottlerGuard}` + strict `@Throttle` (~5–10/min) on auth routes.
- **[H] JWT secret fallback** — `|| 'carhub-v2-super-secret-key'` in `auth.module.ts:12` & `auth.guard.ts:22`. → Remove fallback, fail fast if unset.
- **[H] Trust writes have no role gate** — `trust.controller.ts:21` AuthGuard only; any AGENT can hard-block a renter network-wide; `/trust/backfill` unguarded. → Gate blacklist create/lift to `@Roles('MANAGER','OWNER')` + audit-log; restrict `backfill` to ROOT_ADMIN or remove from HTTP.
- **[C] Double-booking on the happy path** — overlap check ignores REQUESTED and never re-checks on transition; outside the txn, no DB constraint (`bookings.service.ts:126,171,245`). → Include REQUESTED, re-validate in a transaction at APPROVE/ACTIVATE, add a DB-level guard.
- **[C] `payments.verify` cross-agency IDOR** — no tenant scoping (`payments.service.ts:31`). → Scope by `invoice.agencyId`; reject unless status `PENDING`.
- **[H] `expenses.update/remove` ignore agencyId** (`expenses.service.ts:49`). → Guard ownership by id+agencyId → 404.
- **[H] Invoices never reconciled** — stay DUE forever after payment verified (`payments.service.ts:43`, no `invoice.update` in src). → On verify, sum VERIFIED income vs invoice total in a txn, set PAID/PARTIAL/DUE.
- **[H] Identity hash brute-forceable** — plain unsalted SHA-256 of low-entropy CIN (`trust.service.ts:30`). → Use HMAC/KDF (scrypt/argon2); fail fast on missing pepper.

---

## PHASE 2 — Data foundation (requires DB decision)

- **[C] Datasource hardcoded to SQLite** — `DATABASE_URL` ignored, provider mismatch blocks `prisma migrate` (`schema.prisma:9`, `migration_lock.toml`). → `provider='postgresql'`, `url=env('DATABASE_URL')`.
- **[C] Pillar 6 has no migration** — migrations frozen at May; Trust Network absent (`schema.prisma:412`). → Regenerate migrations against Postgres incl. the trust models; verify `migrate deploy` on an empty DB.
- **[H] Money stored as Float** everywhere. → Convert money columns to `Decimal`/`NUMERIC(12,2)`; use a decimal lib in services; quantize VAT.
- **[H] Agency/Booking delete cascades into the GLOBAL trust graph** with no recompute (`schema.prisma:440`). → Soft-delete agencies; retain/anonymize authored reviews/flags; recompute affected identities.
- **[M] `BlacklistEntry.expiresAt` never enforced** → scheduled job flips ACTIVE→EXPIRED then recomputes.
- **[M] `IDENTITY_PEPPER` rotation silently breaks matching** → fail fast if unset; version the pepper + re-hash migration if ever rotated; document "never change."
- **[M] String pseudo-enums unconstrained + drifting** — seed uses `BANK_TRANSFER` not in the documented set. → Real enums or shared const + `@IsIn`; fix seed.
- **[M] `Task` has no agencyId** — global across tenants. → Add agencyId + index, backfill, scope queries.
- **[M] `recompute()` is non-transactional read-then-write** → wrap in txn / atomic aggregate; set `lastReviewAt=null` when no reviews.
- **[L] Seeds mutually destructive/unscoped; missing `updatedAt` on Payment/RefusalLog** → idempotent scoped seeds + NODE_ENV guard.

---

## PHASE 3 — Financial lifecycle (make money real)

- **[C] Revenue never realized** — every payment stays PENDING; no verify UI; invoice never PAID. → Payment-record/verify UI (owner/manager) + invoice reconciliation.
- **[C] Security deposits non-functional** — cannot take/hold/return/claim. → Capture at contract; HELD at hand-over; release (→RETURNED/refund) and claim (→CLAIMED + damage charge).
- **[M] No partial payments or refunds; review UI missing** — schema has PARTIAL/REFUND; `POST /trust/reviews` unused. → `POST /payments` (partial/refund + invoice update); "leave review" prompt on completion.
- **[M] VAT contradictory** across invoice/contract/payment (`bookings.service.ts:175`, `contracts.service.ts:43`). → Decide inclusive vs exclusive once; make taxAmount + collected Payment consistent.

---

## PHASE 4 — Rental lifecycle

- **[H] No return/damage flow** — return inspection decorative (`inspections.service.ts`, agent inspections mock). → Require POST_RENTAL inspection to complete; diff vs PRE_RENTAL; auto-charge mileage/fuel/damage.
- **[H] Contract e-sign unreachable/unguarded** — `contracts.controller.ts:24` no AuthGuard; UI labels unsigned as "signed". → Guard+scope; real signature-capture UI (schema has `signatureData`); gate ACTIVE on SIGNED.
- **[H] Overdue cron spams hourly WhatsApp + tasks, no late fee** (`automations.service.ts:65`). → OVERDUE state / notify once; append late-day charges; honor AutomationRule toggles; single-instance guard.
- **[M] Flat day-count pricing** — no tiers/discounts/seasonality/add-ons/km; partial days round up. → Rate tiers + seasonal windows + itemized extras on invoice/contract.

---

## PHASE 5 — Complete the roles (mock → real)

- **[H] AGENT role entirely mock, no backend** — tasks controller has 0 routes. → Build tasks controller + agent worklist; wire Operations/Task Board/Inspections.
- **[H] RENTER portal entirely mock, no backend** → renter profile/trust + my-bookings + booking-request endpoints; wire My Vault/Book/History.
- **[H] Owner Finance mock but backend exists** → wire ledger→`/expenses(+summary)`, pending→`/payments/pending`, add→POST, verify→PATCH. *(Quick win.)*
- **[M] Owner B2B Hub mock but `/hub/*` exist** → wire; replace external Unsplash images with hosted/generated assets.
- **[M] Admin sub-pages mock** (agencies/logs/pulse/provision/settings); impersonation (`ForensicService`) unwired → wire agencies→`saas-admin/overview`(+tier); platform audit feed + impersonation route; retire infra-theater or make real.
- **[M] Vault/Reports/Accidents/Fleet-map need new backends** → build or clearly label demo (no fake success toasts).
- **[M] Settings staff-removal 404s; Automations & AI-Vision half-real** → users controller (`DELETE /users/:id`); thin `/automations` controller over the cron; real vehicle picker for AI Vision.

---

## PHASE 6 — Performance & scalability

- **[C] Bookings list has no pagination** — loads bookings+cars+customers whole, filters in memory (`bookings.service.ts:217`, `useBookings`). → Server-side page/limit/status/date; lean selects; typeahead pickers; react-query.
- **[C] Analytics sum whole row-sets in JS; ERP loads ALL payments unbounded** (`analytics.service.ts:198`). → `prisma.aggregate`/`groupBy` in SQL.
- **[H] Command Centre embeds the whole customer directory** in the hottest endpoint (`analytics.service.ts:766`). → Dedicated paginated/typeahead endpoint; dashboard returns counts only.
- **[H] `trust.assess()` recomputes + writes on every read** (6 queries + a write) (`trust.service.ts:167`). → Drop recompute-on-read; trust cached aggregates.
- **[M] ~13 sequential awaited queries + unused eager includes** → batch in `Promise.all`; drop unused `maintenance:true`.
- **[M] Global search leading-wildcard LIKE, no index** (`search.service.ts:15`). → `startsWith` / FTS5 (SQLite) / trigram (Postgres).
- **[M] Missing indexes** — Payment `(invoiceId,status)` + date; Booking start/endDate.

---

## PHASE 7 — UX, Accessibility & i18n

- **[H] No mobile nav + hardcoded `ml-64`** — app unusable <1024px (`DashboardLayout.tsx:52`, `Sidebar.tsx:89`). → Off-canvas sidebar + hamburger + overlay; `ml-0 lg:ml-64`.
- **[H] Modal has no focus trap/Escape/ARIA/focus restore** (`ui/Modal.tsx:46`). → `role=dialog aria-modal`, Escape, Tab-trap, focus first field + restore.
- **[H] Booking modal discards data on optimistic submit** (`dashboard/page.tsx:141`). → Keep open with in-flight state; close on success; inline errors.
- **[H] No i18n/RTL for a Morocco product** — hardcoded English, en-US dates, `lang=en`. → next-intl, FR default + AR, drive lang/dir, route dates/numbers/currency through Intl.
- **[M] Sub-WCAG micro-typography** (8px labels, `text-white/10–20` meta). → Contrast floor: no functional text below ~white/60 or 11px.
- **[M] Dead buttons fire fake success toasts** (admin/finance/accidents/vault). → Disable with "Coming soon" or wire real.
- **[M] Chart hover-only (blank on touch/AT); placeholder-as-label forms; booking accepts past dates.** → Tap/focus reveal + SR table; real `<label>`s; `min` on date inputs.
- **[L] Combobox a11y; toast auto-dismiss; tables clip on mobile; login bundles seed password + false "AES-256" claim.**

---

## PHASE 8 — Testing & CI

- **[C] Zero backend unit tests** for money/trust/auth logic (only "Hello World"). → Jest + mocked Prisma on `trust.service` & `bookings.service` first.
- **[H] Blacklist enforcement boundary untested** → unit-test `isHardBlock`/`blockingFlagForCustomer` per severity/status; integration-test create() throws/allows.
- **[H] Identity hash untested** → golden-value tests pinning `hashIdentity`/`normalize`.
- **[H] Money math untested (Float/DST)** → pin diffDays/total/tax incl. DST range; compute day-count from UTC-midnight diff.
- **[H] ESLint rules disabled** — `react-hooks/rules-of-hooks` (frontend), `no-floating-promises` (backend). → Re-enable as errors; fix fallout.
- **[M] No CI** → GitHub Actions: both `test`, both `lint`, `tsc --noEmit`, Playwright — blocking on PR.
- **[M] Frontend tests validate mock data** → test extracted pure logic instead.
- **[M] E2E single-role, no authz/negative tests** → API tests: agency A → 403/404 on agency B.
- **[L] Backend tsconfig not strict** → move toward `strict:true`.

---

## PHASE 9 — DevOps & deploy (requires deploy-target decision + approval)

- **[H] No migrate-on-deploy, no volume, no backups** — restart destroys data; Dockerfile bakes `dev.db`. → Entrypoint `prisma migrate deploy`; managed Postgres + persisted volume + scheduled backups.
- **[H] PDF engine full Puppeteer** — won't run on Vercel, leaks Chromium on error, HTML-injects user input (`pdf-engine.service.ts`). → Pick runtime (puppeteer-core + @sparticuz/chromium for serverless / system chromium for Docker); try/finally close; HTML-escape fields.
- **[H] Two contradictory deploy targets; `NEXT_PUBLIC_API_URL` set at runtime** (Next reads at build) → choose one; build ARG; real `ALLOWED_ORIGINS`.
- **[M] No error tracking/APM/structured logging; no healthchecks** → Sentry/OTel + JSON logs w/ request IDs; container healthchecks; gate frontend on backend healthy.
- **[M] Cron no single-instance guard** → leader/env flag or DB advisory lock.

**GATE:** human approves the deploy target and the production go-live.

---

## PHASE 10 — Final human-judgment pass

- Run `/security-review` and `/code-review` on the full diff; re-run an 8-dimension audit; fix remaining criticals/highs.
- Regenerate this backlog; confirm every C/H is closed or explicitly deferred with rationale.

---

## Market-Ready Checklist (definition of done)

- [ ] No secrets/DB/build-output in git; history clean; secrets rotated & managed.
- [ ] AuthN/Z: no unguarded privileged endpoints; every business + trust route tenant/role-scoped; rate-limited; no IDOR.
- [ ] Data: Postgres, money as Decimal, all migrations apply on an empty DB incl. Pillar 6, enums/indexes in place.
- [ ] Money is real: verify → invoice reconcile → deposit take/hold/return/claim → partial/refund; VAT consistent.
- [ ] Full rental lifecycle: contract e-sign, hand-over & return inspection, damage reconciliation, overdue + late fees.
- [ ] Every role works end-to-end (ROOT_ADMIN, OWNER, MANAGER, AGENT, RENTER); no mock pages / no fake toasts.
- [ ] Performance: paginated lists, SQL aggregates, indexed hot paths — holds at 10k+ bookings.
- [ ] Accessible + responsive (mobile nav, dialog a11y, contrast) + i18n (FR default, AR/RTL).
- [ ] Tests: backend unit tests on money/trust/auth; multi-tenant authz E2E; ESLint strict; green CI gating PRs.
- [ ] Deploy: one documented target, migrate-on-deploy, backups, error tracking, healthchecks — deployed & smoke-tested.
