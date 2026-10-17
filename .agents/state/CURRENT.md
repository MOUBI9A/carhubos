# Current Operational State

- **Active Branch**: `feat/automotive-os-platform`
- **Active Phase**: Phase 2 (Foundation & Engine Unification)
- **Current Objective**: Unify automotive diagnostics domain, Prisma schema, OBD telemetry normalizer, deterministic simulator, and AI reasoning engine into the core platform with 100% green tests.

---

## Working Subsystems
- **Multi-tenant Core**: Agency tenant isolation, scoped queries, capability engine (`AgencyMembership`).
- **Fleet & Assets**: Vehicles (`Car`), Car Documents, Maintenance Records, Accidents.
- **Financial Engine**: Bookings, Invoices, Payments, Stripe / Mock gateway integration, Decimal precision.
- **Renter & Consent Vault**: HMAC salted identity hash, consent grants, document vault.
- **Frontend Stack**: Next.js 16 App Router, Tailwind CSS, multi-lingual i18n (FR, AR, EN).
- **Mobile Stack**: Expo 52 React Native mobile application.

---

## Recent Verification Evidence
- Backend test suite: **53 passed, 53 total; 433 tests passing** (Jest).
- Backend TypeScript: `tsc --noEmit` **0 errors**.
- Frontend Vitest suite: **3 passed, 3 total; 9 tests passing**.
- Frontend TypeScript: `tsc --noEmit` **0 errors**.
- Mobile TypeScript: `tsc --noEmit` **0 errors**.

---

## Active Work in Progress
- Integrating `DiagnosticVehicle`, `DiagnosticSession`, `DiagnosticReport` into `backend/prisma/schema.prisma`.
- Wiring `DiagnosticsModule`, `DiagnosticsService`, `DiagnosticsController` into NestJS `AppModule`.
- Expanding capability catalog in `backend/src/common/capabilities.ts` with `diagnostics.*` and `work_order.*`.
- Porting and verifying OBD normalizer, decoder, deterministic simulator, and diagnostic rules.
