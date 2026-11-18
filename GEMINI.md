# GEMINI.md — Fider (Gemini CLI Developer Guide)

Welcome to the Gemini CLI Developer Guide for **Fider** (formerly Infinity/CarHub). Fider is a multi-tenant SaaS ERP engineered specifically for car-rental agencies, localized for **Morocco** (currency **MAD**, **20% VAT**).

> [!IMPORTANT]
> **Canonical project governance and execution truth:** [AGENTS.md](AGENTS.md) → [platform readiness master plan](docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md) → [execution board](docs/progress/EXECUTION_BOARD.md) → [current verified state](.agents/state/CURRENT.md).
>
> Select or resume work only from that hierarchy. Legacy phase narratives in this guide are historical context and do not override the Phase 0–8 master plan or active task board.

This document is a Gemini-oriented technical guide for architecture, development conventions, strict invariants and localized workflows. It is not the active work queue or readiness ledger.

---

## 1. System Stack & Port Mapping

| Layer | Technology Stack | Configuration / Details |
| :--- | :--- | :--- |
| **Backend** | NestJS + Prisma ORM | Port `5406` | Global prefix `/api` | Entry: `backend/src/main.ts` |
| **Frontend** | Next.js 16 (React + Tailwind CSS) | Port `3002` |
| **Database** | PostgreSQL 15 | Local dev runs via Docker (`docker compose up -d db`) |
| **Authentication** | JWT stored in HttpOnly cookie `infinity_token` | Guarded via `AuthGuard` & `RolesGuard` | Global `ThrottlerGuard` |
| **Validation** | DTOs with `class-validator` | Global `ValidationPipe` with strict `whitelist` + `forbidNonWhitelisted` |
| **Tests** | Jest Framework | Test scripts executed from `backend/` directory |

---

## 2. Core Coding Conventions & Invariants

To keep the platform secure, robust, and mathematically sound, you **must strictly adhere** to the following invariants in all backend and frontend modifications:

### A. Strict Tenant Isolation
* **Query Scope:** Every business-related query must be explicitly scoped by `agencyId` (e.g., `where: { ..., agencyId }`).
* **Source of Truth:** Never trust `agencyId` from the request body or query parameter unless specifically authorized (like ROOT_ADMIN/impersonation flows). Always resolve `agencyId` server-side from the verified session context via the `@CurrentUser()` decorator.
* **No Information Leaking (IDOR Guard):** If a user attempts to read, write, or update a resource belonging to another tenant, the application **must return 404 (NotFoundException)** rather than 403. This prevents malicious actors from probing the existence of resources across other tenants.

### B. Monetary Math & Decimal Type
* **Database Type:** Monetary columns in PostgreSQL are mapped via Prisma as `@db.Decimal(12,2)`.
* **Calculation Invariant:** Prisma returns these columns as `Prisma.Decimal` (powered by Decimal.js), **not** as JS `number` types.
* **No Floats for Money:** Never perform calculations on raw floats. Drift (`333.33 * 3 = 999.9900000000001`) can break financial reconciliation. Always execute money math using the Decimal.js API (`.plus()`, `.minus()`, `.times()`, `.equals()`, `.gte()`, `.toDecimalPlaces(2)`), or perform integer cents math.
* **Wire Protocol:** The API converts `Prisma.Decimal` to standard JSON numbers on serialization via the global `DecimalToNumberInterceptor`. Thus, the raw wire format sent to the frontend remains numeric.

### C. Fine-Grained Capability-Based Access (Pillar 5A)
* **Custom Roles via Presets:** The roles `ROOT_ADMIN`, `OWNER`, `MANAGER`, `AGENT`, and `RENTER` exist, but access is evaluated on granular **Capabilities** mapped to `AgencyMembership`.
* **Presets Mapping:**
  * `OWNER`: Full suite of 21 agency capabilities.
  * `MANAGER`: 19 agency capabilities.
  * `AGENT`: 14 agency capabilities.
* **Enforcement:** Enforce permissions at the controller or route level using `@UseGuards(AuthGuard, CapabilitiesGuard)` combined with `@RequireCapabilities(...)`. The `ROOT_ADMIN` role bypasses these capability checks globally.

### D. Global Trust Identity & Hash Security (Pillar 6)
* **Deterministic Matching:** The Renter Identity Network allows different agencies to share blacklists/reputations globally while maintaining renter data privacy.
* **HMAC Invariant:** Renter identity documents (such as CIN/Passport numbers) are securely hashed using `HMAC-SHA256` salted with `IDENTITY_PEPPER` (`trust.service.ts`).
* **Pepper Stability:** The `IDENTITY_PEPPER` environment variable is required at boot. It **must never be changed** post-production rollout; doing so renders all historic hashes unmatchable.

### E. Transactions for Check-Then-Act
* All critical operations that involve multi-resource mutations (e.g., booking collision checks, invoice settlement, or balance updates) must execute inside `prisma.$transaction`.
* Ensure you use the active transaction client **`tx`** passed to the transaction block for all sequential operations instead of `this.prisma` to maintain absolute transactional safety.

### F. Security & Sensitive Operation Audits
* Sensitive mutations (such as manual billing adjustments, blacklist creation/lifting, or user capability overrides) must write an `AuditLog` via the `@Global` `AuditLogsService`.
* Usage: `await this.auditLogs.log(agencyId, actorId, action, entityType, entityId, beforeState, afterState)`.

---

## 3. Directory & Module Map

### A. Backend (`backend/src/`)
NestJS operates on a clean modular structure:
* `auth/` & `users/`: Authentication, session verification, and profile management.
* `agencies/`: Tenant registration, subscription linkages, and soft-delete setups.
* `agency-staff/`: Staff provisioning, preset-to-capability conversion, and capability modifications.
* `bookings/` & `contracts/`: Booking state machine, vehicle availability checks, and PDF agreements.
* `cars/` & `maintenance/`: Vehicle attributes, documentation alerts, and service logs.
* `consent/` & `portal/`: End-user (Renter) document uploads, consent requests, and QR authorization workflows.
* `entitlements/`: Usage counting, plan limits, and feature gating checks.
* `payments/` & `expenses/`: Financial ledgers, platform invoices, and billing rules.
* `saas-admin/`: Root admin platform metrics, plan provisioning, and tenant impersonation controls.
* `common/`: Global interceptors (`DecimalToNumberInterceptor`), decorators (`@CurrentUser`), and security guards.

### B. Frontend (`frontend/src/`)
Next.js 16 App Router hierarchy:
* `app/(public)/`: Public marketing site (`/landing`), `/login`, and `/signup`.
* `app/(owner)/dashboard/`: Intensive owner console (Fleet, Bookings, Finance, Staff, Billing, and Settings).
* `app/(renter)/portal/`: Self-scoped renter profile, shared document vaults, and active consent approvals.
* `components/ui/`: Restyled "Fider Lux" shared components, layout, dynamic menus, and modals.

---

## 4. Operational & Local Development Commands

### Database Setup & Provisioning
Ensure Docker Desktop is running before deploying.

```bash
# 1. Start the relational PostgreSQL container
docker compose up -d db

# 2. Run schema migrations
cd backend
npx prisma migrate deploy

# 3. Seed base schema and re-wipe previous testing data
node -r dotenv/config prisma/seed.js

# 4. Seed role presets, staff records, and renter credentials (idempotent)
node -r dotenv/config prisma/seed-roles.js

# 5. Seed billing categories, SaaS plans, and trial subscriptions (idempotent)
node -r dotenv/config prisma/seed-plans.js
```

### Starting Services
```bash
# Terminal A: Start Backend Development Server (http://localhost:5406)
cd backend
npm run start:dev

# Terminal B: Start Frontend Development Server (http://localhost:3002)
cd frontend
npm run dev
```

### Static Analysis, Linting & Unit Testing
Before committing or creating any Pull Requests, make sure that all typechecks and tests are passing cleanly:

```bash
# 1. Typecheck the backend codebase
cd backend
npx tsc --noEmit

# 2. Execute Jest test suites
cd backend
npx jest

# 3. Typecheck the frontend codebase
cd frontend
npx tsc --noEmit
```

*Note: Default local credentials (all with password `admin123`): `root@carhub.os` (ROOT_ADMIN), `owner@carhub.os` (OWNER), `manager@carhub.os` (MANAGER), `agent@carhub.os` (AGENT), and `renter@carhub.os` (RENTER).*

---

## 5. Historical Development Progress

> [!NOTE]
> The Phase 0–12 labels below are a retained milestone snapshot. They are not the current Phase 0–8 release gates. Use the canonical execution board and current state for live status.

### Completed Milestones
* **Phase 0 (Security Scrape):** Purged exposed keys, hardened root routes, and patched user signup escalation vectors.
* **Phase 1 (Authorization Core):** Configured rate throttling, locked down cross-agency IDOR vulnerabilities, and established identity HMAC security.
* **Phase 2 (Postgres Migration):** Completed SQLite-to-PostgreSQL switch, transitioned money values to `Decimal`, and integrated soft-delete structures.
* **Phase 5A (Capability Engine):** Fully implemented staff membership, customizable role presets, and custom permissions guards.
* **Phase 5B (Consent Engine):** Constructed the secure `RenterDocument` global vault and time-boxed, revocable consent matching systems.
* **Phase 11 (SaaS Business Layer):** Created billing schema (`Plan`, `Subscription`, `PlatformInvoice`), built out the `EntitlementsService` with strict limits gating, wired up tenant impersonation, and deployed the root `/admin` metrics console.

### Historical target recorded by this snapshot
* **Legacy Phase 12 (Design Rebuild — "Fider Lux"):** This guide originally recorded the rebuild as in progress. Treat the description as design context only; current implementation and task status must be verified through the canonical board and current-state handoff.

---

## 6. Gemini CLI Workflow Guidelines

As a Gemini CLI Agent, you must operate within strict safety, performance, and narrative boundaries in this repository:

### A. Narrative Flow (`update_topic`)
* Maintain high continuity by using `update_topic` to separate phases of work.
* **Usage Limit:** Do not run `update_topic` for quick lookup actions (e.g. reading a single file or checking a command output). Use it exclusively for multi-step codebase changes or deep, multi-turn investigations.
* Always update topics when starting a new phase, changing strategic intent, or running into unexpected test or build blocks that trigger a pivot.

### B. Workspace Memory (`MEMORY.md` & Sibling Files)
* Personal developer notes, local quirks, and developer preference logs must **never** be committed to the repo.
* Persist private project notes under `/Users/hamzaelmoueddane/.gemini/tmp/hamzaelmoueddane/memory/`. Keep index maps inside `MEMORY.md` pointing to specific sibling markdown files in that folder.
* Only add instructions directly to `GEMINI.md` (this file) when they represent a shared, team-wide codebase convention, invariant, or architectural standard that belongs in the public repository.

### C. Resource Efficiency & Shell Rules
* **Parallel Execution:** Execute multi-file read searches, or code searches in parallel where possible.
* **Quiet Execution:** When invoking terminal operations (like `npm install` or test commands), always supply silence/quiet flags (`--silent`, `CI=true`) or redirect massive outputs to temp files inside the project's temporary directory to avoid saturating token memory.
* **No Unplanned Modifications:** If a user hint or code bug implies changes outside of your immediate, approved scope, **you must request explicit confirmation** from the user before executing.
