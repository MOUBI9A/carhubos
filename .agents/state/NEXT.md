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
8. **Automated Verification**:
   - Backend tests: **60/60 test suites passed, 504/504 tests passing**.
   - Frontend tests: **5/5 test files passed, 19/19 tests passing**.
   - TypeScript: **0 errors** across `backend`, `frontend`, and `mobile`.

---

## Next Horizon
1. **Real-time Telemetry Streaming**:
   - Server-Sent Events (SSE) streaming endpoint for live OBD telemetry packet feed in technician workstation.
2. **Cloud Deployment & Production Verification**:
   - Validate Azure Container Apps deployment configs and production gate criteria in `docs/PRODUCTION_GATE.md`.
