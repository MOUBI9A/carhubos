# Current Operational State

- **Active Branch**: `feat/automotive-os-platform`
- **Active Phase**: Phase 6 (Diagnostic Bay Experience & Live Streaming Telemetry)
- **Current Objective**: Real-time OBD telemetry streaming, diagnostic bay analog gauges, parts matching, work order execution, and fleet maintenance synchronization.

---

## Working Subsystems
- **Multi-tenant Core**: Agency tenant isolation, scoped queries (`where: { id, agencyId }`), 404 IDOR guard, capability engine (`AgencyMembership`).
- **Fleet & Assets**: Vehicles (`Car`), Car Documents, Maintenance Records, Accidents.
- **Financial Engine**: Bookings, Invoices, Payments, Stripe / Mock gateway integration, Decimal monetary precision (MAD, 20% VAT).
- **Renter & Consent Vault**: HMAC-SHA256 salted identity hash, consent grants, document vault.
- **Automotive Diagnostics Engine**:
  - `DiagnosticVehicle` & `DiagnosticSession` with full relational integrity.
  - Streaming OBD-II packet normalizer, PID decoder, re-order window, deduplication.
  - Server-Sent Events (SSE) telemetry stream endpoint (`GET /api/diagnostics/sessions/:id/stream`) delivering live packets, DTC events, and completion signals.
  - Deterministic simulator covering misfires (P0300, P0301), lean trims (P0171), catalyst efficiency (P0420), oxygen sensors, coolant overheating, and sensor faults.
  - AI reasoning adapter (`AnthropicProvider`) with fallback and evidence provenance.
  - Tamper-evident SHA-256 canonical diagnostic report generator with PDF export.
- **Diagnostic Bay Gauges Experience**:
  - High-frequency interactive SVG gauges: Tachometer / RPM (0-7000 RPM with redline alert), Speedometer (0-240 km/h), Coolant Temperature (with >105°C overheating alarm), Fuel Trims (STFT/LTFT +/- 25% bars), and Engine Load.
  - Real-time rolling packet inspection feed and live DTC pop-up banner during vehicle drive cycles.
- **Work Orders & Repair State Machine**:
  - `WorkOrder` entity with 12 distinct auditable states: `DRAFT`, `AWAITING_APPROVAL`, `APPROVED`, `SCHEDULED`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, `BLOCKED`, `READY_FOR_QUALITY_CHECK`, `QUALITY_CHECK`, `COMPLETED`, `INVOICED`, `CANCELLED`.
  - Automatic `MaintenanceRecord` creation upon work order completion for fleet assets.
  - Dedicated "Generate Invoice" flow transitioning completed work orders to invoiced status.
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
- **Backend test suite**: **61 passed, 61 total; 506 tests passing** (Jest).
- **Backend TypeScript**: `tsc --noEmit` **0 errors**.
- **Backend Production Build**: `npm run build` **0 errors**.
- **Frontend Vitest suite**: **6 passed, 6 total; 21 tests passing**.
- **Frontend TypeScript**: `tsc --noEmit` **0 errors**.
- **Frontend Production Build**: `npm run build` **All 48 routes compiled and optimized (Turbopack)**.
- **Mobile TypeScript**: `tsc --noEmit` **0 errors**.
- **Database migrations**: Applied cleanly (`20261017200000_diagnostics`, `20261017203000_add_work_orders`).
