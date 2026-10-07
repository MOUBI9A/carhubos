# CarHub OS — Enterprise Mobility ERP & Trust Layer

> *The unified command center & trust layer for automotive mobility and car rental agencies.*

Multi-tenant **SaaS ERP for car-rental agencies**. Built with NestJS + Prisma (backend) and Next.js 16 + React + Tailwind (frontend) on PostgreSQL 15.

---

## 🎨 Dual-Theme Design Engine

The unified platform features an instantaneous, persistent **Dual-Theme Engine** supporting two distinct design identities:

1. **Fider Lux (Modern Luxury)**: Warm obsidian graphite (`#12100e`), cream text, subtle brushed-brass accents, and Fraunces serif editorial display typography.
2. **Titan Cyber (Classic Console)**: Deep space navy (`#070b14`), electric neon-violet interactive glow, high-tech glassmorphism, and bold cybernetic telemetry.

Toggle themes on-the-fly via the top navigation bar, the mobile drawer, or by pressing <kbd>⌘</kbd>+<kbd>K</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd> to open the Command Palette.

---

## Quick Start

```bash
# Prerequisites: Docker Desktop running

# 1. Database
docker compose up -d db

# 2. Backend (http://localhost:5406/api)
cd backend
npx prisma migrate deploy
node -r dotenv/config prisma/seed.js          # base demo data
node -r dotenv/config prisma/seed-roles.js    # idempotent: users + capability presets
node -r dotenv/config prisma/seed-plans.js    # idempotent: SaaS subscription plans
npm run start:dev

# 3. Frontend (http://localhost:3001) — separate terminal
cd frontend && npm run dev
```

**Seed Logins** (universal password: `admin123`):
* **Platform Superadmin (`ROOT_ADMIN`)**: `root@carhub.os` -> `/admin`
* **Agency Owner (`OWNER`)**: `owner@carhub.os` -> `/dashboard`
* **Agency Manager (`MANAGER`)**: `manager@carhub.os` -> `/dashboard`
* **Rental Agent (`AGENT`)**: `agent@carhub.os` -> `/agent`
* **Renter / Client (`RENTER`)**: `renter@carhub.os` -> `/portal`
* **Secondary Tenant**: `owner@prestige.ma` & `agent@prestige.ma`

---

## Project Structure

```
carhubos/
├── backend/                 # NestJS API (port 5406)
│   ├── src/                 # Feature modules (auth, bookings, cars, payments, accidents, staff, ...)
│   └── prisma/              # Schema, 14 migrations, seed catalogs
├── frontend/                # Next.js 16 App Router (port 3001)
│   └── src/
│       ├── app/             # Route groups: (public), (owner), (admin), (agent), (renter)
│       ├── components/      # Shared UI kit with dual-theme adaptivity
│       ├── lib/             # API client, ThemeContext, AuthContext, ToastContext
│       └── i18n/            # Internationalization (FR/AR/EN)
├── docs/                    # Consolidated platform documentation
│   ├── architecture/        # System blueprints, sequence diagrams, technical encyclopedias
│   ├── product/             # UI kit atlas, design visions
│   ├── operations/          # Audit backlogs & production readiness reports
│   └── progress/            # Living progress snapshots & implementation summaries
├── content/car-data/        # Fleet spec data (JSON, markdown)
├── postman/                 # API collections & environments
├── scripts/                 # Utility scripts
├── docker-compose.yml       # PostgreSQL + backend + frontend
└── vercel.json              # Deployment config
```

---

## Core Verification Commands

```bash
# Backend test suites (398 tests)
cd backend && npm test

# Backend TypeScript check
cd backend && npx tsc --noEmit

# Frontend unit tests
cd frontend && npx vitest run

# Frontend production build
cd frontend && npm run build
```

---

## Key Documentation & Architecture Manuals

| Document | Purpose |
| :--- | :--- |
| [`CLAUDE.md`](CLAUDE.md) | Primary project guide & developer invariants |
| [`AGENTS.md`](AGENTS.md) | Agent onboarding quick reference |
| [`docs/architecture/TITAN_VISION_AND_ARCHITECTURE.md`](docs/architecture/TITAN_VISION_AND_ARCHITECTURE.md) | High-level system architecture & vision |
| [`docs/architecture/ATOMIC_BLUEPRINTS.md`](docs/architecture/ATOMIC_BLUEPRINTS.md) | Booking, compliance & impersonation sequence diagrams |
| [`docs/architecture/MASTER_DOSSIER.md`](docs/architecture/MASTER_DOSSIER.md) | Architectural master reference |
| [`docs/architecture/TECHNICAL_ENCYCLOPEDIA.md`](docs/architecture/TECHNICAL_ENCYCLOPEDIA.md) | Technical reference encyclopedia |
| [`docs/product/UI_KIT_ATLAS.md`](docs/product/UI_KIT_ATLAS.md) | Forensic UI kit & design tokens atlas |
| [`docs/operations/PRODUCTION_READINESS_REPORT.md`](docs/operations/PRODUCTION_READINESS_REPORT.md) | Full stack readiness report |
