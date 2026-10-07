# CarHub / Infinity OS — Engineering Audit & Market-Readiness Backlog

> Produced 2026-07-17 by an 8-dimension senior-engineer review of the actual code.
> Severity: **C**ritical / **H**igh / **M**edium / **L**ow. Work top-down by phase.
> Definition of "done" for the program is the **Market-Ready Checklist** at the bottom.

> **2026-10-07 authorization and localization verification:** reproduced and fixed the blocked-renter override bypass and whitespace-only reasons. Overrides require the current agency OWNER/MANAGER membership preset (or authenticated platform administrator), retaining booking.create and tenant-boundary checks. Nineteen backend regressions and six AR/FR/EN browser cases cover the change. The local API was rebuilt/restarted; eight real HTTP/PostgreSQL cases now verify denied/allowed bookings and financial persistence with verified temporary-fixture cleanup. Agent overview status accuracy, translated feedback/retry/empty states and mobile/RTL presentation have 12 additional deterministic browser cases. See [checkpoint](../progress/LOCALIZATION_CHECKPOINT.md) for the incomplete platform inventory and remaining audit/booking atomicity hardening. No deployment or reseeding occurred.

> **FOUNDER DECISIONS (2026-07-18):** VAT **inclusive** (price × 20/120). Subscription billing = **manual invoicing** (no Stripe; founder activates/marks-paid in the founder console). Plans = **free during beta** (build the full entitlements/metering/gating engine; keep limits open + prices as editable config; flip on later). i18n = **FR (default) + AR (RTL) + EN**. Trial = 14 days. Deploy target = deferred to the Phase 9 gate. Workflow = commit verified milestones directly to `main`.

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

> **STATUS: ✅ PHASE 1 CLOSED** — 6 parallel workers (disjoint files) + 4 adversarial verifier passes, all PASS; merged tree tsc-clean + 7/7 tests. On `main`.

- ✅ **[H] Bind the ThrottlerGuard** — `{provide:APP_GUARD,useClass:ThrottlerGuard}` bound; `@Throttle({default:{limit:5,ttl:60000}})` on register+login (global default 100/60s). *Deploy follow-ups (Phase 9): in-memory store → Redis for multi-replica; `trust proxy` for real client IP.*
- ✅ **[H] JWT secret fallback** — `|| 'carhub-v2-super-secret-key'` removed from `auth.module.ts` + `auth.guard.ts`; fail-fast throw at module load if `JWT_SECRET` unset (0 hits remain in src).
- ✅ **[H] Trust writes role-gated** — `@Roles('MANAGER','OWNER')` on blacklist create/lift, `@Roles('ROOT_ADMIN')` on backfill; audit persisted via `AuditLogsService`; assess/reviews/list stay open. Service-layer cross-agency `ForbiddenException` on lift still intact.
- ✅ **[C] Double-booking** — REQUESTED now blocks; overlap re-validated inside a `$transaction` (using the `tx` client, excludes own id, scoped by carId) at APPROVE/ACTIVATE → `ConflictException`. *DB-level exclusion constraint deferred to Phase 2 (Postgres). Regression test deferred to Phase 8 (no bookings test coverage yet).*
- ✅ **[C] `payments.verify` cross-agency IDOR** — scoped by `invoice.agencyId` → 404; rejects non-`PENDING` → 409.
- ✅ **[H] `expenses.update/remove` agencyId** — `findFirst({where:{id,agencyId}})` → 404 guard on both.
- ✅ **[H] Invoices reconciled** — on verify, in a `$transaction`, sum VERIFIED+INCOME payments (rounded cents) vs `invoice.amount` → PAID/PARTIAL/DUE. *Note: pre-existing VAT-modeling mismatch (contracts "incl. 20% VAT" vs Invoice additive `taxAmount`) flagged for Phase 3; does not affect reconciliation since Payment.amount == Invoice.amount == totalPrice.*
- ✅ **[H] Identity hash** — weak `sha256(pepper|cin)` + hardcoded fallback pepper → `HMAC-SHA256(IDENTITY_PEPPER, normalize(cin))`, fail-fast if pepper unset; golden test added. *Re-hash/backfill required before real data (ties to Phase 2 pepper-versioning).*

---

## PHASE 2 — Data foundation (requires DB decision)

> **STATUS: 🔄 IN PROGRESS.** DB decision = **local Docker Postgres** now, prod host at Phase 9. Postgres switch + money Decimal done & verified; remaining items below still open.

- ✅ **[C] Datasource hardcoded to SQLite** — switched to `provider='postgresql'`, `url=env('DATABASE_URL')`; 3 stale May migrations reset to one clean `init_postgres` (22 tables incl. Trust models). Verified: migrate deploy on empty DB, app boots + login + throttle on Postgres.
- ✅ **[C] Pillar 6 has no migration** — Trust models (RenterIdentity/RenterReview/BlacklistEntry/RefusalLog + AuditLog) now in the init migration.
- ✅ **[H] Money stored as Float** — 10 monetary columns → `Decimal @db.Decimal(12,2)`; decimal-safe service math (reconciliation in integer cents, VAT quantized 2dp); global `DecimalToNumberInterceptor` keeps the API/wire contract numeric. Verifier PASS; `pricePerDay` returns `350` (number) live. Non-money floats (currentRoi, globalScore) left Float. *Follow-up (Phase 8): reconciliation regression test.*
- ⬜ **[H] Agency/Booking delete cascades into the GLOBAL trust graph** with no recompute (`schema.prisma:440`). → Soft-delete agencies; retain/anonymize authored reviews/flags; recompute affected identities.
- ⬜ **[M] `BlacklistEntry.expiresAt` never enforced** → scheduled job flips ACTIVE→EXPIRED then recomputes.
- 🟡 **[M] `IDENTITY_PEPPER` rotation silently breaks matching** → fail-fast **done** (Phase 1); still TODO: version the pepper + re-hash migration if ever rotated; document "never change."
- ⬜ **[M] String pseudo-enums unconstrained + drifting** — seed uses `BANK_TRANSFER` not in the documented set. → Real enums or shared const + `@IsIn`; fix seed. (schema currently has 0 enums.)
- ⬜ **[M] `Task` has no agencyId** — global across tenants. → Add agencyId + index, backfill, scope queries.
- ⬜ **[M] `recompute()` is non-transactional read-then-write** → wrap in txn / atomic aggregate; set `lastReviewAt=null` when no reviews.
- ⬜ **[L] Seeds mutually destructive/unscoped; missing `updatedAt` on Payment/RefusalLog** → idempotent scoped seeds + NODE_ENV guard.

---

## PHASE 3 — Financial lifecycle (make money real) ✅ DONE (commit `1d4ec95`)

- **[C] Revenue never realized** ✅ — Finance UI wired to real `/expenses` + `/payments/pending` + `/payments/recent` + `/expenses/summary`; invoice reconciliation via integer-cents net-verified-income tracking.
- **[C] Security deposits non-functional** ✅ — `bookings/dto/deposit.dto.ts` + `BookingsService.captureDeposit/updateDeposit`: capture → HOLD (hand-over) → RETURN (release) or CLAIM (+ optional damage charge), `POST`/`PATCH :id/deposit`.
- **[M] No partial payments or refunds** ✅ — `payments.service.ts` refund reconciliation hardened (a refund can never exceed net verified income), `payments.service.spec.ts`. Review-prompt-on-completion still not wired (small, deferred).
- **[M] VAT contradictory** ✅ — resolved earlier (inclusive VAT, `taxAmount = total × 20/120`, consistent across invoice/contract/payment).

---

## PHASE 4 — Rental lifecycle ✅ DONE (commits `8032b47`, `1d4ec95`, `786dd0e`)

- **[H] No return/damage flow** ✅ — `inspections.service.ts` now diffs POST_RENTAL vs PRE_RENTAL (new damage entries + material fuel drop) and auto-raises a conservative damage charge on the invoice ONLY when a real cost signal exists on the damage entry (else a placeholder + explicit `MANUAL REVIEW REQUIRED` flag in the payment reference + AuditLog — never fabricates an amount). New booking-diff endpoint. `inspections.service.spec.ts` covers the key cases.
- **[H] Contract e-sign unreachable/unguarded** ✅ — `SignContractDto`, `contract.sign` capability, gate ACTIVE on SIGNED.
- **[H] Overdue cron spams hourly WhatsApp + tasks, no late fee** ✅ — spam fixed (the `status:'ACTIVE'` update-guard means it only fires once per booking); late fee now implemented in `BookingsService.updateStatus()` — an OVERDUE booking closed to COMPLETED is charged for every day past the scheduled return at the car's own `pricePerDay` (a real rate, never invented), same integer-cents reconciliation pattern as everywhere else, audited. `bookings.service.spec.ts` (3 tests, deterministic clock).
- **[M] Flat day-count pricing** ⬜ — rate tiers/seasonality/extras not started; lower priority, not in the Market-Ready Checklist verbatim.

---

## PHASE 5 — Complete the roles (mock → real)

- **[H] AGENT role entirely mock, no backend** — tasks controller has 0 routes. → Build tasks controller + agent worklist; wire Operations/Task Board/Inspections.
- **[H] RENTER portal entirely mock, no backend** → renter profile/trust + my-bookings + booking-request endpoints; wire My Vault/Book/History.
- **[H] Owner Finance mock but backend exists** → wire ledger→`/expenses(+summary)`, pending→`/payments/pending`, add→POST, verify→PATCH. *(Quick win.)*
- **[M] Owner B2B Hub mock but `/hub/*` exist** → wire; replace external Unsplash images with hosted/generated assets.
- **[M] Admin sub-pages mock** (agencies/logs/pulse/provision/settings); impersonation (`ForensicService`) unwired → wire agencies→`saas-admin/overview`(+tier); platform audit feed + impersonation route; retire infra-theater or make real.
- **[M] Vault/Reports/Accidents/Fleet-map need new backends** 🔄 — **Vault ✅ done**: new `GET /documents` (agency-wide) + wired to real `CarDocument` data, real HUD counts/search, honest states (no more fake "AES-256 encryption applied" toast). **Accidents**: no backend model exists; clearly labeled as not-wired (honest info toast) rather than built, given the scope of a new Accident model. Reports/Fleet-map not checked this pass.
- **[M] Settings staff-removal 404s; Automations & AI-Vision half-real** → users controller (`DELETE /users/:id`); thin `/automations` controller over the cron; real vehicle picker for AI Vision.

### 5A — Capability Engine ✅ DONE (catalog + AgencyMembership + CapabilitiesGuard + staff API + owner UI; verified E2E: owner 200/roster, agent 403, register creates membership, anti-escalation) — see PRODUCT_VISION §2–3

- **[H] Capabilities model** — introduce granular `Capability` (const catalog + `@IsIn`) and an `AgencyMembership` join (`userId`+`agencyId`+`capabilities` string[] + `role` preset label). Keep `User.role` as the identity-type/preset seed; enforcement moves to capabilities. Migration + backfill existing users' role→default capability set.
- **[H] Capability guard** — `@RequireCapabilities('booking.create', …)` + `CapabilitiesGuard` reading the caller's membership for `req.user.agencyId`, server-side, always tenant-scoped. Platform-tier capability set (`tenant.*`, `billing.manage`, `impersonate`, `platform.config`, `support.view`) for ROOT_ADMIN + new Platform Staff. Migrate existing `@Roles()` gates to capabilities (keep role checks only where identity-type is the real gate).
- **[H] Owner staff management UI** — owner creates staff, picks a preset ("Front desk", "Fleet manager", "Accountant"), edits exact capabilities per member; `DELETE /users/:id`; signed-invite path for staff (no open self-register into an existing agency).
- Agency catalog: `fleet.view/manage · booking.view/create/manage/return · customer.view/manage · finance.view · payment.record/verify · expense.manage · contract.manage/sign · deposit.manage · trust.report · inspection.perform · reports.view · hub.manage · staff.manage · settings.manage`.

### 5B — Renter portal + Consent/QR subsystem ✅ DONE (see PRODUCT_VISION §5)

Verified E2E in-browser as `renter@carhub.os`: the consent invariant holds — agency vault read is 403 (no grant) → 200 (renter approves, in-scope docs only) → 403 (renter revokes); non-renter is 403 on the portal. Commits `e5f3474`,`0a742a0` (backend), `7e2bbf9` (renter vault view + demo).

- **[H] Identity linkage ✅** — `User.renterIdentityId` ↔ global `RenterIdentity`, `Customer.userId` ↔ `User(role=RENTER)`. Seed links the demo renter to a TRUSTED identity. (Booking auto-link + signed portal-claim invite = deferred polish, not blocking.)
- **[H] Renter portal (real backend) ✅** — self-scoped `GET /portal/me` (profile+trust), `/portal/documents` (own vault), `/portal/bookings`, `/portal/notifications` (+`:id/read`), `/portal/consent` (+approve/revoke). `RenterGuard` (renter/root only); every query keyed on JWT `user.id`. UI: My Digital Vault (profile, Trust Network, QR badge, My Documents, Consent Center, notifications).
- **[C] Consent-grant subsystem ✅** — `ConsentGrant` (grantor/agency/scope[]/status PENDING→APPROVED→REVOKED|EXPIRED/expiresAt). Global renter-owned `RenterDocument` vault is the store consent governs. QR flow live: renter shows `qrHash` → agency `POST /agency/consent/request` (scoped) → renter approves in portal → agency `GET /agency/consent/documents/:renterUserId` returns a **time-boxed (7d), revocable, scope-filtered** view. Verifier-caught & fixed: the gate was decorative (read the agency's own Customer docs) — now reads the distinct global vault. `@Cron` expiry sweep.
- **[M] Notifications model ✅** — `Notification` model + portal bell/mark-read; consent request/approve/revoke notify the counterparty. (WhatsApp channel = optional later.)

---

## PHASE 6 — Performance & scalability ✅ DONE (commits `1d4ec95`, `786dd0e`, `39ecc45`)

- **[C] Bookings list has no pagination** ✅ backend, ⬜ frontend adoption — `GET /bookings` now accepts optional `status/from/to/page/pageSize`; omitted, it returns the same flat array as before (zero risk to today's UI). Passing them moves filtering to SQL `WHERE`+`skip/take`, returning `{items,total,page,pageSize}`. The frontend bookings page doesn't send these yet — adopting the paginated shape in the UI is a follow-up.
- **[C] Analytics sum whole row-sets in JS; ERP loads ALL payments unbounded** ✅ — `analytics.service.ts` converted to `prisma.aggregate()`/`groupBy()` across the hot paths (command centre, financial pulse, ERP dashboard); same response shape.
- **[H] Command Centre embeds the whole customer directory** ✅ — bounded to the 200 most-recent customers; `totalCustomers` stays the true count; modal falls back to `GET /customers?search=` typeahead for larger books.
- **[H] `trust.assess()` recomputes + writes on every read** ✅ — removed; every mutation already keeps the cached aggregates fresh, `assess()` now reads them directly.
- **[M] ~13 sequential awaited queries + unused eager includes** ⬜ — not addressed this pass.
- **[M] Global search leading-wildcard LIKE, no index** ✅ — `search.service.ts` now uses `startsWith`.
- **[M] Missing indexes** ✅ — migration `20260720125819_hot_path_indexes`: `Payment(invoiceId,status)`, `Payment(date)`, `Booking(startDate,endDate)`.

---

## PHASE 7 — UX, Accessibility & i18n — foundation done, screen coverage incomplete

**2026-10-07 verification:** see [localization checkpoint](../progress/LOCALIZATION_CHECKPOINT.md). Finance, command centre and shared-shell fixes have FR/AR/EN regression coverage, including desktop/mobile Arabic RTL; logged-out public-agency access is fixed. The command centre's fake renewal-task success is now a real API call; chart visibility and French mobile overflow are fixed. A literal-source scan still identifies 909 candidates in 40 files (with false positives and dynamic-string omissions). Earlier foundation checks below are not certification of complete translations or accessibility on every screen.

**Acceptance continuation:** warning-only badges, keyboard KPI/compliance controls, Arabic plate isolation and login labels/error feedback are now fixed. Walk-in/booking validation and retries, empty/error dashboard, and credential/rate-limit/service/network login failures have deterministic tests in all three languages (50 total fixture cases across the current suites). Separately, 15 real UI login/session/routing checks cover all five existing seeded roles in AR/FR/EN. These do not certify complete role portals or live booking/payment transactions.

- **[H] No mobile nav + hardcoded `ml-64`** ✅ — off-canvas sidebar + hamburger + overlay landed earlier.
- **[H] Modal has no focus trap/Escape/ARIA/focus restore** ✅ — landed earlier.
- **[H] Booking modal discards data on optimistic submit** ✅ (commit `6fa50a1`) — submit button shows in-flight state; modal closes only on success, stays open with data intact on error for correct-and-retry.
- **[H] No i18n/RTL for a Morocco product** ✅ — next-intl FR(default)/AR(RTL)/EN, Noto Sans Arabic, `lang`/`dir` driven by locale, Intl date/currency helpers.
- **[M] Sub-WCAG micro-typography** ✅ — the Phase 12 token migration replaced the old white/10-20 opacity ladder; a final grep sweep for sub-20%-opacity text returned 0 hits app-wide.
- **[M] Dead buttons fire fake success toasts** ✅ — audited every `showToast('success', ...)` on admin/finance/accidents/vault: `admin/agencies` calls were real (verified — genuine `/saas-admin/*` calls); `admin/provision`'s "Instantiate tenant" and `accidents`' "Report incident"/"Export PDF" were fake (no backend, fabricated client-only data) — changed to honest info toasts; `finance` and `vault` were fixed earlier this program (wired to real data).
- **[M] Chart hover-only (blank on touch/AT); placeholder-as-label forms; booking accepts past dates.** ✅ — chart tap/focus + SR table equivalents done across all four data-bearing chart surfaces (T1). Booking past-date rejection landed earlier.
- **[L] Combobox a11y; toast auto-dismiss; tables clip on mobile; login bundles seed password + false "AES-256" claim.** 🔄 — the AES-256 claim on `/login` was already gone; a second one on `/admin/provision` found + softened. The rest of this line not audited.

---

## PHASE 8 — Testing & CI ✅ mostly DONE (commits `d2fef80`, `cb86fd4`, `7e32814`, `656bc40`)

- **[C] Zero backend unit tests** for money/trust/auth logic ✅ — money/trust/consent/deposits/inspections/late-fee all have specs; **auth + capability guard specifically** (`auth.guard.spec.ts`, `auth.service.spec.ts`, `capabilities.guard.spec.ts`) were the last gap, now closed (24 new tests across the three files).
- **[H] Blacklist enforcement boundary untested** ✅ (commit `d853dec`) — `trust.blacklist-boundary.spec.ts`: CRITICAL/HIGH hard-block, LOW/MEDIUM don't, CRITICAL wins when both present, cross-tenant lookup returns null.
- **[H] Identity hash untested** ✅ — golden-value + normalization tests already in `trust.identity.spec.ts`.
- **[H] Money math untested (Float/DST)** 🔄 — money math is well-covered across the newer specs (deposits/refunds/late-fee/damage-charge, all integer-cents); a dedicated DST-range day-count test isn't written.
- **[H] ESLint rules disabled** ✅ — both flipped to `error`. Real fallout (after excluding `dist/`/`prisma/*.js` lint noise): frontend 0, backend 1 (fixed: `main.ts` bootstrap now `.catch()`-handled).
- **[M] No CI** ✅ — `.github/workflows/ci.yml`: backend (`prisma generate`→tsc→jest→eslint) + frontend (tsc→vitest→eslint), on `pull_request`+`push:main`. Making it a *required* PR check needs a repo-admin action (Settings → Branches) — flagged for the founder, not done unasked. No live-DB/Playwright e2e job yet (needs a Postgres service container).
- **[M] Frontend tests validate mock data** ⬜ — not audited this pass.
- **[M] E2E single-role, no authz/negative tests** ✅ partial — `common/multi-tenant-boundary.spec.ts` covers **10 domains**: bookings/customers/documents/inspections/expenses/contracts/hub/cars/maintenance + **payments.verify** (the load-then-check IDOR variant — find by id alone, then scope by invoice.agencyId), agency A → 404 on agency B's resource; unit-level (mocked Prisma), not a live-DB E2E suite.
- **[L] Backend tsconfig not strict** ✅ (commit `26e0a79`) — `strict: true` enabled (noImplicitAny/strictPropertyInitialization kept off for the established DTO/any-param patterns); 3 catch-block `error is unknown` fallouts fixed.

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

## PHASE 11 — SaaS Business Layer ✅ DONE (the money side; see PRODUCT_VISION §4)

> Manual billing per founder decision (no Stripe during beta); free-during-beta with the real engine live. Verified E2E in-browser + adversarial API tests. Commits `7b7a257` (schema) · `0f30c70` (entitlements) · `c89566f` (metering) · `4851449` (founder console) · `06e6766` (impersonation) · `88dfeab` (billing UI + banner) · `50f32df` (metrics + agencies console).

- ✅ **[C] Subscriptions & billing** — `Plan` / `Subscription` (one per agency, lifecycle TRIAL→ACTIVE→PAST_DUE→SUSPENDED→CANCELED) / `PlatformInvoice`. **Manual** founder invoicing (FIDER-YYYY-#### numbers, issue + mark-paid, audited, double-pay guard) — Stripe deferred. Agency billing page (`/dashboard/billing`): plan, status, usage meters, invoices. *(Live Stripe wiring = future, human-gated.)*
- ✅ **[C] Plans & entitlements gating** — `EntitlementsService` (`src/entitlements/`) the app checks: `getEntitlements`/`hasFeature`/`getUsage`/`assertWithinLimit`/`assertOperating`; fail-open to BETA. Catalog `src/common/plans.ts` (BETA unlimited/free/all-features; STARTER 15/2/150 ~299; PRO 50/8/1000 ~799; BUSINESS ∞ ~1999 MAD). `GET /platform/plans` public.
- ✅ **[H] Self-serve onboarding funnel** — `register()` provisions a BETA subscription (14-day trial) in the same txn as the OWNER membership. *(Guided first-run + signed staff-invite = later polish.)*
- ✅ **[H] Usage metering & limit enforcement** — `assertWithinLimit` wired into cars/staff/bookings create → 403 `PLAN_LIMIT_REACHED` {limit,current,planKey}; unlimited (BETA) no-op. Adversarially verified (STARTER maxCars=3 with 4 cars → 403).
- ✅ **[H] Tenant lifecycle & dunning** — `assertOperating` blocks SUSPENDED/CANCELED writes (`SUBSCRIPTION_SUSPENDED`); PAST_DUE is a grace window. Founder can force status in the console.
- ✅ **[H] Founder metrics** — `/admin` Business Metrics band + `GET /saas-admin/metrics`: MRR/ARR, active tenants, trials, trial→paid, churn, plan/status distribution (business, not rental GMV).
- ✅ **[H] Support & impersonation** — `ForensicService` fixed (was broken: signed `userId`, no expiry, unwired) → proper 30-min token (sub/role/agencyId + isImpersonated/impersonatorId), refuses impersonating a ROOT_ADMIN, audited. `POST /saas-admin/agency/:id/impersonate` + `POST /auth/exit-impersonation` + a sticky support banner. Verified round-trip in-browser.
- ✅ **[M] Platform-level audit** — SUBSCRIPTION_UPDATE, PLATFORM_INVOICE_ISSUE/PAID, IMPERSONATE_START via `AuditLogsService`.
- ⬜ *Follow-ups (not blocking):* public pricing section on the landing; upgrade-prompt UI for `PLAN_LIMIT_REACHED` (never fires during beta); Stripe wiring (human-gated, post-beta).

---

## PHASE 12 — Design & Frontend Rebuild ✅ essentially DONE ("Fider Lux"; see `docs/DESIGN_VISION.md`)

> Presentation-layer only — no backend, schema, or business-logic changes. Direction chosen via a 4-proposal design judge panel → synthesis ("Graphite & Brass — Concierge", 9.3). Method: restyle the `@theme` tokens + shared kit (propagates app-wide with stable APIs), then fan out per-portal restyle workflows (playbook → per-file → consistency critic).

- ✅ **[H] Design system foundation** (commit `46968f1`) — `globals.css` @theme: warm graphite surfaces, cream text, restrained violet + brass `metal` accent; Fraunces (display) + Hanken Grotesk (UI) + IBM Plex Mono via next/font; killed the global `uppercase font-black` heading rule → `.display`/`.eyebrow`; retuned `.glass`→warm solid (42 files inherit); `.document`/`.scrim`/`.seal-rule`/`.paper-grain`/`.metal-*`. Kit: Button cream primary + brass `premium`, CardTitle sentence-case, Badge `trust`.
- ✅ **[H] Imagery kit + swap slots** — `Avatar` (warm monogram, brass verified ring), `AgencyImage`/`CarPhoto` (warm placeholder + real-photo `src` slot + `fill`), `TrustSeal`/`SealDivider`. Real AI-generated hero photography dropped in (commit `10fddb0`).
- ✅ **[M] Brand-name cleanup** — `.btn-infinity*` + `.text-glow` retired to inert aliases.
- ✅ **[H] Public marketing + auth** (commits `44a59ef`, `10fddb0`) — editorial Fraunces hero + brass CTA + real photography, `.scrim` nav, warm pricing, photographic split-panel login/signup. The public-site **footer** was missed in this pass and found/fixed in a later audit (`19ef4fd`).
- ✅ **[H] Owner dashboard + Agent/Admin/Renter portals** (commits `bce191e`, `19ef4fd`, `78aa8fd`) — **`font-black` is 0 files app-wide**, confirmed by grep sweep after all work landed. Flagship renter portal page done (was the hardest file, failed twice on earlier attempts): calm heading, `Avatar verified`, QR/documents on the cream `.document` trust surface, `TrustSeal` as the one brass mark.
- 🔄 **[M] 3 small style-map files still have raw colors** — `bookings/types.ts`, `staff/capabilities.ts`, `(renter)/portal/types.ts` export `Record<Status,{className}>` maps with a few un-migrated `text-white`/`bg-white/` strings (not JSX, low risk). Plus 2 cosmetic `text-white` spots in `finance/page.tsx` (should be `text-primary-foreground`) reintroduced by a later unrelated edit to that file. ~15 min to close — see `PROGRESS.md` §1.
- ✅ **[M] RTL-safe** — logical props (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) applied throughout as files were touched.

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
