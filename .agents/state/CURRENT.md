# Current Operational State

- **Active Branch**: `feat/automotive-os-platform`
- **Active Phase**: Phase 5 (Repair Operations & Complete Vertical Slice)
- **Current Objective**: Unify automotive diagnostics domain, Work Orders state machine, Parts Intelligence with Moroccan supplier catalog, and customer plain-language health translation.

---

## Working Subsystems
- **Multi-tenant Core**: Agency tenant isolation, scoped queries (`where: { id, agencyId }`), 404 IDOR guard, capability engine (`AgencyMembership`).
- **Fleet & Assets**: Vehicles (`Car`), Car Documents, Maintenance Records, Accidents.
- **Financial Engine**: Bookings, Invoices, Payments, Stripe / Mock gateway integration, Decimal monetary precision (MAD, 20% VAT).
- **Renter & Consent Vault**: HMAC-SHA256 salted identity hash, consent grants, document vault.
- **Automotive Diagnostics Engine**:
  - `DiagnosticVehicle` & `DiagnosticSession` with full relational integrity.
  - Streaming OBD-II packet normalizer, PID decoder, re-order window, deduplication.
  - Deterministic simulator covering misfires (P0300, P0301), lean trims (P0171), catalyst efficiency (P0420), oxygen sensors, coolant overheating, and sensor faults.
  - AI reasoning adapter (`AnthropicProvider`) with fallback and evidence provenance.
  - Tamper-evident SHA-256 canonical diagnostic report generator with PDF export.
- **Work Orders & Repair State Machine**:
  - `WorkOrder` entity with 12 distinct auditable states: `DRAFT`, `AWAITING_APPROVAL`, `APPROVED`, `SCHEDULED`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, `BLOCKED`, `READY_FOR_QUALITY_CHECK`, `QUALITY_CHECK`, `COMPLETED`, `INVOICED`, `CANCELLED`.
  - Sequenced order numbering (`WO-YYYY-0001`).
  - Post-repair verification with DTC re-scan enforcement prior to completion.
  - Direct conversion from Diagnostic Session Estimate to Work Order.
- **Parts Intelligence & Supplier Catalog**:
  - Provider-neutral parts system with Moroccan distributor pricing in MAD (Autoplus Maroc, Somafaco, Maghreb Accessoires, Copart).
  - Tiers: `OEM_DIRECT`, `AFTERMARKET_PREMIUM`, `AFTERMARKET_STANDARD`, `ECONOMY`.
  - Engine & DTC matching (Bosch, NGK, Brembo, Valeo, Febi Bilstein, Continental/VDO, Walker).
  - One-click "Add to Estimate" integration.
- **Customer Vehicle Health Translator**:
  - Plain-language health assessment without misleading false precision.
  - Monitored subsystems: Engine & Combustion, Cooling, Emissions, Fuel & Air, Electrical.
  - Clear driveability verdict ("Safe to drive: Yes/No") and layman Q&A explaining what happened, what needs repair, and what happens if ignored.
- **Frontend Stack**: Next.js 16 App Router, Tailwind CSS, multi-lingual i18n (FR, AR, EN), technician workspace, and work orders dashboard.
- **Mobile Stack**: Expo 52 React Native mobile application.

---

## Recent Verification Evidence
- **Backend test suite**: **60 passed, 60 total; 504 tests passing** (Jest).
- **Backend TypeScript**: `tsc --noEmit` **0 errors**.
- **Frontend Vitest suite**: **5 passed, 5 total; 19 tests passing**.
- **Frontend TypeScript**: `tsc --noEmit` **0 errors**.
- **Mobile TypeScript**: `tsc --noEmit` **0 errors**.
- **Database migrations**: Applied cleanly (`20261017200000_diagnostics`, `20261017203000_add_work_orders`).

---

## Next Steps
- Implement telemetry SSE streaming endpoint (`/api/diagnostics/sessions/:id/stream`) for live packet gauge animation.
- Expand Playwright E2E suite for automated technician bay smoke testing.
