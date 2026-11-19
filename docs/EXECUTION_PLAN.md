# EXECUTION PLAN — Fider / CarHub → market-ready

> [!WARNING]
> **Superseded work queue.** The tasks, ownership loop and priorities below are retained as historical process evidence. Do not pick or resume work from this file.
>
> Current authority: [AGENTS.md](../AGENTS.md) → [platform readiness master plan](operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md) → [execution board](progress/EXECUTION_BOARD.md) → [current verified state](../.agents/state/CURRENT.md).

> **Historical process description.** The **Executor** took the top unblocked task
> and built it; the **Reviewer** checked each pushed change and wrote findings
> back. This file formerly described what to build next. Its companions were:
> `COORDINATION.md` (how the two agents work + live board + reviewer→executor
> findings), `CLAUDE.md` (project guide + invariants), `docs/AUDIT_BACKLOG.md`
> (phased audit + the market-ready checklist = definition of done).
>
> **Keep this file current:** when a task lands, mark it ✅ with the commit SHA and
> move the pointer down. Add newly-discovered work as new tasks, don't lose it.

---

## How the two agents use this file

**Executor loop (every cycle):**
1. `git fetch origin && git rebase origin/main`, then `git status`.
2. **First, drain `COORDINATION.md` → "Open findings"** — fixing a reviewer finding always outranks starting a new task.
3. Take the **top unblocked, non-🔒 task** below. Claim its files in the `COORDINATION.md` board.
4. Build it to its **Acceptance criteria**. Run the **Verify** block. Never commit red.
5. Commit small (`git add <specific files>`, not `-A`), push. Update the board + tick the task here.

**Reviewer loop (every cycle):** see `COORDINATION.md`. In short: pull → review the executor's new commits → run the full verify suite → write concrete findings (file:line, failure scenario, suggested fix) into "Open findings", or note "clean". Small targeted hardening/tests allowed in your own files; no big features.

**Verify block (both agents, before every commit):**
```
cd backend  && npx tsc --noEmit && npx jest && npx eslint .
cd frontend && npx tsc --noEmit && npx vitest run && npx eslint .
```
Frontend tests are **vitest, not jest**. Money is **Decimal** — never `+ - * /` on a Decimal (see `CLAUDE.md` §5.3). Every business query is scoped by `agencyId` (cross-tenant → **404**). `prisma/schema.prisma` is **single-owner** — claim it in the board before touching it, and only one migration in flight at a time.

---

## Baseline (2026-07-21, `d6225e0`)
Backend **129 jest / tsc / eslint** green · Frontend **9 vitest / tsc / eslint** green · CI workflow live · stack runs locally (`docker compose up -d db`, seeds, `npm run start:dev` / `npm run dev`), seed logins `admin123`.

---

## TASKS (in order)

### T1 — Chart a11y: `erp` + `TrustConsole` (non-🔒, ~S) — ✅ DONE (A)
The daily-intensity chart is done (`SrDataTable` + touch + locale). Two chart surfaces remain.
- **Files:** `frontend/src/app/(owner)/dashboard/erp/page.tsx`, `frontend/src/app/(public)/landing/_components/TrustConsole.tsx`, reuse `frontend/src/components/ui/SrDataTable.tsx`.
- **Acceptance:** every data-bearing chart has a `.sr-only` `<table>` equivalent (or, if its numbers are already visible text, that's noted and it's left alone); decorative SVG/bar containers `aria-hidden`; any hover-only tooltip also fires on `group-active` (touch); numbers via next-intl `useFormatter().number()` not `toLocaleString()`. No `aria-label`/`caption` double-announce.
- **Verify:** frontend block. Spot-check in the browser (owner dashboard / public landing).
- **Done:** `erp` capital-flow chart got the full treatment (`SrDataTable` with
  month/revenue/expenses/net, `aria-hidden` on legend + bars + month labels,
  `group-active` touch tooltip, next-intl `format.number()` throughout the page
  including the forecast tables). `erp`'s utilization bar is `aria-hidden` —
  its percentage is already visible text directly above it. `TrustConsole`'s
  gauge is `aria-hidden` with **no** SR table, deliberately: score, band,
  review count and agency count are all already visible text beside it, so a
  table would only double-announce. Finding #5 (×3) folded in while in the file.
  Still open: no browser spot-check this session — welcome from B or C.

### T2 — Extend multi-tenant boundary spec (non-🔒, ~S)
Boundary spec covers 12 domains + 3 scoping shapes. Close the tail.
- **Files:** `backend/src/common/multi-tenant-boundary.spec.ts` (+ read the target services first for exact signatures).
- **Acceptance:** add automations, notifications, and the analytics command-centre customer directory (or whichever remain) — agency A → 404/empty on agency B's resource, asserting `agencyId` is in the WHERE clause. `npx jest` green.
- **Verify:** backend block.

### T3 — Accidents domain (semi-🔒: schema; model spec provided so it's executable) (~L)
The last "not wired" stub (`accidents/page.tsx` is a mock array with an honest "not wired" toast). Make it real. **Serialize the schema** — claim `prisma/schema.prisma` in the board first.
- **Proposed model** (adjust only if the founder specifies otherwise):
  ```prisma
  model Accident {
    id            String    @id @default(uuid())
    agencyId      String
    agency        Agency    @relation(fields: [agencyId], references: [id])
    carId         String
    car           Car       @relation(fields: [carId], references: [id])
    bookingId     String?
    booking       Booking?  @relation(fields: [bookingId], references: [id])
    occurredAt    DateTime
    severity      String    // MINOR, MODERATE, SEVERE, TOTAL
    status        String    @default("REPORTED") // REPORTED, INVESTIGATING, REPAIR_QUOTE, IN_REPAIR, CLAIM_FILED, RESOLVED
    description   String
    location      String?
    thirdParty    Boolean   @default(false)
    estimatedCost Decimal?  @db.Decimal(12, 2)   // money = Decimal; interceptor returns a number on the wire
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt
    @@index([agencyId])
    @@index([carId])
  }
  ```
- **Files:** `prisma/schema.prisma` + a new migration; new `backend/src/accidents/` module (controller/service/module/dto, `@IsIn` on severity/status, `@RequireCapabilities`); wire `frontend/src/app/(owner)/dashboard/accidents/page.tsx` to real `GET/POST/PATCH /accidents`.
- **Acceptance:** CRUD scoped by `agencyId` (cross-tenant → 404); severity/status DTO-constrained; `estimatedCost` handled as Decimal; page shows real data + honest states (no fake success toast); migration applies on an empty DB; a boundary test for `AccidentsService.findOne`. Backend + frontend verify green.
- **Migration note:** in non-interactive shells `migrate dev` may refuse a confirm — fall back to `prisma migrate diff … --script` into a new `migrations/<ts>_add_accident/`, then `migrate deploy` (see `CLAUDE.md` §6).

### T4 — Live-DB e2e CI job (non-🔒, ~M)
CI runs unit tests only. Add a real-Postgres integration job.
- **Files:** `.github/workflows/ci.yml` (add a job with a `postgres:15` service container: `prisma migrate deploy` → seed → run a small supertest/e2e suite); a minimal `backend/test/*.e2e-spec.ts` hitting auth + one tenant-scoped route end-to-end.
- **Acceptance:** job green in CI against a live Postgres; proves login + a cross-tenant 404 over HTTP. Document it in `CLAUDE.md`.

### T5 — Guardian Vault real file storage (semi-🔒: storage choice) (~M)
Vault metadata is real; the file bytes aren't stored. Default plan: local-disk storage behind a `StorageService` abstraction (swap to S3-compatible later) — confirm with founder if a cloud bucket is preferred now.
- **Acceptance:** upload persists the file via `StorageService`; download streams it back; size/type validated; path never trusts client input; honest states. Verify green.

### T6 — Rate tiers / seasonality 🔒 (product decision)
Weekend multiplier? seasonal calendar? per-car tiers? extras/add-ons? **Needs the founder's pricing model** before building — touches money math + `schema.prisma`. Do not start without it.

---

## 🔒 Founder-gated — do NOT start without explicit approval
- **Phase 9 — deploy:** host/target, migrate-on-deploy, managed Postgres + backups, Puppeteer PDF runtime, error tracking/healthchecks, `ALLOWED_ORIGINS`, throttler shared store. Also: make the CI workflow a **required** PR check (repo Settings → Branches).
- **Phase 10 — final review (do last):** `/security-review` + `/code-review` on the full diff since Phase 0; re-run the market-ready checklist end to end; close or explicitly defer every C/H.

---

## Parking lot (smaller, unordered — promote into a task when picked up)
- Adopt the paginated/windowed API shape in other big list UIs beyond bookings.
- Prune stale docs (`docs/PRODUCTION_READINESS_REPORT.md`, dossiers, `technical_encyclopedia.md`) or mark them clearly historical — `CLAUDE.md` already says the 3 live docs are source-of-truth.
- Clean the smoke-test tenants from the dev DB when convenient (wiped by any `seed.js`).
