# CarHub OS — Multi-Tenancy & Isolation Architecture

This document details the multi-tenant data isolation, security boundaries, and authorization guarantees of CarHub OS.

---

## 1. Multi-Tenant Philosophy

CarHub OS operates as a multi-tenant enterprise system where repair shops, dealerships, fleet operators, and independent garages share underlying infrastructure while remaining strictly isolated from each other.

### The Zero-Knowledge Boundary Rule
No tenant may ever know of the existence, data, or activity of another tenant:
1. **Server-Side Extraction:** The tenant identifier (`agencyId`) is **never** accepted from HTTP request bodies or query parameters for business queries. It is resolved exclusively server-side from the verified JWT payload (`@CurrentUser()`).
2. **404 Instead of 403 on IDOR Attempts:** If User $A$ from Tenant 1 attempts to access a vehicle, booking, diagnostic session, or invoice belonging to Tenant 2, the API **must return 404 (Not Found)** rather than 403 (Forbidden). Returning 403 confirms the resource exists, enabling identifier scanning.
3. **Compound Foreign Keys:** Core entities enforce composite uniqueness constraints:
   - `Car`: `@@unique([id, agencyId])`, `@@unique([agencyId, licensePlate])`.
   - `DiagnosticVehicle`: `@@unique([id, agencyId])`, `@@unique([agencyId, fleetCarId])`.
   - `DiagnosticSession`: `@@unique([id, agencyId])`.
   - `WorkOrder`: `@@unique([id, agencyId])`.

---

## 2. Capabilities-Based Authorization (RBAC 2.0)

Instead of hardcoding role checks (`if (user.role === 'AGENT')`), CarHub evaluates granular, auditable capabilities stored in the `AgencyMembership` record.

### Standard Presets
- **OWNER**: Complete suite of operational, financial, and administrative capabilities (30+ capabilities).
- **MANAGER**: Full operational, diagnostic, staff, and pricing management (excluding agency deletion).
- **TECHNICIAN / AGENT**: Diagnostic intake, telemetry streaming, fault confirmation, work order progression.
- **SERVICE_ADVISOR**: Customer check-in, estimate presentation, customer approval management, work order scheduling.
- **ROOT_ADMIN**: Platform-level infrastructure monitoring, tenant provisioning, cross-tenant impersonation (strictly audited).

---

## 3. Cross-Tenant Penetration Defense Testing

The platform maintains an automated security test suite (`multi-tenant-boundary.spec.ts`) that verifies:
- Cross-tenant read attempts $\rightarrow$ 404.
- Cross-tenant update attempts $\rightarrow$ 404.
- Cross-tenant delete attempts $\rightarrow$ 404.
- Forged `agencyId` in payload $\rightarrow$ Ignored in favor of JWT identity.
- Unauthenticated requests $\rightarrow$ 401 Unauthorized.
