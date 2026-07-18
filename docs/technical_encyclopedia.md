# TECHNICAL ENCYCLOPEDIA & OPERATIONAL BLUEPRINT: CarHub SaaS

> ⚠️ **Historical.** Stack details are stale — persistence is now **PostgreSQL** (not SQLite/WAL) and the backend is **NestJS**. Current source of truth: **[../CLAUDE.md](../CLAUDE.md)** + **[AUDIT_BACKLOG.md](./AUDIT_BACKLOG.md)**.

**Project ID**: CarHub-Business-OS  
**Version**: 1.0.0-PRO  
**Status**: 🟢 Fully Operational & Hardened  

---

## 1. 🏗️ High-Level System Architecture
CarHub is a distributed multi-tenant platform built on a **Modular Monolith** architecture with a React-based Forensic Dashboard.

### The Stack
- **Core**: Node.js / Express.js
- **Persistence**: SQLite 3 (Optimized with WAL Mode)
- **ORM**: Prisma v6.19+
- **Frontend**: Next.js v16 (Turbopack), Tailwind CSS, Framer Motion
- **Icons/UI**: Lucide React, Shadcn/UI (Themed)
- **Forensics**: Winston JSON Logging, Audit Logging Interceptors

---

## 2. 📊 Data Structures (The Prisma Model)
The platform manages **12 relational entities** with strict referential integrity.

### Forensic Model Definitions
- **Agency**: Central tenant entity. Fields: `subdomain`, `contactEmail`, `subscriptionPlan`.
- **User**: Operators. Roles: `SUPER_ADMIN`, `AGENCY_ADMIN`, `AGENT`.
- **Car**: Assets. Fields: `licensePlate`, `pricePerDay`, `availabilityStatus`, `complianceScore`.
- **Booking**: Transactions. Status: `PENDING`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`.
- **Invoice/Payment**: Financial layer. Links `Booking` to `Payment` history.
- **CarDocument**: Compliance layer. Fields: `expiryDate`, `status` (VALID, EXPIRING_SOON, EXPIRED).
- **AuditLog**: Immutability layer. Captures `diff` (JSON) of every mutation.

---

## 🛡️ 3. Security & Multi-Tenancy Logic

### Tenant Isolation Architecture
1. **Middleware Injection**: The `authenticate` middleware decodes the JWT and injects `req.agencyId`.
2. **Hard-Query Filtering**: All Prisma queries are wrapped in a where-clause:
   ```javascript
   prisma.car.findMany({ where: { agencyId: req.agencyId } });
   ```
3. **Soft-Delete Interceptor**: A Prisma Middleware automatically converts `DELETE` to `UPDATE isActive: false`, ensuring no data is ever permanently lost.

### Forensic Impersonation Protocol
- **Logic**: A Super-Admin can request an impersonation token for any `userId`.
- **Security**: The token is short-lived (15m) and includes an `impersonatedBy` claim.
- **Audit**: Every action taken during impersonation is logged with the admin's original ID as the actor.

---

## 🔄 4. Operational Workflows & Business Logic

### 4.1 The Compliance Engine (`checkDocumentExpiry`)
An automated job that runs recursivelly:
1. **Scan**: Iterates through all `CarDocument` records.
2. **Alert**: If `expiryDate` < 30 days, status becomes `EXPIRING_SOON`. If < 0, `EXPIRED`.
3. **Hard-Block**: Vehicles with `EXPIRED` critical docs (Insurance/Registration) are automatically moved to `MAINTENANCE` status.
4. **Scoring**: Re-calculates the `complianceScore` (0-100) for every vehicle based on document validity.

### 4.2 The Transactional Booking Workflow
Implemented in `BookingService.js`:
- **Step 1: Overlap Check**: Ensures the vehicle isn't already booked for the target dates.
- **Step 2: Compliance Check**: Blocks creation if the car is in `MAINTENANCE` or has expired docs.
- **Step 3: Document Validation**: Ensures the renter's `licenseNumber` is valid.
- **Step 4: Invoice Generation**: Automatically triggers an `Invoice` creation with unique reference codes.

---

## ⚡ 5. Performance Systems (Phase 4.5 Hardening)

### Database Optimization: SQLite WAL Mode
- **Concurrency**: Enabled `PRAGMA journal_mode=WAL` to allow multiple concurrent read/write operations.
- **Persistence**: Combined with `PRAGMA synchronous=NORMAL` to balance safety and write speed.
- **Indices**: Dedicated indices on `AuditLog.createdAt`, `Notification.agencyId`, and `Invoice.status` for sub-10ms response times.

### Frontend Stabilization
1. **Auth Memoization**: `AuthContext` value is wrapped in `useMemo` to stop platform-wide re-renders during state updates.
2. **Hydration Guards**: Used `useRef(hasFetched)` in `DashboardPage` to prevent redundant API calls during React 18's strict mode double-mounting.

---

## 📡 6. API Reference (Partial Map)

| Endpoint | Method | Role Required | Description |
|:---|:---|:---|:---|
| `/api/auth/login` | POST | PUBLIC | JWT issuance |
| `/api/admin/metrics` | GET | SUPER_ADMIN | Global GMV/MRR pulse |
| `/api/dashboard/stats` | GET | AGENCY_ADMIN | Tenant-specific operational health |
| `/api/cars` | GET | AGENT+ | Fleet list with compliance scores |
| `/api/bookings` | POST | AGENT+ | Transactional rental creation |
| `/api/admin/impersonate/:id`| POST | SUPER_ADMIN | Start impersonation session |

---

## 🎨 7. Design Tokens & UI/UX
- **Glassmorphism**: Using `backdrop-blur-md` and `bg-white/5` with high-fidelity borders.
- **Color Palette**:
  - `Accent-Primary`: HSL(245, 100%, 60%) - Electric Purple
  - `Success`: HSL(142, 70%, 45%) - Emerald Green
  - `Danger`: HSL(0, 72%, 51%) - Crimson Red
- **Animations**: `framer-motion` for page transitions (`initial={{ opacity: 0, y: 20 }}`) and modal entries.

---

## 🛠️ 8. Infrastructure & Maintenance
- **Environment**: `.env` file gestion for `JWT_SECRET`, `PORT`, and `DATABASE_URL`.
- **Uploads**: Local `uploads/` directory with a dedicated Static middleware in `app.js`.
- **Logs**: Located in `backend/logs/combined.log` and `error.log`.

**This encyclopedia represents the full technical and operational logic of the CarHub ecosystem.** **VOILA.** 🏎️💨
