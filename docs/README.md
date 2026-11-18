# CarHub SaaS Operating System 🚗💨

A production-grade, multi-tenant SaaS platform for car rental agencies, specifically localized for the Moroccan market (MAD currency, VAT 20%, local compliance).

> [!IMPORTANT]
> **Canonical project governance and execution truth**
>
> 1. [Repository rules and invariants](../AGENTS.md)
> 2. [Platform readiness master plan](operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md)
> 3. [Active execution board](progress/EXECUTION_BOARD.md)
> 4. [Current verified resume state](../.agents/state/CURRENT.md)
>
> Select work and report readiness only from that hierarchy. Legacy phase numbers, roadmaps, audit snapshots and progress narratives elsewhere in `docs/` are supporting or historical material unless the canonical board explicitly activates them.

## 🚀 Key Features

### 🏢 Multi-Tenant Agency Management
- **Complete Isolation**: Each agency operates in its own secure data silo.
- **Subscription tiers**: STARTER, PRO, and ENTERPRISE plans with feature gating.
- **Agency Dashboard**: Real-time stats on revenue, fleet status, and active bookings.

### 🚘 Fleet & Booking Management
- **Inventory Control**: Manage vehicles, maintenance records, and availability.
- **Booking Engine**: Sophisticated booking lifecycle with compliance hard-blocks (Insurance/Technical Inspection).
- **Pricing Engine**: Automated calculation with MAD currency, VAT, and security deposits.

### 🏛️ Platform Governance (Super Admin)
- **Global Pulse Dashboard**: See growth, MRR, and platform-wide health.
- **Forensic Search**: Universal search across all agencies, users, and cars.
- **Deep Analytics**: Operational intelligence and growth metrics.
- **Compliance Engine**: Automated nudges for agencies with expiring vehicle documents.
- **User Impersonation**: Securely assist agency admins by logging in as them.

### 🔒 Security & Hardening
- **JWT Authentication**: Secure role-based access control (RBAC).
- **Rate Limiting**: Multi-tier protection (Auth, API, Booking, Payment).
- **Input Validation**: Strict Zod-based validation on all endpoints.
- **Audit Logging**: Forensic tracking of all critical system actions.

## 🛠️ Technology Stack

- **Backend**: NestJS (Node.js) + Prisma ORM
- **Database**: PostgreSQL (local dev via Docker `postgres:15`)
- **Frontend**: Next.js 16 (React), Tailwind CSS
- **Testing**: Jest
- **Security**: `@nestjs/jwt`, `@nestjs/throttler` (rate limiting), `class-validator` (input validation), `RolesGuard` (RBAC)

> See **[../CLAUDE.md](../CLAUDE.md)** for technical conventions. Use the **[master plan](operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md)** and **[execution board](progress/EXECUTION_BOARD.md)** for market-readiness status; `AUDIT_BACKLOG.md` is retained as supporting historical audit context.

## 📂 Project Structure

```bash
├── backend             # NestJS API + Prisma ORM
│   ├── src
│   │   ├── <feature>/  # per-feature module: *.controller.ts, *.service.ts, *.module.ts, dto/
│   │   ├── common/     # shared guards (AuthGuard, RolesGuard) + decorators
│   │   └── main.ts     # bootstrap (port 5406, /api prefix, ValidationPipe)
│   └── prisma          # schema.prisma, migrations, seeds
├── frontend            # Next.js 16 application
└── docker-compose.yml  # local Postgres (db service)
```

## 📖 Documentation

- [Cross-AI continuity protocol](operations/AI_CONTINUITY_PROTOCOL.md) — mandatory start, claim, evidence and handoff workflow.
- [Platform readiness master plan](operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md) — accepted strategy, architecture and release gates.
- [Execution board](progress/EXECUTION_BOARD.md) — canonical task order, dependencies, status and acceptance evidence.
- [Current state](../.agents/state/CURRENT.md) — exact branch, task, verified state, blocker and resume point.
- [Product vision](PRODUCT_VISION.md), [design vision](DESIGN_VISION.md) and [audit backlog](AUDIT_BACKLOG.md) — supporting domain and historical context; they do not override the canonical execution hierarchy.

## ⚖️ License
Proprietary - Developed for CarHub SaaS Platform.
