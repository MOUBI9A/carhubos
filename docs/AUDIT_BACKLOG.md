# CarHub / Infinity OS — Engineering Audit & Market-Readiness Backlog

> Produced 2026-07-17 by an 8-dimension senior-engineer review of the actual code.
> Severity: **C**ritical / **H**igh / **M**edium / **L**ow. Work top-down by phase.
> Definition of "done" for the program is the **Market-Ready Checklist** at the bottom.

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

## PHASE 12 — Design & Frontend Rebuild 🔄 IN PROGRESS ("Fider Lux"; see `docs/DESIGN_VISION.md`)

> Presentation-layer only — no backend, schema, or business-logic changes. Direction chosen via a 4-proposal design judge panel → synthesis ("Graphite & Brass — Concierge", 9.3). Method: restyle the `@theme` tokens + shared kit (propagates app-wide with stable APIs), then fan out per-portal restyle workflows (playbook → per-file → consistency critic), browser-verifying each portal.

- ✅ **[H] Design system foundation** (commit `46968f1`) — `globals.css` @theme: warm graphite surfaces, cream text, restrained violet + brass `metal` accent; Fraunces (display) + Hanken Grotesk (UI) + IBM Plex Mono via next/font; killed the global `uppercase font-black` heading rule → `.display`/`.eyebrow`; retuned `.glass`→warm solid (42 files inherit); `.document`/`.scrim`/`.seal-rule`/`.paper-grain`/`.metal-*`. Kit: Button cream primary + brass `premium`, CardTitle sentence-case, Badge `trust`.
- ✅ **[H] Imagery kit + swap slots** — `Avatar` (warm monogram, brass verified ring), `AgencyImage`/`CarPhoto` (warm placeholder + real-photo `src` slot + `fill`), `TrustSeal`/`SealDivider`. Real AI/stock photos drop into the slots later without layout changes.
- ✅ **[M] Brand-name cleanup** — `.btn-infinity*` + `.text-glow` retired to inert aliases (only 1 file referenced them).
- ✅ **[H] Public marketing + auth** (commit `44a59ef`) — editorial Fraunces hero + brass CTA, `.scrim` nav, warm pricing (featured tier brass), TrustConsole/Solutions token-cohered, photographic split-panel login/signup. Verified in-browser.
- 🔄 **[H] Owner dashboard (18 sections)** — restyle workflow running: calm sentence-case headings, warm KPI cards/tables, `CarPhoto` in fleet, `Avatar` for people, violet charts, ≤1 brass/viewport.
- ⬜ **[H] Agent / Admin / Renter portals** — same system; renter portal gets the `.document` cream trust-surface for consent/QR.
- ⬜ **[M] RTL-safe** — logical props (`ms-`/`me-`/`ps-`/`pe-`) baked in as each file is touched (for Phase 7 AR/RTL).

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
