# CarHub / Infinity OS — Project Guide

Multi-tenant SaaS ERP for car-rental agencies, localized for Morocco (MAD, 20% VAT).
Being taken from demo to market-ready per **[docs/AUDIT_BACKLOG.md](docs/AUDIT_BACKLOG.md)** — that backlog is the source of truth for status; keep it and this file current at the end of every phase.

## Stack (actual, as of Phase 2)

- **Backend**: NestJS + Prisma. Port **5406**, global prefix **`/api`**. Entry `backend/src/main.ts`.
- **Frontend**: Next.js 16 (React) + Tailwind. Port **3002**.
- **Database**: **PostgreSQL** (switched from SQLite in Phase 2). Local dev DB runs via Docker: `docker compose up -d db` (service `db`, `postgres:15`). Connection from `backend/.env` `DATABASE_URL`.
- **Auth**: JWT in an HttpOnly cookie (`infinity_token`); `AuthGuard` + `RolesGuard` (`@Roles(...)`), global `ThrottlerGuard`.
- **Validation**: `class-validator` DTOs under global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`).
- **Tests**: Jest (`cd backend && npx jest`).

> Note: some legacy docs (`README.md`, `PRODUCTION_READINESS_REPORT.md`, dossiers) describe an Express/SQLite/"83 tests/production-ready" state that was aspirational — trust this file + the backlog.

## Run it locally

```bash
# 1. DB (Docker Desktop must be running)
docker compose up -d db                     # needs root .env with DB_USER/DB_PASSWORD/DB_NAME (gitignored)

# 2. Backend
cd backend
npx prisma migrate deploy                   # apply migrations to Postgres
node -r dotenv/config prisma/seed.js        # base demo data
node -r dotenv/config prisma/seed-roles.js  # one login per role
npm run start:dev                           # http://localhost:5406/api

# 3. Frontend
cd frontend && npm run dev                  # http://localhost:3002
```

**Seed logins** (local only, password `admin123`): `root@carhub.os` (ROOT_ADMIN), `owner@carhub.os` (OWNER), `manager@carhub.os` (MANAGER), `agent@carhub.os` (AGENT), `renter@carhub.os` (RENTER).

## Conventions (match these)

- **Tenant isolation**: every business query is scoped by `agencyId` — `where: { ..., agencyId }`. Cross-tenant reads/writes are IDOR bugs; return **404** (don't leak existence).
- **Roles**: `ROOT_ADMIN, OWNER, MANAGER, AGENT, RENTER` (plain strings; `@Roles(...)` + `RolesGuard`). Public `POST /auth/register` may only self-assign `OWNER/AGENT/RENTER` and may not join an arbitrary agency.
- **Money**: being migrated to `Decimal @db.Decimal(12,2)` (Phase 2). Compute decimal-safe; API returns money as JS **numbers** (Prisma `Decimal` → number at the response boundary).
- **Trust identity**: `HMAC-SHA256(IDENTITY_PEPPER, normalize(cin))` — `IDENTITY_PEPPER` is required (fail-fast) and must never change once real data exists (would break matching).
- **Secrets**: never commit. `backend/.env` (gitignored) holds `JWT_SECRET`, `DATABASE_URL`, `IDENTITY_PEPPER`. `.env.example` is placeholders only.

## Security posture (Phases 0–1, done)

- Secrets rotated; git history scrubbed (`filter-repo`); repo private; no forks. Register privilege-escalation + tenant-hijack closed. Auth rate-limited (5/60s). JWT/pepper fallbacks removed (fail-fast). Payments/expenses cross-agency IDOR fixed; invoice reconciliation on verify; double-booking guarded in a transaction.

## Phase progress

- **Phase 0** ✅ security incident (secrets, history, register authz)
- **Phase 1** ✅ correctness & authz quick wins
- **Phase 2** 🔄 data foundation (Postgres ✅; money Decimal, enums, `Task.agencyId`, soft-delete in progress)
- Phases 3–10: see the backlog.
