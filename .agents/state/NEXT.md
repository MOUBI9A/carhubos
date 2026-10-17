# Next Engineering Priorities

## Completed Milestones
1. **Prisma Schema & Migrations**:
   - `DiagnosticVehicle`, `DiagnosticSession`, and `WorkOrder` models added with full relational integrity.
   - Deployed migrations `20261017200000_diagnostics` and `20261017203000_add_work_orders`.
2. **Capabilities Matrix Expansion**:
   - Added `diagnostics.view`, `diagnostics.perform`, `diagnostics.confirm`, `diagnostics.estimate`, and `work_order.manage` to `backend/src/common/capabilities.ts`.
   - Updated role presets and added `Diagnostic technician` preset.
3. **Backend Diagnostics Engine Integration**:
   - Integrated OBD normalizer, decoder, deterministic simulator, diagnostic rules, `AnthropicProvider`, and SHA-256 tamper-evident report generator.
4. **Work Orders Module & State Machine**:
   - Explicit 12-state machine (`work-order-state-machine.ts`) with transition rules.
   - Multi-tenant isolated `WorkOrdersService` and `WorkOrdersController`.
   - Post-repair verification with DTC re-scan requirement before completion.
5. **Parts Intelligence & Moroccan Supplier Catalog**:
   - Provider-neutral parts system with Moroccan distributor pricing in MAD (Autoplus Maroc, Somafaco, Maghreb Accessoires, Copart).
   - Tiers: `OEM_DIRECT`, `AFTERMARKET_PREMIUM`, `AFTERMARKET_STANDARD`, `ECONOMY`.
   - DTC to part matching and OEM cross-referencing.
6. **Customer Vehicle Health Translator**:
   - Evidence-grounded layman translation engine with monitored subsystem breakdowns and clear driveability verdicts without false precision.
7. **Frontend Diagnostics & Work Orders Workspaces**:
   - Integrated `DiagnosticsWorkspace`, `DiagnosticSessionView`, `CustomerVehicleHealthCard`, and `PartsCatalogMatcher`.
   - Integrated `/dashboard/work-orders` with status filters, KPI cards, transition modal, and DTC verification modal.
   - Merged localized i18n keys across `en.json`, `fr.json`, and `ar.json`.
8. **Adversarial & Financial Invariant Stress Testing**:
   - `automotive-adversarial.spec.ts` proving zero floating-point drift, negative value rejection, state machine jump prevention, and cross-tenant IDOR protection.
9. **Live Telemetry SSE Streaming & SVG Gauges**:
   - High-frequency Server-Sent Events (SSE) telemetry streaming endpoint (`GET /api/diagnostics/sessions/:id/stream`).
   - SVG interactive dials (RPM dial with redline alert, speedometer, coolant dial with >105°C alarm, fuel trims, engine load, and live packet stream).
10. **Predictive Maintenance & Service Interval Engine**:
    - `PredictiveMaintenanceService` scheduling wear items based on Moroccan road conditions.
    - Fleet-wide 30-day forecast overview in MAD with 20% VAT.
    - `PredictiveMaintenanceCard.tsx` UI with status filters and 1-click work order addition.
11. **Offline-Resilient Garage Buffer**:
    - `GarageOfflineBuffer` and `OfflineSyncBanner.tsx` for spotty garage WiFi networks with local draft buffering.
12. **Live-DB HTTP E2E Test Suite**:
    - `automotive-diagnostics.e2e-spec.ts` executing the complete 8-step journey over real HTTP against PostgreSQL (Intake -> Session -> Telemetry -> Parts -> Work Order -> Verification -> Completion -> Cross-Tenant 404).
13. **Automated Verification**:
    - Backend Unit Tests: **63/63 test suites passed, 523/523 tests passing**.
    - Backend Live-DB E2E: **3/3 test suites passed, 16/16 tests passing**.
    - Frontend Tests: **7/7 test files passed, 26/26 tests passing**.
    - TypeScript: **0 errors** across `backend`, `frontend`, and `mobile`.
    - Production Builds: Clean across `backend` and `frontend`.

---

## Next Horizon
1. **Cloud Deployment & Production Verification**:
   - Finalize Azure Container Apps deployment manifests and execute production gate criteria in `docs/PRODUCTION_GATE.md`.
2. **Hardware Bridge Expansion**:
   - Web Bluetooth / Web Serial adapter for live physical ELM327 dongle pairing in technician workstations.
