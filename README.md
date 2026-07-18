# Fider (carhubos)

Multi-tenant SaaS ERP for car-rental agencies in Morocco (MAD, 20% VAT), with backend hardening and an in-progress frontend redesign.

## Source of truth

Read these first:

1. `/home/runner/work/carhubos/carhubos/CLAUDE.md`
2. `/home/runner/work/carhubos/carhubos/docs/AUDIT_BACKLOG.md`
3. `/home/runner/work/carhubos/carhubos/docs/DESIGN_VISION.md`

Older docs are historical unless they are explicitly aligned with the files above.

## Repository layout

```text
carhubos/
├─ backend/                  # NestJS + Prisma API (port 5406, /api)
├─ frontend/                 # Next.js 16 app (port 3002)
├─ docs/                     # engineering + product/design docs
├─ scripts/                  # utility scripts
├─ postman/                  # API collections
├─ docker-compose.yml        # local Postgres service
└─ CLAUDE.md                 # architecture, invariants, workflow rules
```

## Quickstart

```bash
# 1) Start Postgres
cd /home/runner/work/carhubos/carhubos
docker compose up -d db

# 2) Backend
cd /home/runner/work/carhubos/carhubos/backend
npm install
npx prisma migrate deploy
node -r dotenv/config prisma/seed.js
node -r dotenv/config prisma/seed-roles.js
node -r dotenv/config prisma/seed-plans.js
npm run start:dev

# 3) Frontend (new terminal)
cd /home/runner/work/carhubos/carhubos/frontend
npm install
npm run dev
```

## Validation commands

Backend:

```bash
cd /home/runner/work/carhubos/carhubos/backend
npm run lint
npm run build
npm run test
```

Frontend:

```bash
cd /home/runner/work/carhubos/carhubos/frontend
npm run lint
npm run build
npm run test
```

## AI collaboration guardrails

- Keep tenant isolation strict: scope business queries by `agencyId`.
- Keep money fields as Prisma `Decimal`; never use float math.
- Keep secrets out of git; `.env` files remain local-only.
- Make small, targeted changes; avoid unrelated refactors.
- Update docs when behavior/workflow changes.

See `/home/runner/work/carhubos/carhubos/.claude/agents/README.md` for worker-role guidance.
