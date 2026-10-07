# THE MASTER DOSSIER: CarHub SaaS Business OS (Pro Edition)

> ⚠️ **Historical (2026-03).** Some technical details here are stale — the database is now **PostgreSQL** (not SQLite/WAL). For current stack, run steps, and status see **[../CLAUDE.md](../CLAUDE.md)** and **[AUDIT_BACKLOG.md](./AUDIT_BACKLOG.md)**.

**Project Identifier**: `CARHUB-SaaS-V1-PRO`  
**Completion Date**: 2026-03-31  
**Technical Status**: 🟢 Phase 4.5 Hardened (High-Concurrency Optimized)

---

## 🏗️ 1. ARCHITECTURE & SYSTEM DESIGN
CarHub is a **Shared-Kernel Multi-Tenant SaaS** built on a forensic modular monolith architecture.

### Deployment Topology
- **Backend API**: Node.js v24+ Express server running on port `5001`.
- **Frontend Dashboard**: Next.js v16 (Turbopack) running on port `3001`.
- **Database**: SQLite 3 (Optimized with WAL Mode) located at `backend/prisma/dev.db`.
- **Storage**: Local forensic storage at `backend/uploads/` with tiered static serving.

---

## 📊 2. THE "DATA DNA" (PRISMA MODELS)
The platform manages **12 relational entities** with strict referential integrity and soft-delete capabilities.

### 2.1 Operational Models
- **Agency**: The Root Tenant. Unique subdomain and billing data.
- **Car**: The revenue asset. Tracked by `licensePlate` and `availabilityStatus`.
- **Booking**: The core transaction. Status-driven lifecycle.
- **Customer**: The renter profile. Integrated license validation.

### 2.2 Governance & Telemetry Models
- **User**: Operators with tiered RBAC permissions.
- **AuditLog**: Immutable mutation history with JSON diff capture.
- **Notification**: Real-time operational alerts for users and agencies.
- **SystemConfig**: Global platform switches (Maintenance Mode, Trial Days).

### 2.3 Financial Models
- **Invoice**: Tax-compliant billing records generated per booking.
- **Payment**: Transaction records linking cash/card flow to invoices.

---

## 🛡️ 3. SECURITY & GOVERNANCE FRAMEWORK

### 3.1 Role-Based Access Control (RBAC) Matrix
| Role | Access Level | Description |
|:---|:---|:---|
| **SUPER_ADMIN** | Global Forensic | Oversight of all agencies, GMV, and system telemetry. |
| **AGENCY_ADMIN** | Tenant Full | Complete control over agency settings, fleet, and staff. |
| **FLEET_MANAGER** | Operational | Inventory management and document compliance. |
| **ACCOUNTANT** | Financial | Invoice auditing and payment reconciliation. |
| **AGENT** | Transactional | Day-to-day booking creation and car status updates. |

### 3.2 The Forensic Impersonation Engine
A unique platform-governance tool for Super-Admins:
- **Logic**: Generates a secondary JWT context with `isImpersonation: true`.
- **Workflow**: `impersonateUser(adminId, targetUserId)` -> Generate Token -> Session locked with `ImpersonationBanner`.
- **Audit**: Every action taken is logged in the `AuditLog` as `Actor: SuperAdmin (Impersonating Tenant)`.

### 3.3 Defensive Rate Limiting
Tiered protection using `express-rate-limit`:
- **Auth Tier**: 5 attempts / 15min (Brute-force protection).
- **Booking Tier**: 20 per 15min per user (Spam prevention).
- **Payment Tier**: 3 attempts / 5min (Fraud mitigation).
- **General API**: 100 requests / 15min.

---

## 🔄 4. CORE WORKFLOWS & LOGIC

### 4.1 The Compliance Engine (Algorithm)
Automated vehicle health calculation via `CarService.updateComplianceScore`:
- **Algorithm**: Weighted Scoring (0-100)
    - **Insurance**: 35%
    - **Technical Inspection**: 35%
    - **Registration**: 30%
- **Status Calculation**: 
    - `VALID` (Full weight) 
    - `EXPIRING_SOON` (50% weight)
    - `EXPIRED` (0% weight)
- **Maintenance Lockdown**: If `INSURANCE` or `REGISTRATION` status is `EXPIRED`, the car is automatically moved to `MAINTENANCE` and blocked from bookings.

### 4.2 The Transactional Booking Workflow
1. **Overlap Guard**: Checks date ranges for overlapping `CONFIRMED`/`ACTIVE` bookings.
2. **Hard-Block Check**: Validates `complianceScore` and `availabilityStatus`.
3. **Drafting**: Creates `Booking` Record.
4. **Automation**: Immediately provisions a linked `Invoice`.

---

## ⚡ 5. PERFORMANCE & SCALING (PHASE 4.5)

### 5.1 SQLite WAL Optimization
To handle the concurrency required for a multi-tenant platform without Docker/Postgres:
- **Pragma Settings**: Executed `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL` on connection.
- **Indices**: Added `createdAt` indices to `AuditLog` and `Notification` to keep forensic searches instantaneous.

### 5.2 Frontend Stabilization
- **Memoization**: Wrapped `AuthProvider` and `Dashboard stats` in `useMemo` to stop recursive re-render cycles.
- **Hydration Guards**: Used `hasFetched` refs to stop React StrictMode from firing redundant parallel API calls.

---

## 🎨 6. UI/UX DESIGN TOKENS
- **Aesthetic**: Premium Glassmorphism (High-fidelity blurs, subtle borders).
- **Typography**: Inter / Outfit / Roboto (Google Fonts).
- **Transitions**: Framer Motion `AnimatePresence` with 0.3s cubic-bezier curves.
- **Interactivity**: Lucide icons with micro-animations and HSL-based hover states.

---

## 📋 7. INFRASTRUCTURE & MAINTENANCE
- **Error Boundaries**: A `GlobalErrorBoundary` catches client-side crashes and presents a recovery UI.
- **Logs**: Located in `backend/logs/` with `winston` JSON formatting.
- **Seed System**: `prisma/seed.js` maintains a high-fidelity beta dataset for immediate deployment.

**This Master Dossier represents the complete forensic record of the CarHub platform.** **VOILA.** 🏎️💨
