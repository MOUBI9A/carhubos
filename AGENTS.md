# AGENTS.md — Fider (CarHub OS)

Agent onboarding for this monorepo. **Source of truth:** `CLAUDE.md` + `docs/AUDIT_BACKLOG.md` + `docs/DESIGN_VISION.md` + `PROGRESS.md`. Older docs under `docs/` may be stale.

Public brand = **Fider** (*the trust layer for mobility*). Repo dir remains `carhubos`.

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

Verify: `cd backend && npx tsc --noEmit && npx jest` · `cd frontend && npx tsc --noEmit`.

---

## Hard invariants (do not break)

1. **Tenant isolation** — every business query scopes `agencyId` from JWT `@CurrentUser()`, never from body. Cross-tenant → **404** (not 403).
2. **Money = Decimal** — use Decimal API (`.plus/.minus/.times/...`); never raw `+ - * /` on Prisma Decimals. Compare in **integer cents**.
3. **Capabilities** — catalog in `backend/src/common/capabilities.ts`. Membership-scoped; `ROOT_ADMIN` bypass; fail-closed. Roles are presets over capability sets.
4. **Consent vault** — agency reads renter `RenterDocument` only with active, in-scope, same-agency `ConsentGrant`; else 403.
5. **Secrets** — never commit `.env`; no hardcoded JWT/pepper fallbacks. Fail-fast if unset.
6. **Register** — public signup may only self-assign `OWNER|AGENT|RENTER`; never accept `agencyId`.
7. **Phase 12** — design rebuild is **presentation-only** (no backend/schema/API contract changes).

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

## Progress snapshot (resume from here)

**Done:** Phases 0, 1, 2, 5A (capabilities), 5B (renter/consent), 11 (SaaS billing/entitlements/impersonation); Phase 12 foundation + public marketing/auth.

**In progress:** Phase 12 owner-dashboard restyle → then agent/admin/renter portals.

**Next hardening (after / alongside design):** Phase 3 deposits, 4 rental lifecycle, 6 perf (command-centre), 7 i18n FR/AR/EN, 8 tests/CI, 9 deploy (human gate), 10 final audit.

Workflow: commit verified milestones on `main`; keep `tsc` + `jest` green. Design direction: warm graphite/cream, restrained violet, sparing brass; Fraunces / Hanken / Plex Mono — see `docs/DESIGN_VISION.md`.

---

## When changing code

- Prefer smallest scoped change; match existing patterns in the touched module.
- Schema changes: migrate → `prisma generate` → fix types → `tsc`.
- Security/money/DB changes: extra scrutiny; never skip tenant scope or Decimal rules.
- After a phase milestone: update `CLAUDE.md`, `PROGRESS.md`, and relevant backlog section.
