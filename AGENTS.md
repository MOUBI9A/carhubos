# AGENTS.md — Fider (CarHub OS)

Agent onboarding for this monorepo. The canonical execution hierarchy is:

1. `AGENTS.md` — invariants and mandatory operating rules.
2. `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md` — accepted strategy and release gates.
3. `docs/progress/EXECUTION_BOARD.md` — canonical task order, dependencies, ownership, and acceptance evidence.
4. `.agents/state/CURRENT.md` — the exact resume point and latest verified state.
5. `.agents/state/NEXT.md`, `.agents/state/BLOCKERS.md`, and `.agents/state/DECISIONS.md` — near-term queue, external blockers, and binding decisions.

`CLAUDE.md`, `docs/AUDIT_BACKLOG.md`, `docs/DESIGN_VISION.md`, and `PROGRESS.md` remain useful technical/historical context, but they do not override the hierarchy above when progress snapshots disagree. Older docs under `docs/` may be stale.

Public brand = **Fider** (*the trust layer for mobility*). Repo dir remains `carhubos`.

---

## Mandatory resume protocol for every AI

Before planning, editing, testing, merging, or deploying:

1. Read this file completely.
2. Read `docs/operations/AI_CONTINUITY_PROTOCOL.md` and follow its start checklist.
3. Read the master plan, execution board, current state, next queue, blockers, decisions, and `COORDINATION.md`.
4. Verify `pwd`, repository root, remotes, current branch, `origin/main`, worktree status, and open PR state. Never assume the recorded state is still current.
5. Continue the existing `IN_PROGRESS` task only when ownership is explicitly handed over. Otherwise claim the highest-priority unblocked `READY` task.
6. Claim exact files in `COORDINATION.md` and update the execution board before editing. Commit and push that claim separately.
7. Work on a scoped feature/fix branch and PR. Do not work directly on `main`.
8. At every pause or completion, update the execution board and `.agents/state/CURRENT.md`, record evidence and remaining risks, then release the coordination claim in a separate commit.

If code and documentation disagree, code and live read-only evidence determine the current fact; update the stale documentation in the same milestone. Never silently create a second roadmap.

---

## What this product is

B2B multi-tenant SaaS ERP for **Moroccan car-rental agencies** (MAD, 20% VAT inclusive).

| Tier | Who | Role strings |
|------|-----|--------------|
| Platform | Founder / ops | `ROOT_ADMIN` |
| Agency | Paying tenants | `OWNER`, `MANAGER`, `AGENT` (+ capability presets) |
| Renter | End users | `RENTER` |

Founder sells **subscriptions** to agencies; agencies rent cars to renters. Trust Network is **cross-tenant by design**.

---

## Stack & ports

| Layer | Tech | Port / notes |
|-------|------|--------------|
| Backend | NestJS + Prisma | `5406`, global prefix `/api` |
| Frontend | Next.js 16 + React 19 + Tailwind v4 | `3002` |
| DB | PostgreSQL 15 (Docker) | `5432` |
| Auth | JWT HttpOnly cookie `infinity_token` | `AuthGuard` + `RolesGuard` + `CapabilitiesGuard` |
| Money | `Decimal(12,2)` + `DecimalToNumberInterceptor` | API returns JS numbers |

---

## Local run

```bash
# Docker Desktop on; root .env has DB_USER / DB_PASSWORD / DB_NAME
docker compose up -d db

cd backend
npx prisma migrate deploy
# seed.js WIPES; then idempotent role/plan seeds:
node -r dotenv/config prisma/seed.js
node -r dotenv/config prisma/seed-roles.js
node -r dotenv/config prisma/seed-plans.js
npm run start:dev          # http://localhost:5406/api

cd frontend && npm run dev # http://localhost:3002
```

**Seed logins** (password `admin123`): `root@` · `owner@` · `manager@` · `agent@` · `renter@` — all `@carhub.os`.

Verify: `cd backend && npx tsc --noEmit && NODE_OPTIONS=--experimental-vm-modules npx jest && npx eslint .` · `cd frontend && npx tsc --noEmit && npx vitest run && npx eslint .`.

---

## Hard invariants (do not break)

1. **Tenant isolation** — every business query scopes `agencyId` from JWT `@CurrentUser()`, never from body. Cross-tenant → **404** (not 403).
2. **Money = Decimal** — use Decimal API (`.plus/.minus/.times/...`); never raw `+ - * /` on Prisma Decimals. Compare in **integer cents**.
3. **Capabilities** — catalog in `backend/src/common/capabilities.ts`. Membership-scoped; `ROOT_ADMIN` bypass; fail-closed. Roles are presets over capability sets.
4. **Consent vault** — agency reads renter `RenterDocument` only with active, in-scope, same-agency `ConsentGrant`; else 403.
5. **Secrets** — never commit `.env`; no hardcoded JWT/pepper fallbacks. Fail-fast if unset.
6. **Register** — public signup may only self-assign `OWNER|AGENT|RENTER`; never accept `agencyId`.
7. **Legacy design Phase 12** — its presentation rebuild is **presentation-only** (no backend/schema/API contract changes). Legacy phase numbers in historical documents are not the Phase 0–8 task gates in the current master plan.

---

## Repo layout

```
backend/src/<feature>/   # Nest module: controller + service + module + dto/
backend/prisma/          # schema, migrations, seeds
frontend/src/app/        # App Router route groups:
  (public)/landing       # marketing
  (owner)/dashboard/*    # agency owner ERP (~18 sections)
  (agent)/agent/*        # front-line ops
  (admin)/admin/*        # platform founder console
  (renter)/portal/*      # renter self-service + consent
  login, signup
frontend/src/components/ui/  # Fider Lux kit (tokens in globals.css @theme)
docs/                    # vision, backlog, design brief
```

---

## Current program direction (do not resume from this section)

Do not resume from a phase summary embedded in this file. The live resume point is `.agents/state/CURRENT.md`; task order and status live in `docs/progress/EXECUTION_BOARD.md`.

Current program direction: protect and reconcile the platform first, prove the non-AI web core with a controlled agency pilot, then introduce governed AI, supervised workflows, passive telemetry, and only later bounded low-risk automation. Design direction remains warm graphite/cream, restrained violet, sparing brass; Fraunces / Hanken / Plex Mono — see `docs/DESIGN_VISION.md`.

---

## When changing code

- Prefer smallest scoped change; match existing patterns in the touched module.
- Schema changes: migrate → `prisma generate` → fix types → `tsc`.
- Security/money/DB changes: extra scrutiny; never skip tenant scope or Decimal rules.
- After every task: update `docs/progress/EXECUTION_BOARD.md` and `.agents/state/CURRENT.md`. After a phase milestone, also update `CLAUDE.md`, `PROGRESS.md`, and the relevant backlog section.
