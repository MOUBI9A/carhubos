# MASTER BACKLOG — Fider / CarHub (audit snapshot 2026-07-21, `f810e7c`)

> **The consolidated, prioritized list of what's left** — needed features, fixes,
> tests, and the ordered plan — built from a fresh read-only audit (6 auditors)
> cross-checked against `COORDINATION.md` findings, `EXECUTION_PLAN.md` tasks,
> `project_status.md`, and `docs/AUDIT_BACKLOG.md`.
>
> **Relationship to the other docs:** `EXECUTION_PLAN.md` = the live T-task tracker
> (fleet-maintained). `COORDINATION.md` = the ongoing board + reviewer→executor
> findings. **This file = the fuller picture + newly-found gaps + the tomorrow
> plan.** When you fix something here, tick it and note the commit. If it's not
> already a numbered finding, you don't need to file it — just work top-down.
>
> **Verified baseline** (last clean, per `project_status.md`): jest **24 suites /
> ~196 tests** green, vitest 9 green. Two engineering cohorts + a Media team have
> been active; **`~/Desktop` is Google-Drive-synced → always `git fetch` and
> trust origin, never local mtimes.**

---

## 0. START HERE TOMORROW (two agents)

1. Paste **`docs/AGENT_PROMPTS.md` → Prompt A** into the **Claude MAX** account
   (Executor/Architect — builds), **Prompt B** into the **Claude PRO** account
   (Reviewer/QA — tests + findings). Start MAX first; start PRO after MAX's first push.
2. Each self-selects model + effort per task (cheap models for cheap work, Opus +
   high effort only for hard/risky work) and **auto-stops at ~85% usage**, pushing
   everything green and writing a "PAUSED — RESUME HERE" block in `COORDINATION.md`.
3. Both: `git fetch && git rebase origin/main` before touching anything; `git add
   <specific files>` never `-A`; verify before commit; findings via
   `COORDINATION.md` "Open findings".

---

## 1. STATE SNAPSHOT

**Done** (Phases 0–8, 11, 12 + recent): security, correctness/authz, Postgres +
Decimal money, financial + rental lifecycle, capability engine, renter
portal/consent, performance (SQL aggregates, indexes, bookings pagination),
a11y/i18n, SaaS billing, "Fider Lux" design. Recent fleet wins: chart a11y ×4
surfaces (`8c38e03`), MRR/ARR Decimal fix (`e9e32d0`), `/public/fleet` bounded
(`dcc7000`), hub wiring (`748aed5`), **webhooks SSRF closed** (`460a8a6`),
soft-delete re-provisioning fix (`10aa7d5`), email normalization ×4 entry points,
customers spec (`3dd6200`).

**⚠️ IN-FLIGHT tonight — RECONCILE FIRST tomorrow (uncommitted on the working tree):**
- **T3 Accidents (Architect):** backend built — `backend/src/accidents/**`, `schema.prisma`,
  migration `20260721213211_add_accident/`, `app.module.ts`, `accidents.service.spec.ts`.
  **Frontend `accidents/page.tsx` NOT wired yet** (still the mock + honest "not wired" toast).
- **T4 live-DB e2e (Session C):** `backend/test/tenant-isolation.e2e-spec.ts` written,
  **but `ci.yml` has no Postgres-service job to run it.**
- Also loose: `frontend/_tmp_shoot.mjs` (temp), Media team commits **local, not pushed**.
- **Step 1 tomorrow = `git status`; if these landed, verify green; if half-done, finish/commit them before new work.**

---

## 2. FIXES (bugs & hardening) — priority order

### 🔴 P0 — HIGH severity, do first
| # | Bug | Where | Fix | Eff |
|---|---|---|---|---|
| F1 | ✅ **DONE (`e3e9b2f`, Architect; independently re-verified live by QA — R11).** Cross-tenant IDOR (read *and* write) — `GET /analytics/car/:id` never scopes by `agencyId`. `getCarPerformance` `car.findUnique({where:{id}})` returns another tenant's car + all bookings/maintenance; `calculateCarRoi(carId)` reads unscoped **and `car.update({where:{id}})` writes ROI to another tenant's row via a GET.** | `analytics/analytics.service.ts:15,46,108` · `analytics.controller.ts:39` | `getCarPerformance` → `car.findFirst({where:{id,agencyId}})` (404 if absent); thread verified `agencyId` into `calculateCarRoi` so its read (`:15`) and write (`:46`) use `where:{id,agencyId}` (use `updateMany` for the guarded write, like `tasks.service.ts:56`). Internal callers already pass scoped ids. | S |

### 🟠 P1 — validation bypasses + an honesty violation
| # | Bug | Where | Fix | Eff |
|---|---|---|---|---|
| F2 | ✅ **DONE (`5b08423`, QA Tester — R12).** `create(@Body() data: any)` → spread into `prisma.refusalLog.create` = **mass-assignment**, no validation on enum-likes (`requestedCarType`, `status`) or Decimal `potentialRevenue` | `refusal-logs.controller.ts:20` · `refusal-logs.service.ts:8` | Add `CreateRefusalLogDto` (`@IsIn`, `@IsNumber` on money) | M |
| F3 | ✅ **DONE (`73ac5e1`, QA Tester — R13), except `category` is deliberately unconstrained — see new finding #10.** Create/update typed with an **inline TS type** (erased at runtime → pipe can't validate). Money `amount` has no `@IsNumber/@IsPositive`; `category`/`status` unconstrained | `expenses.controller.ts:17,39` | Add `CreateExpenseDto`/`UpdateExpenseDto` | M |
| F4 | **Fake-success toast** — `POST /automations` 404s (backend has **no controller**, only cron service), catch branch invents a rule + fires `showToast('success','Rule Constructed',…)`. Violates the honesty invariant | `automations/page.tsx:131-149` (+ `SYSTEM_RULES` mock `:68`) | Either build the automations controller (see §3) or make the page honest ("not wired") until it exists | M |
| F5 | 🟡 **`refusal-logs` half DONE (`5b08423`, R12); `saas-admin.controller.ts:57`'s `@Body('tier')` still open** — different domain (billing/tier change), left for whoever owns it. `@Body('status')`/`@Body('tier')` raw strings, unvalidated enums | `refusal-logs.controller.ts:40` · `saas-admin.controller.ts:57` | `@IsIn` DTO or inline guard | S |
| F6 | `@Body('carId')` not `@IsUUID` (low impact — service scopes ownership) | `ai-vision.controller.ts:29` | `@IsUUID` | S |

### 🟡 P2 — mock/fake admin pages (auth-gated but actively mislead)
Each renders hardcoded data / no-op buttons behind a "real" label. Either wire to a real endpoint (see §3) or make honest.
| Page | What's fake | Eff |
|---|---|---|
| `admin/pulse/page.tsx:22-38,143` | Whole "Global Pulse" god-mode: `INFRA_HEALTH/METRICS/DB_THROUGHPUT`, `Math.random()` charts; Export/Sync/Audit buttons no-op | L |
| `dashboard/reports/page.tsx:24-83,219,238` | "Report Factory" fake `Math.random()` progress, no-op Download, hardcoded history | L |
| `dashboard/fleet-map/page.tsx:27-31,150` | Hardcoded `ghostCars` GPS/telemetry + fake AI ETA; no telemetry infra exists | L |
| `admin/settings/page.tsx:44,56,127` | All controls decorative incl. a no-op **"Hard Reset All Tenants"** | L |
| `admin/logs/page.tsx:27-32` | Hardcoded logs; real `audit-logs` is **agency-scoped** — SuperAdmin platform view has no endpoint | L |

### 🟡 P2 — unbounded list endpoints (add `take`/pagination; `orderBy` present, no cap)
`cars.service.ts:62` (M) · `customers.service.ts:70` (default path unbounded; pagination is opt-in — S) · `hub.service.ts:39` (unbounded across **all** agencies — M) · `documents.service.ts:71` (M) · `expenses.service.ts:24,31` (getSummary loads all rows to sum in JS — M) · `tasks.service.ts:38,46` (S) · `maintenance.service.ts:58` (S) · `payments.service.ts:21` findAllPending (S) · `saas-admin.service.ts:140,180` (S) · `refusal-logs.service.ts:18` (S).

### 🟢 P3 — residuals from closed findings
- **#6 residual:** webhooks — no runtime **DNS-rebinding** guard at the axios sink (denylist is at subscribe-time only). `webhooks.service.ts`. med/M.
- **#8 follow-up:** one-time **backfill** of pre-`10aa7d5` soft-delete tombstones (rename their unique `subdomain`/`contactEmail` off the live namespace) before go-live. Architect-owned. S.
- **#9:** ✅ verified clean — **seed + all migrations apply on a truly empty DB** (QA Tester, R10).
- **#10 (open, founder/product decision):** `Expense.category` taxonomy — the schema comment (`SALARY/RENT/UTILITIES/MARKETING/TAX/OTHER`) and the live "Record an expense" form's actual option labels have zero overlap. Pick a canonical short-code list, update the `<select>` to map label→code, then `@IsIn` the DTO. S once decided.
- Low: `customers.service.ts:52` search `contains` is case-sensitive on Postgres (misses case variants). S.

---

## 3. NEEDED (features to build / finish)

| # | Item | Notes | Eff |
|---|---|---|---|
| N1 | **Finish T3 — wire `accidents/page.tsx`** | Backend is built (in-flight). Wire the page to `GET/POST/PATCH /accidents`, real data + honest states, drop the mock + "not wired" toast. Closes the last mock page on the checklist. | M |
| N2 | **Finish T4 — CI live-DB e2e job** | Add a `postgres:15` service-container job to `.github/workflows/ci.yml` that runs `migrate deploy` → seed → the backend e2e (`test/tenant-isolation.e2e-spec.ts`) — otherwise the spec is dead coverage. Document in `CLAUDE.md`. | M |
| N3 | **T5 — Guardian Vault file storage** | No `StorageService` exists; vault upload is metadata-only. Build a local-disk `StorageService` (swap to S3-compatible later) — upload persists, download streams, size/type validated, path never trusts client input. *(Confirm storage choice with founder.)* | M |
| N4 | **Automations controller** (unblocks F4) | Backend `automations/` has only cron logic, no controller. Build `POST/GET/PATCH /automations` (agency-scoped, `@IsIn` trigger/action, capability-gated) + wire the page. | M |
| N5 | **Platform audit-log endpoint** (unblocks `admin/logs`) | `audit-logs` is agency-scoped; add a ROOT_ADMIN platform-wide read for the SuperAdmin logs view. | M |
| N6 | **Real metrics for the god-mode pages** | `admin/pulse` infra metrics + `reports` generation + `fleet-map` telemetry are product decisions — either build real backends or convert to honest "coming soon". | L |
| N7 | **T2 — extend boundary spec** | `common/multi-tenant-boundary.spec.ts` — add automations, notifications, analytics customer directory (grep: 0 hits; not started). | S |

---

## 4. NEXT TESTS (coverage to add — ranked by risk)

**High-risk services with zero spec:**
- `saas-admin/forensic.service.ts` — ROOT_ADMIN impersonation token minting + `assertRoot` + can't-impersonate-another-root guards. **Highest.** (M)
- `hub/hub.service.ts` — deliberate cross-tenant `discoverAssets` (`agencyId != mine`); nothing guards what leaks. (S)
- `common/search/search.service.ts` — each entity manually `agencyId`-scoped; one miss = cross-tenant leak. (M)
- `users/users.service.ts` (trust QR / verifyRenter), `portal/portal.service.ts` (own-data-only invariant). (S/M)

**High-risk *flows* with no coverage:**
- **Deposit lifecycle** — `bookings.service.ts` `captureDeposit`/auto-HOLD/`updateDeposit` HOLD·RETURN·CLAIM state machine + CLAIM→invoice damage income (`:509,:371,:576-705,:658`). The existing spec *explicitly excludes* these. Money + state-machine. **Add first.**
- ROOT_ADMIN impersonation rejection + token tenant-scoping.
- hub/search cross-tenant boundaries (not in the boundary spec).

**Also thin:** contracts, documents, audit-logs, expenses, analytics, automations, cars. **Wire the e2e suite into CI** (N2) so it actually runs. *(Well-covered already: auth, bookings late-fee/overlap, payments/refund, consent invariant, capability guard, trust, saas-admin metrics, agencies, agency-staff, customers, inspections, webhooks, boundary — don't redo these.)*

---

## 5. STEPS — ordered plan for tomorrow

1. **Reconcile in-flight.** `git status`. If T3/T4 landed → verify green. If half-done, finish + commit them (T3 frontend wiring = N1; T4 CI job = N2) before anything new.
2. **Fix F1 (analytics IDOR)** — HIGH, small, security. Add a boundary test for `getCarPerformance` cross-tenant → 404.
3. **Validation sweep** — F2, F3, F5, F6 (DTOs for refusal-logs/expenses/etc.). Cheap, closes real mass-assignment/money holes.
4. **Honesty sweep** — F4 (automations fake toast) → build N4 controller *or* make honest. Then decide N5/N6 for the other mock pages (or convert to honest "coming soon").
5. **Unbounded-list bounding** — start with the platform-scale ones (`hub/discover`, `documents`, `expenses`, `cars`) → add `take`/pagination.
6. **Tests** — deposit-lifecycle spec, forensic/hub/search specs; then T2 boundary tail.
7. **Residuals** — #8 tombstone backfill (Architect), #9 empty-DB baseline, #6 DNS-rebinding guard.
8. Reviewer (PRO) runs a cycle behind the Executor on each of the above, filing findings.

---

## 6. FOUNDER DECISIONS / GATED (do NOT start without you)

- **Phase 9 deploy** — concrete blockers to schedule when you pick a host:
  migrate-on-deploy (no entrypoint runs `prisma migrate deploy` — BLOCKER); PDF
  engine (full Puppeteer → needs a non-serverless host; no try/finally = browser
  leak; **no HTML-escaping = injection into contracts** — MED); `NEXT_PUBLIC_API_URL`
  is build-time with no Docker ARG → ships `localhost` (BLOCKER); `ALLOWED_ORIGINS`
  prod value + `trust proxy` missing; **managed Postgres + backups missing**;
  healthcheck shallow (no DB readiness); **no error tracking (Sentry) / structured
  logs**; **Throttler uses in-memory store** (won't work multi-replica); add `.env*`
  to `backend/.dockerignore`. *(Volume + dev-DB-baking are already resolved — those
  backlog notes are stale.)*
- **Phase 10 final review** — `/security-review` + `/code-review` on the full diff; do last.
- **Rate tiers / seasonality (T6)** — needs your pricing model before building.
- **Make CI a required PR check** — repo Settings → Branches (repo-admin, your click).
- **Media team:** all brand/copy/car-data deliverables are committed **locally, not
  pushed** — Director awaits your push plan. Also: the shipped `frontend/public/logo.svg`
  wordmark is dark graphite → **illegible on the product's own dark bg** (a reversed
  variant was added, but the main logo is untouched) — decide the fix. Marketing copy
  **FR/AR translation** is a pending follow-up.

---

## 7. DOC DRIFT to fix (housekeeping)
- `docs/AUDIT_BACKLOG.md` Phase 2 still lists `BlacklistEntry.expiresAt never enforced` as ⬜ — it's **done** (`trust.service.ts:436` via `automations.service.ts:132` daily cron). Tick it.
- `COORDINATION.md` "Current state" line + finding-#3 header read stale/"OPEN" though resolved — refresh when convenient.
- `project_status.md` §9 "Open finding #3" is resolved — update.
