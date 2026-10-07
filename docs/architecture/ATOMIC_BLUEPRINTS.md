# THE ATOMIC BLUEPRINT: CarHub SaaS Operations Manual

**Project Maturity**: 🟢 Final Phase (Hardened & Atomic)  
**Document Purpose**: Definitive operational and technical record of all core platform logic.

---

## 1. 🔄 TRANSACTIONAL SEQUENCE DIAGRAMS

### 1.1 The "Booking-to-Compliance" Pipeline
This diagram illustrates the multi-stage validation performed during every booking attempt.

```mermaid
sequenceDiagram
    participant User
    participant Router
    participant Service as BookingService
    participant DB as Prisma/SQLite
    participant Notify as NotificationService

    User->>Router: POST /api/bookings
    Router->>Service: create(data, agencyId)
    Service->>DB: Fetch Car + Documents
    DB-->>Service: Car Data
    Note over Service: Step 1: Availability Status Check
    Note over Service: Step 2: Date Overlap (Overlapping Check)
    Note over Service: Step 3: Compliance Check (Insurance/VT)
    
    ALT isBlocked
        Service->>User: Error (403/409)
    ELSE isAllowed
        Service->>DB: Start Transaction
        DB->>DB: Create Customer (if new)
        DB->>DB: Create Booking Record
        DB->>DB: Create linked Invoice
        DB-->>Service: Success
        Service->>Notify: Create Notification
        Service->>User: Success (201 Created)
    END
```

### 1.2 The "Forensic Impersonation" Handshake
```mermaid
sequenceDiagram
    participant Admin as SuperAdmin
    participant API as ImpersonationController
    participant Auth as AuthService
    participant UI as Dashboard

    Admin->>API: POST /api/admin/impersonate/:id
    API->>Auth: generateImpersonationToken(adminId, targetId)
    Auth->>API: Special JWT (isImpersonation: true)
    API->>Admin: New JWT + Redirect
    Admin->>UI: Hydrate with Impersonation Token
    Note over UI: Render ImpersonationBanner
    UI->>Admin: Full Tenant Access (Audited)
```

---

## 🏗️ 2. SERVICE DEPENDENCY GRAPH
The backend uses a modular service layer where specialized services collaborate for transactional safety.

```mermaid
graph TD
    A[BookingService] --> B[CarService]
    A --> C[CustomerService]
    A --> D[InvoiceService]
    A --> E[WhatsAppService]
    
    B --> F[DocumentService]
    G[AnalyticsService] --> B
    G --> A
    G --> D
    
    H[Middleware] --> I[AuthService]
    I --> J[AuditService]
```

---

## 📊 3. THE "DATA DNA" REFERENCE (ATOMIC FIELDS)

| Model Attribute | Logic | Default / Behavior |
|:---|:---|:---|
| `Car.complianceScore` | Weighted (35/35/30) | Computed in `CarService` |
| `Booking.status` | State Machine | `PENDING` -> `ACTIVE` -> `COMPLETED` |
| `Invoice.status` | Billing logic | `DUE` -> `PAID` (triggered by Payment) |
| `AuditLog.diff` | Forensic Trace | JSON snapshot of previous/current data |
| `User.permissions` | RBAC Guard | Multi-level string (e.g. `OWNER`, `AGENT`) |

---

## ⚡ 4. PERFORMANCE HYDRATION LIFECYCLE
The frontend uses a sophisticated handshake to maintain performance and prevent flicker.

1. **Static Initial**: Next.js renders skeleton UI.
2. **Token Check**: `AuthContext` reads `autoflow_token` from `localStorage`.
3. **Identity Hydration**: `GET /api/auth/me` verifies identity.
4. **Memoized Context**: `AuthContext` stabilizes the environment using `useMemo`.
5. **Request Guard**: `DashboardPage` uses `useRef(hasFetched)` to block duplicate hydration calls.

---

## 🛡️ 5. FORENSIC ERROR SCHEMA (API RESPONSE)
Standardized error payloads for platform-wide consistency.

### Case: Conflict (409)
```json
{
  "status": "error",
  "message": "Date conflict with another booking.",
  "code": "BOOKING_CONFLICT",
  "forensicTrace": "32578e61-2775-43c2-b89a-a59107035d2f"
}
```

### Case: Forbidden Compliance (403)
```json
{
  "status": "error",
  "message": "Blocking: Insurance is missing or will expire during the rental period.",
  "code": "COMPLIANCE_HARD_BLOCK"
}
```

**This Atomic Blueprint documents the final structural and operational logic of the CarHub ecosystem.** **VOILA.** 🏎️💨
