# Fider Backend (NestJS + Prisma)

Backend API for the Fider platform.

- Default URL: `http://localhost:5406/api`
- Stack: NestJS 11 + Prisma + PostgreSQL

## Run locally

```bash
cd /home/runner/work/carhubos/carhubos/backend
npm install
npx prisma migrate deploy
node -r dotenv/config prisma/seed.js
node -r dotenv/config prisma/seed-roles.js
node -r dotenv/config prisma/seed-plans.js
npm run start:dev
```

## Validate

```bash
cd /home/runner/work/carhubos/carhubos/backend
npm run lint
npm run build
npm run test
```

## Core rules

- Scope tenant business queries by `agencyId`.
- Treat money as `Prisma.Decimal` (never float arithmetic).
- Keep auth role strings exact (`ROOT_ADMIN`, `OWNER`, `MANAGER`, `AGENT`, `RENTER`).
- Never commit secrets or add default secret fallbacks.

## Source of truth

- `/home/runner/work/carhubos/carhubos/CLAUDE.md`
- `/home/runner/work/carhubos/carhubos/docs/AUDIT_BACKLOG.md`
