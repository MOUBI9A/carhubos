# Fider — CarHub OS

> *The trust layer for mobility*

Multi-tenant **SaaS ERP for car-rental agencies** in Morocco. Built with NestJS + Prisma (backend) and Next.js 16 + React + Tailwind (frontend) on PostgreSQL 15.

---

## Quick Start

```bash
# Prerequisites: Docker Desktop running

# 1. Database
docker compose up -d db

# 2. Backend (http://localhost:5406/api)
cd backend
npx prisma migrate deploy
node -r dotenv/config prisma/seed.js          # base demo data (WIPES)
node -r dotenv/config prisma/seed-roles.js    # idempotent: users + roles
node -r dotenv/config prisma/seed-plans.js    # idempotent: SaaS plans
npm run start:dev

# 3. Frontend (http://localhost:3002) — separate terminal
cd frontend && npm run dev
```

**Seed logins** (password `admin123`):
`root@carhub.os` · `owner@carhub.os` · `manager@carhub.os` · `agent@carhub.os` · `renter@carhub.os`

---

## Project Structure

```
carhubos/
├── backend/                 # NestJS API (port 5406)
│   ├── src/                 # Feature modules (auth, bookings, cars, payments, ...)
│   └── prisma/              # Schema, migrations, seeds
├── frontend/                # Next.js 16 App Router (port 3002)
│   └── src/
│       ├── app/             # Route groups: (public), (owner), (admin), (agent), (renter)
│       ├── components/      # Shared UI kit ("Fider Lux")
│       ├── lib/             # API client, formatters, utilities
│       └── i18n/            # Internationalization (FR/AR/EN)
├── docs/                    # Project documentation
│   ├── architecture/        # System architecture & technical reference
│   ├── product/             # Product & design vision
│   ├── operations/          # Audit backlog & production readiness
│   ├── progress/            # Living progress tracker
│   ├── coordination/        # Multi-agent coordination logs
│   ├── marketing/           # Brand & copy assets
│   └── archive/             # Historical/stale documents
├── content/car-data/        # Fleet spec data (JSON, markdown)
├── postman/                 # API collections & environments
├── scripts/                 # Utility scripts
├── docker-compose.yml       # PostgreSQL + backend + frontend
└── vercel.json              # Deployment config
```

---

## Verify Before Committing

```bash
# Backend
cd backend && npx tsc --noEmit && npx jest && npx eslint .

# Frontend
cd frontend && npx tsc --noEmit && npx vitest run && npx eslint .
```

---

## Key Documentation & Factory Deliverables

| Domain / Agent | Document | Purpose |
|:---|:---|:---|
| **Product Manager** | [`docs/product/PRD.md`](docs/product/PRD.md) | Personas, user stories, acceptance criteria, roadmap |
| **Software Architect** | [`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) | High-level architecture, ADRs, module boundaries |
| **UX/UI Designer** | [`docs/design/UX_DESIGN_SPECIFICATION.md`](docs/design/UX_DESIGN_SPECIFICATION.md) | "Fider Lux" design system tokens, RTL/LTR layouts |
| **AI Engineer** | [`docs/ai/AI_ARCHITECTURE.md`](docs/ai/AI_ARCHITECTURE.md) | Neural damage telemetry, model routing, safety |
| **Security Engineer** | [`docs/security/THREAT_MODEL.md`](docs/security/THREAT_MODEL.md) | STRIDE matrix, IDOR immunity, HMAC hashing, SSRF guards |
| **QA Engineer** | [`docs/qa/TEST_PLAN.md`](docs/qa/TEST_PLAN.md) | Test plan, edge-case protocols, 49 passing test suites |
| **DevOps / SRE** | [`docs/devops/RELEASE_AND_ROLLBACK.md`](docs/devops/RELEASE_AND_ROLLBACK.md) | Release runbook, zero-downtime migrations, rollback |
| **Database / Recovery**| [`docs/devops/AUTOMATED_BACKUPS.md`](docs/devops/AUTOMATED_BACKUPS.md) | Automated backups, 7-day retention, sandbox restore verify |
| **Security Engineer** | [`docs/security/API_AUTHORIZATION_INVENTORY.md`](docs/security/API_AUTHORIZATION_INVENTORY.md) | Full 34-controller route matrix, capabilities & IDOR guards |
| **Performance Engineer**| [`docs/audit/PERFORMANCE_PRODUCTION_AUDIT.md`](docs/audit/PERFORMANCE_PRODUCTION_AUDIT.md) | Microsecond health probes, 2-3ms business latency audit |
| **Code Reviewer** | [`docs/audit/FINAL_CODE_REVIEW.md`](docs/audit/FINAL_CODE_REVIEW.md) | Independent verification of all 14 production priorities |
| **Final Pilot Gate** | [`docs/audit/PILOT_READINESS_FINAL.md`](docs/audit/PILOT_READINESS_FINAL.md) | Production Gate Report & Real Pilot Sign-Off Verdict |
| **Agent Guide** | [`AGENTS.md`](AGENTS.md) | Agent rules, tenant isolation, and money invariants |
| **Backlog** | [`docs/AUDIT_BACKLOG.md`](docs/AUDIT_BACKLOG.md) | Detailed feature and audit backlog tracker |
