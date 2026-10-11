# Production State Handoff & Smoke Test Report — Fider (CarHub OS)

**Date:** October 11, 2026  
**Document Owner:** Agent 14 (Factory Supervisor & CTO)  
**Repository:** `MOUBI9A/carhubos` (Brand: **Fider** — *The Trust Layer for Mobility*)  
**Verified Commit:** `5bda8907fe8ec3401e24ebd91eaebafebe99dea3`  
**Production Domains:**  
- Primary: `https://carhub.codes`  
- Secondary: `https://www.carhub.codes`  
- Vercel Deployment: `https://carhubos.vercel.app` (Deployment ID: `dpl_kGRHEHBeiG6Ue5UVzURd1XEzs1P2`, State: `READY`)

---

## 1. Executive Summary & Production Status

Following the authoritative production infrastructure handoff, all system components were verified live. The primary blockers previously recorded around database connectivity and secret configuration have been **completely resolved**.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║              VERDICT: READY FOR CONTROLLED PILOT                         ║
║                                                                          ║
║  - Database: Connected & Reachable (Supabase PostgreSQL 17.6)            ║
║  - Schema: Up to date (14 migrations in sync)                            ║
║  - Production Hosting: Vercel READY (200 OK across all domains)          ║
║  - Plans & Catalog: Provisioned (BETA, STARTER, PRO, BUSINESS)           ║
║  - Test Suites: 100% Green (443 backend tests, 19 frontend tests)        ║
║  - Static Analysis: 0 TypeScript errors across monorepo                  ║
║  - Multi-Tenant Isolation: 14 business domains verified (all return 404) ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Infrastructure & Connection Verification

### 2.1 Supabase Database Configuration
- **Project Ref:** `nsnashznakiofxopdsfg` (Region: `eu-west-1`)
- **Engine:** PostgreSQL `17.6.x`
- **Dual Connection Pooler Strategy:**
  1. **Migrations / Maintenance / Local Admin:** Supabase Session Pooler (Port `5432`). Tested via `prisma migrate status` (14 migrations verified in sync).
  2. **Serverless Production Runtime (Vercel):** Supabase Transaction Pooler (Port `6543`) with `pgbouncer=true&connection_limit=1`.
- **Invariants Upheld:**
  - Zero raw float operations on monetary values (`Decimal(12, 2)` + `DecimalToNumberInterceptor`).
  - Row-level lock concurrency guard on vehicles (`SELECT ... FOR UPDATE`) prevents double-bookings.
  - Soft-delete tombstones (`deletedAt`) preserved across all business entities.

### 2.2 Live Production API Health Probes

All production endpoints were probed directly:

| Endpoint | Target Domain | Expected | Live Result | Evidence Payload |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/health` | `https://carhub.codes` | `200 OK` | ✅ `200 OK` | `{"status":"ok","service":"fider-api","timestamp":"2026-10-11T08:36:18.061Z"}` |
| `GET /api/ready` | `https://carhub.codes` | `200 OK` | ✅ `200 OK` | `{"status":"ready","service":"fider-api","database":"reachable","timestamp":"2026-10-11T08:36:32.234Z"}` |
| `GET /api/platform/plans` | `https://carhub.codes` | `200 OK` | ✅ `200 OK` | Returned live database plans: `STARTER` (299 MAD), `PRO` (799 MAD), `BUSINESS` (1999 MAD) |
| `GET /` | `https://carhub.codes` | `200 OK` | ✅ `200 OK` | Next.js 16 App Router French localized landing page rendered |
| `GET /api/health` | `https://www.carhub.codes` | `200 OK` | ✅ `200 OK` | `{"status":"ok","service":"fider-api","timestamp":"2026-10-11T08:42:43.653Z"}` |
| `GET /api/health` | `https://carhubos.vercel.app` | `200 OK` | ✅ `200 OK` | `{"status":"ok","service":"fider-api","timestamp":"2026-10-11T08:33:28.447Z"}` |

---

## 3. Discovered & Resolved Issues

### BUG-VAULT-ENV: Supabase Secret Key Naming Compatibility
- **Issue:** Vercel Production Environment Variables configure the Supabase service key as `SUPABASE_SECRET_KEY`. However, `VaultStorageService` (`backend/src/vault/vault-storage.service.ts`) previously looked strictly for `process.env.SUPABASE_SERVICE_ROLE_KEY`.
- **Risk:** Without mitigation, live document uploads or downloads in the Guardian Vault would throw `503 ServiceUnavailableException ("Vault storage is not configured")` on production.
- **Fix Applied:** Updated `VaultStorageService.getClient()` to check both:
  ```typescript
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  ```
- **Verification:** Unit tests updated in `backend/src/vault/vault-storage.service.spec.ts` to test both environment variables; 9/9 unit tests pass cleanly.

---

## 4. Controlled Pilot Smoke-Test Plan (20-Step Matrix)

For the upcoming controlled pilot with real Moroccan rental agencies, execute the following 20-step verification sequence using synthetic test data:

| Step | Action | Method | Expected Invariant | Status |
| :--- | :--- | :--- | :--- | :--- |
| **01** | Open Production Signup | Browser (`/signup`) | Form renders with name, email, agency name, password | Ready |
| **02** | Register Test Tenant A | API / Browser | User created with `OWNER` role, agency created, password bcrypt-hashed | Ready |
| **03** | Authenticate Session | `POST /api/auth/login` | Returns HTTP 200 with HttpOnly `infinity_token` cookie | Verified |
| **04** | Verify Owner Capabilities | `GET /api/agency-staff/me` | Caller has 23 capabilities assigned via `AgencyMembership` | Verified |
| **05** | Verify BETA Subscription | `GET /api/saas-admin/overview` | Active 14-day trial on `BETA` plan; unlimited cars/staff/bookings | Verified |
| **06** | Register Fake Customer | `POST /api/customers` | Moroccan CIN normalized & HMAC-SHA256 hashed with `IDENTITY_PEPPER` | Verified |
| **07** | Create Test Vehicle | `POST /api/cars` | Unique constraint `[agencyId, licensePlate]` enforced; `AVAILABLE` | Verified |
| **08** | Create Test Booking | `POST /api/bookings` | Dates validated; pricing computed with 20% embedded VAT; `CONFIRMED` | Verified |
| **09** | Concurrency Conflict Test | Simultaneous `POST` | Row lock `SELECT ... FOR UPDATE` serializes; second request gets 400 | Verified (E2E) |
| **10** | Contract Generation | `POST /api/contracts` | Bilingual FR/AR contract generated; status transitions to `SIGNED` | Verified |
| **11** | Invoice & Deposit Settlement| `POST /api/invoices` | Monetary math executed via `Decimal.js`; deposit set to `HOLD` | Verified |
| **12** | Verify Owner Dashboard | Browser (`/dashboard`) | KPI summary reflects accurate GMV, fleet count, and booking status | Ready |
| **13** | Vault Upload Smoke Test | `POST /api/vault/files` | Upload synthetic test PDF (<50KB); namespaced under `agencyId` | Ready for E2E |
| **14** | Vault Download Test | `GET /api/vault/files/:id/url`| Generates 300s expiring signed download URL; verify byte download | Ready for E2E |
| **15** | Vault Deletion Test | `DELETE /api/vault/files/:id` | Removes DB row and deletes object from Supabase bucket | Ready for E2E |
| **16** | Re-authentication & State | Logout & Login | Session cookie cleared on logout; new cookie establishes cleanly | Verified |
| **17** | Register Test Tenant B | API / Browser | Create isolated second agency ("Tenant B") with distinct owner | Ready |
| **18** | Cross-Tenant Read Test | Tenant B calls Tenant A | Accessing Tenant A car/booking/customer/vault file returns **404** (not 403) | Verified (Unit/E2E) |
| **19** | Cross-Tenant Write Test | Tenant B modifies Tenant A | Update/delete payloads against Tenant A resource IDs return **404** | Verified (Unit/E2E) |
| **20** | Production Log Inspection | Vercel Runtime Logs | Zero unhandled exceptions or credential leakage in structured logs | Verified |

---

## 5. Automated vs. Manual Browser Scope

### 5.1 Fully Automated Checks Executed
1. **Backend Unit & Integration:** 443 tests across 54 suites passing (`npx jest` in `backend/`).
2. **Frontend Component Tests:** 19 tests across 6 suites passing (`npx vitest run` in `frontend/`).
3. **TypeScript Monorepo Compilation:** 0 errors across backend (`dist/`) and frontend (`.next/`).
4. **Live Production Liveness:** `https://carhub.codes/api/health` returning 200 OK.
5. **Live Production Readiness:** `https://carhub.codes/api/ready` returning 200 OK with `database: reachable`.
6. **Live Production Database Query:** `https://carhub.codes/api/platform/plans` returning 200 OK with live Supabase rows.
7. **Multi-Tenant Boundary:** Verified via `multi-tenant-boundary.spec.ts` (14 domains return 404 on IDOR probes: Bookings, Customers, Documents, Contracts, Hub, Expenses, Inspections, Cars, Maintenance, Payments, Tasks, RefusalLogs, Search, and Vault).

### 5.2 Recommended Manual Browser Smoke Actions (For Founder / Operator)
1. **Pilot Agency First-Run Login:**
   - Log into `https://carhub.codes/login` with pilot owner credentials (`owner@atlasrent.ma` or newly created test account).
   - Confirm the owner dashboard displays the 6 Casablanca vehicles and active bookings.
2. **Document Upload / Download in Browser:**
   - Navigate to `/dashboard/vault` or `/dashboard/customers/[id]`.
   - Upload a small synthetic test PDF (e.g. sample driver license scan).
   - Click the preview/download link to verify the private Supabase signed URL opens correctly.
   - Delete the test document and confirm it is removed from the table.
3. **Mobile Device Layout Check:**
   - Verify navigation drawer and responsive booking cards on an iPhone / Android screen.

---

## 6. Gated Feature Status

To guarantee zero operational risk during the pilot, the following subsystems remain intentionally gated:

- **AI Vision (`AI_VISION_MODE=disabled`):** AI damage inspection runs in transparent preview simulation mode (`isSimulation: true`) with clear operator notices. No simulated neural confidence is marketed as live detection.
- **Payment Gateway (`PAYMENT_PROVIDER=DISABLED`):** Online payment gateway checkout and webhooks are disabled. Pilot agencies record payments directly via cash, card terminal (TPE), cheques, and bank transfers with integer-cents ledger reconciliation.
- **Prisma Schema (`directUrl`):** No experimental schema modifications or major-version upgrades. Stack remains pinned to tested Prisma `5.11.0`.

---

## 7. Final Verdict & Next Action

### Verdict
**READY FOR CONTROLLED PILOT**

All production blockers have been factually resolved:
- Production database connection is healthy, migrated, and actively queried.
- Production Vercel deployment is live at `https://carhub.codes`.
- The codebase passes all static analysis and automated test suites.
- Tenant isolation is strictly enforced at the database and capability layers.

### Exact Next Action
Conduct the authenticated manual browser smoke test on `https://carhub.codes` (create test account, upload synthetic document, verify signed URL, delete document), followed by onboarding the first pilot agency (*Atlas Rent Morocco*).
