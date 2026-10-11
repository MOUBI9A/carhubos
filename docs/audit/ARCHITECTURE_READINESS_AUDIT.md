# Architecture Readiness Audit — Fider (CarHub OS)

**Author:** Agent 2 (Software Architect)  
**Status:** FACTUALLY VERIFIED AT RUNTIME  
**Stack:** NestJS Modular Architecture + Prisma ORM + PostgreSQL 15 + Next.js 16 App Router  

---

## 1. Executive Summary

Fider's architectural foundation is engineered for multi-tenant B2B enterprise software with strict isolation, modular decoupling, and deterministic state transitions. This audit validates that the codebase adheres to high standards of architectural integrity and resilience.

**Verdict:** ARCHITECTURE VERIFIED PRODUCTION READY

---

## 2. Module Boundaries & Dependency Structure

```
                  ┌──────────────────────────────────────────────┐
                  │               NestJS Core App                │
                  └──────┬───────────────────────────────┬───────┘
                         │                               │
        ┌────────────────┴───────────────┐               │
        │      Cross-Cutting Concerns    │               │
        │  AuthGuard, CapabilitiesGuard  │               │
        │  ThrottlerGuard, AuditLogs     │               │
        │  DecimalToNumberInterceptor    │               │
        └────────────────┬───────────────┘               │
                         │                               │
   ┌─────────────────────┼───────────────────────┬───────┴──────────────┐
   │                     │                       │                      │
┌──▼────────────┐ ┌──────▼────────────┐ ┌────────▼──────────┐ ┌─────────▼────────┐
│ Tenant Domain │ │  Fleet & Asset    │ │  Commercial/CRM   │ │  Platform Admin  │
│  Agencies     │ │  Cars             │ │  Bookings         │ │  SaaS Admin      │
│  AgencyStaff  │ │  Maintenance      │ │  Contracts        │ │  Entitlements    │
│  Vault        │ │  Accidents        │ │  Invoices/Payments│ │  Checkout        │
└───────────────┘ └───────────────────┘ └───────────────────┘ └──────────────────┘
```

### Invariants Verified:
1. **Unidirectional Dependency Flow:** Feature modules inject `PrismaService` and shared infrastructure services (`AuditLogsService`, `ConfigService`); domain modules do not produce circular imports.
2. **Context Resolution:** The `@CurrentUser()` custom decorator extracts user credentials from the verified JWT payload. Business services receive the resolved `agencyId` exclusively from this trusted context.
3. **Decoupled Cross-Tenant Trust:** The Trust Network (`TrustModule`) hashes identity identifiers via `HMAC-SHA256(CIN, IDENTITY_PEPPER)` so that reputation indicators can be correlated globally without violating tenant database boundaries.

---

## 3. Transaction Boundaries & State Machine Integrity

### 3.1 Booking Reservation Transaction
The booking creation flow coordinates multiple database records that must succeed or fail atomically:
1. Car row lock: `SELECT id FROM "Car" WHERE id = ${carId} FOR UPDATE`
2. Overlap validation under lock
3. Booking record creation (`status: 'REQUESTED'`)
4. Invoice record creation with embedded 20% VAT
5. Initial Pending Payment record creation (Triple-link invariant)
All steps execute inside `prisma.$transaction(async (tx) => { ... })`. If any sub-step fails or throws, the entire transaction is rolled back, preventing orphaned bookings or unbilled reservations.

### 3.2 State Machine Transitions
Booking states follow a deterministic directed acyclic graph:
`REQUESTED` -> `APPROVED` -> `ACTIVE` -> `COMPLETED`  
With valid transitions to `CANCELLED` from `REQUESTED`/`APPROVED`. State mutations are guarded in `bookings.service.ts` with validation checking valid previous states.

---

## 4. Architectural Risk Assessment

| Potential Risk | Severity | Mitigating Control | Status |
| :--- | :--- | :--- | :--- |
| **Cross-Tenant IDOR** | Critical | Every database query scopes `agencyId` from server session; returns 404 on foreign tenant | VERIFIED PASS |
| **Race Conditions in Fleet Availability** | Critical | PostgreSQL row-level locks inside transactions | VERIFIED PASS |
| **Financial Precision Loss** | High | `Decimal(12,2)` throughout DB and `Decimal.js` in services | VERIFIED PASS |
| **Credential & Secret Exposure** | High | Fail-fast boot validator checks environment secrets | VERIFIED PASS |
| **Denial of Service via Abuse** | Medium | Global `ThrottlerGuard` with route-level overrides | VERIFIED PASS |
