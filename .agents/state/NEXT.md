# Next Engineering Priorities

The following high-leverage tasks are queued in sequence:

1. **Prisma Schema & Migrations**:
   - Add `DiagnosticVehicle`, `DiagnosticSession`, and `DiagnosticReport` models to `backend/prisma/schema.prisma`.
   - Update `Agency`, `User`, and `Car` relation fields.
   - Run `npx prisma generate` and verify types compile.
2. **Capabilities Matrix Expansion**:
   - Add `diagnostics.view`, `diagnostics.perform`, `diagnostics.confirm`, `diagnostics.estimate`, and `work_order.manage` to `backend/src/common/capabilities.ts`.
   - Update role presets (`OWNER`, `MANAGER`, `AGENT`).
3. **Backend Diagnostics Engine Integration**:
   - Port `backend/src/diagnostics/` module:
     - `diagnostics.controller.ts`, `diagnostics.service.ts`, `diagnostics.module.ts`.
     - `dto/diagnostics.dto.ts`.
     - `obd/normalizer.ts`, `obd/obd-decoder.ts`, `obd/telemetry.types.ts`.
     - `rules/diagnostic-rules.ts`.
     - `simulator/simulator.ts`, `simulator/scenarios.ts`.
     - `providers/diagnostic-provider.ts`, `providers/anthropic.provider.ts`.
     - `estimates/estimate-calculator.ts`.
     - `reports/diagnostic-report.service.ts`.
   - Wire `DiagnosticsModule` into `backend/src/app.module.ts`.
4. **Verification & Tests**:
   - Run `npx tsc --noEmit` on backend.
   - Run `npx jest` to verify all diagnostic tests pass alongside existing 53 suites.
5. **Frontend Diagnostics Workspace Integration**:
   - Wire `/dashboard/diagnostics` and `/agent/diagnostics` routes.
   - Connect `DiagnosticsWorkspace`, `DiagnosticSessionView`, and `DiagnosticFeedback` components.
   - Add Sidebar navigation entry with diagnostic status badge.
6. **Work Order & Repair Operations**:
   - Implement Work Order state machine and procedures tracking.
