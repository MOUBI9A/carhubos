# Current Operational State

- **Active Branch**: `feat/automotive-os-platform`
- **Active Phase**: Phase 8 (Automotive Adversarial & Financial Invariant Hardening)
- **Current Objective**: Adversarial stress testing, zero-decimal drift validation (MAD, 20% VAT), state machine bypass prevention, DTC verification enforcement, predictive maintenance, and offline garage resiliency.

---

## Working Subsystems
- **Multi-tenant Core**: Agency tenant isolation, scoped queries (`where: { id, agencyId }`), 404 IDOR guard, capability engine (`AgencyMembership`).
- **Fleet & Assets**: Vehicles (`Car`), Car Documents, Maintenance Records, Accidents.
- **Financial Engine**: Bookings, Invoices, Payments, Stripe / Mock gateway integration, Decimal monetary precision (MAD, 20% VAT).
- **Renter & Consent Vault**: HMAC-SHA256 salted identity hash, consent grants, document vault.
- **Automotive Adversarial & Financial Integrity**:
  - Dedicated stress test suite (`automotive-adversarial.spec.ts`) modeled after Creator Revenue OS's financial adversarial rigor.
  - Mathematical conservation: Zero-decimal drift across fractional labor hours and odd parts pricing with exact `Prisma.Decimal(12,2)` precision.
  - Hardened non-negative constraints rejecting negative labor hours, negative labor rates, and negative parts quantities.
  - State machine bypass prevention: illegal jumps (e.g. `DRAFT` $\to$ `COMPLETED`) and illegal rollbacks (e.g. `COMPLETED` $\to$ `DRAFT`) strictly blocked.
  - Mandatory post-repair diagnostic verification: `COMPLETED` transitions blocked until DTC clearance is explicitly certified by a technician.
  - Cross-tenant injection & IDOR attack resistance: foreign vehicle/car insertions into work orders return 404.
  - Double-invoicing prevention & cryptographic SHA-256 tamper-evident report seal invariant.
- **Predictive Maintenance & Service Interval Engine**:
  - `PredictiveMaintenanceService` analyzing mileage intervals against Moroccan driving conditions (oil & filter every 10k km, air & cabin filters every 20k km, fuel filter every 30k km, brake pads every 30-45k km, timing belt every 100k km).
  - Vehicle schedule calculator with dynamic urgency classifications (`HEALTHY`, `UPCOMING`, `DUE_SOON`, `OVERDUE`).
  - Fleet-wide predictive overview (`GET /api/maintenance/predictive-overview`) forecasting 30-day pending maintenance expenditure in MAD.
  - Interactive UI card (`PredictiveMaintenanceCard.tsx`) with progress indicators, status filters, and 1-click work order estimate addition.
- **Offline-Resilient Technician Bay Buffer**:
  - `GarageOfflineBuffer` and `OfflineSyncBanner.tsx` supporting spotty garage WiFi networks.
  - Safe local draft persistence in `localStorage`, automated action queuing, and online reconnection synchronization.
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
- **Backend Unit & Integration Suite**: **63 passed, 63 total; 523 tests passing** (Jest).
- **Backend Live-DB E2E Suite**: **3 passed, 3 total; 16 tests passing** (`test/automotive-diagnostics.e2e-spec.ts`, `test/tenant-isolation.e2e-spec.ts`, `test/app.e2e-spec.ts`).
- **Backend TypeScript**: `tsc --noEmit` **0 errors**.
- **Backend Production Build**: `npm run build` **0 errors (dist/ clean)**.
- **Frontend Vitest Suite**: **7 passed, 7 total; 26 tests passing**.
- **Frontend TypeScript**: `tsc --noEmit` **0 errors**.
- **Frontend Production Build**: `npm run build` **All 48 routes compiled and optimized (Turbopack)**.
- **Mobile TypeScript**: `tsc --noEmit` **0 errors**.
- **Database migrations**: Applied cleanly (`20261017200000_diagnostics`, `20261017203000_add_work_orders`).
- **Git State**: Clean working tree on branch `feat/automotive-os-platform`.
