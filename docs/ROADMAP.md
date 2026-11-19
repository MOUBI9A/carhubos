# CarHub OS — Engineering Roadmap & Milestones

> [!WARNING]
> **Superseded automotive roadmap.** The phases and priorities below are retained only as automotive-diagnostics domain history. Do not execute or report project status from this file.
>
> Current authority: [AGENTS.md](../AGENTS.md) → [platform readiness master plan](operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md) → [execution board](progress/EXECUTION_BOARD.md) → [current verified state](../.agents/state/CURRENT.md).

This roadmap guides the autonomous transformation of CarHub OS into a production-grade automotive operating system connecting vehicles, telemetry, AI reasoning, repair workflows, work orders, and invoicing.

---

## Phase Overview & Progress

```mermaid
gantt
    title CarHub OS Engineering Phases
    dateFormat  YYYY-MM-DD
    section Discovery & Foundations
    Phase 0: Discovery & Repository Audit       :done, p0, 2026-10-17, 1d
    Phase 1: Architecture & Domain Blueprint    :done, p1, 2026-10-17, 1d
    Phase 2: Foundation & Engine Unification    :active, p2, 2026-10-17, 2d
    section Core Domain & Intelligence
    Phase 3: Core Automotive Diagnostics & OBD :p3, after p2, 2d
    Phase 4: AI Diagnostic Engine & Reasoning   :p4, after p3, 2d
    Phase 5: Repair Operations & Work Orders    :p5, after p4, 2d
    section Experience & Hardening
    Phase 6: Technician Bay UX & Customer View  :p6, after p5, 2d
    Phase 7: Provider Adapters & Telemetry Stream:p7, after p6, 2d
    Phase 8: Security, Tenant Red Team & QA     :p8, after p7, 2d
    Phase 9: Production Readiness & Gate        :p9, after p8, 1d
```

---

## Phase Breakdown

### Phase 0: Discovery & Repository Audit [COMPLETE]
- Comprehensive inspection of branches (`main`, `feat/production-diagnostics`, `feat/mobile-app-store-release`, `feat-telematics-gps`).
- Evaluation of toolchains: NestJS 11 backend, Next.js 16 frontend, Expo 52 mobile.
- Clean verification of existing test suites (53/53 backend suites, 433 tests; Vitest frontend; mobile typecheck).

### Phase 1: Architecture & Operating State [COMPLETE]
- System architecture definition (`docs/ARCHITECTURE.md`).
- Domain model, state machines, and invariants (`docs/DOMAIN_MODEL.md`).
- Operational state repository setup (`.agents/state/CURRENT.md`, `DECISIONS.md`, `BLOCKERS.md`, `NEXT.md`).
- Specialized architectural blueprints (`TELEMETRY_ARCHITECTURE.md`, `AI_DIAGNOSTIC_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`, `MULTI_TENANCY.md`, `API_CONTRACTS.md`, `PRODUCTION_GATE.md`).

### Phase 2: Foundation & Engine Unification [IN PROGRESS]
- Bring foundational diagnostics models into current unified schema:
  - `DiagnosticVehicle`, `DiagnosticSession`, `DiagnosticReport` (with JSON evidence, DTCs, freeze frames).
  - Capabilities expansion: `diagnostics.view`, `diagnostics.perform`, `diagnostics.confirm`, `diagnostics.estimate`, `work_order.manage`.
- Connect `DiagnosticsModule` to NestJS `AppModule`.
- Implement robust OBD normalizer, decoder, and deterministic simulator.
- Verify migration stability and Prisma client generation.
- Ensure backend unit and integration test suites pass cleanly.

### Phase 3: Core Automotive Diagnostics & OBD Pipeline
- Ingestion endpoints for live OBD telemetry and batch frames (`POST /api/diagnostics/sessions/:id/events`).
- Streaming session processor with PID validation (RPM, ECT, MAF, MAP, STFT/LTFT, O2).
- DTC catalog and freeze-frame analysis engine with SAE J2012 compliance.
- Integration of deterministic simulator scenarios:
  - Normal idle, Cold start, Highway cruise.
  - Cylinder 1 misfire (P0301), Random misfire (P0300).
  - System too lean Bank 1 (P0171), Catalyst efficiency (P0420).
  - Coolant overheating, Sensor dropouts, Malformed packet recovery.

### Phase 4: Diagnostic Intelligence & AI Reasoning
- Provider-neutral AI reasoning abstraction (`DiagnosticReasoningProvider`).
- Anthropic Claude implementation (`AnthropicProvider`) with structured output validation.
- Evidence synthesis: Combining DTCs, freeze-frame sensor data, symptoms, and service history.
- Structured confidence classification (`confirmed`, `high`, `probable`, `possible`, `insufficient_evidence`).
- Technician sign-off and test confirmation flow (`POST /api/diagnostics/sessions/:id/confirm`).

### Phase 5: Repair Operations, Estimates & Work Order State Machine
- Repair procedure recommendations mapped to identified failure modes.
- Parts matching with OEM and aftermarket cross-referencing.
- Labor operation calculator (hours $\times$ hourly rate) and parts pricing.
- Customer estimate generation with digital approval workflow (`POST /api/diagnostics/sessions/:id/estimate`).
- Work order state machine implementation:
  - `DRAFT` $\rightarrow$ `AWAITING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `SCHEDULED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_PARTS` $\rightarrow$ `BLOCKED` $\rightarrow$ `QUALITY_CHECK` $\rightarrow$ `COMPLETED` $\rightarrow$ `INVOICED`.
- Post-repair verification checklist (DTC clear, verification road-test rescan).

### Phase 6: Premium UX — Technician Diagnostic Bay & Customer View
- **Technician Diagnostic Bay View (`/dashboard/diagnostics`):**
  - High-density layout tailored for garage tablets and tough workstation screens.
  - Live telemetry gauge / sparkline charts (RPM, Coolant, Fuel trims, O2 voltages).
  - Active & pending DTC cards with freeze-frame drawers.
  - AI Copilot diagnostic drawer with evidence cards and test recommendations.
  - Real-time work order progression controls.
- **Customer Vehicle Health Portal:**
  - Jargon-free problem descriptions, severity meters, and interactive estimate approval.
- Full responsive support (1440px desktop down to 360px mobile).
- Strict WCAG 2.1 AA accessibility compliance (color contrast, ARIA landmarks, keyboard navigation).

### Phase 7: Provider Adapters & Telemetry Stream
- Provider-neutral adapters:
  - `AnthropicProvider` (Claude 3.5 Sonnet / Haiku).
  - `PartsCatalogProvider` (OEM / Aftermarket catalog abstraction).
  - `TelemetryStreamProvider` (WebSocket / SSE stream adapter).
- Resilient retry policies, backoff mechanisms, and circuit breakers.

### Phase 8: Hardening, Security Red-Team & QA
- Multi-tenant boundary penetration test suite (cross-tenant reads/writes, IDOR probes).
- Concurrency and transaction safety tests (booking collisions, work order mutations).
- Full browser QA automation with Playwright.
- Observability and structured logging (audit logs, correlation IDs, timing metrics).

### Phase 9: Production Gate Verification
- Clean build of backend, frontend, and mobile.
- Zero open P0/P1 issues.
- Complete end-to-end evidence run (intake $\rightarrow$ telemetry $\rightarrow$ AI diagnosis $\rightarrow$ estimate $\rightarrow$ work order $\rightarrow$ completion).
- Synchronized documentation reflecting exact shipped functionality.
