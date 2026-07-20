# PROGRESS — CarHub / "Fider" market-readiness

> Living handoff for resuming the build. Source-of-truth docs: **`docs/AUDIT_BACKLOG.md`** (phased task list) + **`docs/PRODUCT_VISION.md`** (target product) + **`docs/DESIGN_VISION.md`** (target frontend/design, Phase 12) + **`CLAUDE.md`** (project guide). This file is the "where we are right now" snapshot.
> **STOPPED CLEANLY on user request at commit `78aa8fd`.** Tree is 100% clean (`git status` empty), `backend` tsc clean + jest **7 suites/43 tests green**, `frontend` tsc clean + vitest **9/9 green**. Say "keep going" to resume — this file has the exact punch-list.

## ⚠️ Important: another AI is also working this repo

`.codex/agents/*.toml` + root `AGENTS.md` + `GEMINI.md` show a **Codex CLI worker fleet** (mirroring this project's own supervisor→worker→verifier model) is being run against this same repo, likely by the user in a separate terminal. During this session it was **actively, live-editing `backend/src/bookings/*` and `backend/src/payments/*`** (building the deposit lifecycle + refund reconciliation) while this session worked — confirmed by watching files change mid-read. Its output was reviewed and is included in commit `1d4ec95` (verified: tsc clean, jest green, money-safety spot-checked).

**Before writing to `backend/src/bookings/*`, `backend/src/payments/*`, or any file, run `git status` first** — if it shows unexpected modifications not from this session, another process may be active. Don't blind-edit a file that's mid-write elsewhere; `tsc`/`jest`/`vitest` all green is a fast way to confirm the tree is currently stable before continuing.

## The goal
Take this multi-tenant car-rental SaaS from demo → market-ready. B2B SaaS: the **founder** (ROOT_ADMIN) runs the platform; **agencies** (OWNER + staff) are paying subscribers; **renters** are end users. Plus the hardening phases 0–10 and the Phase 12 design rebuild. Done = the **Market-Ready Checklist** at the bottom of `docs/AUDIT_BACKLOG.md`.

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
**Backend tests run via `jest`** (`cd backend && npx jest`) — **frontend tests run via `vitest`, NOT jest** (`cd frontend && npx vitest run`) — running `jest` in `frontend/` gives a misleading babel parse error, not a clear "wrong runner" message.

## DONE (committed to `main`, verified — tsc/jest/vitest green at every commit)
- **Phase 0** security — secrets purged/rotated, history scrubbed, register privilege-escalation closed.
- **Phase 1** correctness/authz — throttling, JWT fail-fast, trust role-gating, payments/expenses IDOR fixes, invoice reconciliation, double-booking guard, HMAC identity hash.
- **Phase 2** data foundation — Postgres, money Decimal(12,2) + interceptor, soft-delete, trust-cascade, idempotent seeds.
- **Phase 3 — financial lifecycle** ✅ (commit `1d4ec95`): security deposits (capture → HOLD at hand-over → RETURN/CLAIM with optional damage charge, `backend/src/bookings/dto/deposit.dto.ts` + `BookingsService.captureDeposit/updateDeposit`, `POST`/`PATCH :id/deposit`); partial-payment/refund reconciliation hardened (refund can never exceed net verified income, integer-cents math, `payments.service.spec.ts`). Finance UI (`(owner)/dashboard/finance/page.tsx`) wired to real `/expenses` + `/payments/pending` + `/payments/recent` + `/expenses/summary` (was hardcoded mock data — fixed in `6b6fdfa`/`66c2095`, extended further by the concurrent Codex process).
- **Phase 4 — rental lifecycle** ✅ mostly (commits `8032b47`, `1d4ec95`): OVERDUE booking state + legal transitions + hourly cron (spam-guarded via the `status:'ACTIVE'` update guard), contract e-sign (`SignContractDto`, `contract.sign` capability, gate on SIGNED), **inspection return/damage flow** — `backend/src/inspections/inspections.service.ts` now diffs POST_RENTAL vs PRE_RENTAL (new damage entries + material fuel drop) and auto-raises a conservative damage charge on the invoice **only when a real cost signal exists** on the damage entry, else charges a placeholder (default 0) and flags `MANUAL REVIEW REQUIRED` in the payment reference + AuditLog — money is never fabricated. New `GET` booking-diff endpoint. `inspections.service.spec.ts` covers no-baseline / clean / new-damage / tenant-scoping.
  - **Still open**: **late fees** (not implemented — needs `bookings.service.ts`, which was the concurrent process's hot file all session; safe to tackle now that it's stable/committed). Rate tiers/seasonality/extras — not started, lower priority (not in the Market-Ready Checklist verbatim).
- **Phase 5A/5B** ✅ capability engine + renter portal/consent (see backlog for detail — unchanged this session).
- **Phase 6 — performance** ✅ (commit `1d4ec95`): `trust.service.ts` no longer recomputes-on-read in `assess()` (every mutation already keeps the cached aggregates fresh — removed the redundant 3-query transaction per read); `analytics.service.ts` converted ~15 unbounded `findMany`+JS-`.reduce()` sums to `prisma.aggregate()`/`groupBy()` across the hot paths (command centre, financial pulse, ERP dashboard — same response shape, no full-table loads); `common/search/search.service.ts` now uses `startsWith`; new migration `20260720125819_hot_path_indexes` (additive-only: `Booking(startDate,endDate)`, `Payment(invoiceId,status)`, `Payment(date)`).
  - **Still open**: bookings-list server-side pagination (`bookings.service.ts` still loads all + filters in memory) — deliberately deferred, same collision-risk file as above.
- **Phase 7 — i18n** ✅ foundation (commit `322e6a5`): next-intl FR(default)/AR(RTL)/EN, `messages/{fr,ar,en}.json`, `LocaleSwitcher`, Noto Sans Arabic, `html lang/dir` driven by locale, Intl date/currency helpers (`lib/format.ts`/`useFormat.ts`). Login's false "AES-256 JWT ENCRYPTION" claim was already gone; found and softened a second unverifiable claim on `/admin/provision` (commit `19ef4fd`).
  - **Still open**: contrast floor audit, dead-button fake-success-toast audit (found one on `vault/page.tsx` — see below), chart tap/focus + SR table — not verified this session.
- **Phase 11 — SaaS Business Layer** ✅ complete (see backlog — unchanged this session).
- **Phase 12 — Design & Frontend Rebuild "Fider Lux"** ✅ essentially complete:
  - Foundation (`46968f1`) — warm graphite/cream `@theme` tokens, Fraunces/Hanken/Plex Mono, killed the blanket `uppercase font-black` rule, imagery kit (`Avatar`/`AgencyImage`/`CarPhoto`/`TrustSeal`/`SealDivider`).
  - Public marketing + auth (`44a59ef`) + real AI-generated hero photography (`10fddb0`).
  - Owner dashboard + agent/admin/renter portals (`bce191e`, `19ef4fd`, `78aa8fd`) — **font-black is now 0 files app-wide** (confirmed by grep sweep, twice, after all workflows landed). The flagship renter portal page (failed twice on earlier attempts) is done: calm heading, `Avatar verified`, the QR badge/My-Documents cards on the cream `.document` trust surface with `TrustSeal` as the one brass mark. The public-site **footer** (`(public)/layout.tsx`) was found still fully on the old system in this session's audit and fixed. Billing page got a final polish pass (sentence-case titles, decorative violet → neutral, photographic empty state).
  - **Still open (small, ~15 min of work)**: 3 style-map `.ts` files still carry a few raw-color classNames (not JSX, just exported `Record<Status,{className}>` maps) — `frontend/src/app/(owner)/dashboard/bookings/types.ts`, `frontend/src/app/(owner)/dashboard/staff/capabilities.ts`, `frontend/src/app/(renter)/portal/types.ts`. Also `finance/page.tsx` has 2 `text-white` (should be `text-primary-foreground`) on the ledger/pending tab pills — cosmetic, reintroduced by the concurrent process's later edit to that file, harmless.
  - The whole-frontend **completeness critic pass never ran** (workflow was stopped before that stage) — worth a final look before declaring Phase 12 100% done, though the grep sweep above is a strong signal it's clean.

## LEFT TO DO (in order)

### 1. Quick Phase 12 cleanup (~15 min)
Fix the 3 style-map `.ts` files + the 2 `text-white` spots in `finance/page.tsx` listed above. Then run one whole-frontend critic pass (grep for `font-black|text-white\b|bg-white/|amber-[45]00|red-500|green-500` across `frontend/src/app` — should return 0 outside `globals.css`'s inert legacy aliases) to formally close Phase 12.

### 2. Phase 4 remainder — late fees + bookings pagination
Both need `backend/src/bookings/bookings.service.ts`, which is now stable/committed (safe to touch). Add: OVERDUE→COMPLETED late-fee calculation (days overdue × a rate — mirror the deposit-CLAIM / inspection-auto-charge money pattern: transaction, integer cents, AuditLog, never fabricate an amount without a real rate signal) and server-side pagination on the bookings list (currently loads all + filters in memory).

### 3. Vault page — still mock data
`frontend/src/app/(owner)/dashboard/vault/page.tsx` renders a hardcoded `useState([...])` array, not real data, and its upload handler fires a fake success toast. The backend `documents`/`CarDocument` model+module already exists — wire this page to it (same pattern as the `finance` page fix in `6b6fdfa`: real `useEffect`+`api.get`, real mutations, remove the fake toast). This is a genuine "mock page" / "fake toast" Market-Ready Checklist item.

### 4. Phase 7 rest — verify, don't assume
Contrast floor, remaining dead-button fake toasts (admin/finance/accidents were the other flagged pages — finance is now real; check admin + accidents), chart tap/focus + screen-reader table equivalents. i18n foundation is solid; this is about the smaller a11y/honesty items around it.

### 5. Phase 8 — tests + CI (not started)
Backend unit tests on auth + capability guard specifically (money/trust/consent/deposits/inspections now have decent coverage — see `*.spec.ts` files). Multi-tenant authz E2E (agency A → 403/404 on agency B's resources, for every domain). Re-enable ESLint `react-hooks/rules-of-hooks` + `no-floating-promises` as errors, fix fallout. GitHub Actions CI (tsc + jest + vitest + lint) blocking on PR.

### 6. Phase 9 — deploy (HUMAN GATE — do not start without the founder)
Deploy target/host decision, migrate-on-deploy, managed Postgres + backups, PDF engine runtime (Puppeteer needs a real server, not serverless), error tracking/healthchecks.

### 7. Phase 10 — final pass (do last, once 4/6/7/8 above are done)
`/security-review` + `/code-review` on the full diff since Phase 0; re-run the market-readiness checklist; close or explicitly defer every remaining item.

## Workflow-tool runs this session (for reference — none need resuming)
Three Workflow-tool runs happened this session; all their substantive output is already committed:
- **Frontend Phase-12-finish** (`wf_2bf50d32-1a9`) — stopped via `TaskStop` mid-flight; 10/15 files landed + committed in `19ef4fd`. Only the 3 type-map files + a final critic pass never ran — see §1 above (15-min manual fix, simpler than resuming).
- **Backend hardening** (`wf_7b9d62fd-bff`) — stopped via `TaskStop` mid-flight; all 5 implement tasks landed + committed in `1d4ec95`. Only the adversarial-verify/critic stages never ran — this session hand-verified the two risky pieces (inspection auto-charge, trust fix) directly instead.
- **Agent/admin/renter portals** (`wf_77b83d3c-cd3`) — this one was a *straggler*: launched much earlier in the session (during the "Try again" resume), it kept running in the background through the entire subsequent investigation and was never explicitly stopped. It **completed naturally** (13/13 agents, 0 errors) and its notification arrived after everything else was already committed — one leftover file (`billing/page.tsx` polish) was verified and committed separately in `78aa8fd`. Nothing to resume.

**Lesson for next time**: `TaskStop` only stops workflows you still have the task ID for. If a workflow's completion notification hasn't arrived yet, it's still running even if you've moved on to other work — check for older un-processed task IDs before assuming everything is stopped.

## Open questions / mid-debugging
- None blocking — tree is clean, both test suites green. The only genuine ambiguity is whether the Codex CLI process is still running when a future session resumes; check `git status` first.
