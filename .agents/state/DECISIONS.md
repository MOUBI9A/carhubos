# Architectural Decision Records (ADR)

> The master plan and decisions below are binding for new work. ADR-001 and the remaining older automotive ADRs are retained as historical context and apply only if revalidated against the current execution board. ADR-001's branch choice is superseded by ADR-010.

## ADR-010: One canonical cross-AI execution system

- **Date:** 2026-11-17
- **Status:** Accepted in PR #28; canonical after merge.
- **Decision:** Every AI follows `AGENTS.md` → master plan → execution board → current state, claims one stable task ID, and updates the handoff files before stopping. No second roadmap may be created.
- **Reason:** Existing state files and phase summaries diverged and could send a new agent to an obsolete branch or duplicate completed work.
- **Consequences:** Progress becomes resumable and auditable; maintaining the board/current state is part of every task’s definition of done.

## ADR-011: Staged modular-monolith completion and web-first pilot

- **Date:** 2026-11-17
- **Status:** Accepted in the master plan.
- **Decision:** Keep the NestJS/Next.js/PostgreSQL modular monolith, protect and prove the non-AI web core first, then add governed capabilities in phase order.
- **Rejected:** rewrite, big-bang open-PR merge, and premature microservice split.
- **Consequences:** Some headline AI/mobile/GPS capabilities remain disabled while the core reaches a controlled pilot.

## ADR-012: AI and telemetry follow the stable core pilot

- **Date:** 2026-11-17
- **Status:** Accepted in the master plan.
- **Decision:** PRs #23–#26 are preserved but not merged before the Phase 3 core-pilot exit gate. Initial AI is fixed-tool/read-only/default-off. Initial GPS is passive/read-only with no vehicle-control path.
- **Reason:** Intelligence features must not hide or amplify defects in tenancy, money, consent, recovery or support.
- **Consequences:** AI rebase happens against post-pilot `main`; provider/model/GPS legal and security gates remain explicit.

## ADR-013: Protected PR workflow supersedes direct-to-main development

- **Date:** 2026-11-17
- **Status:** Accepted; enforcement is task `P0-02`.
- **Decision:** Use scoped branches, required CI and pull requests. Direct development on `main` is no longer the operating model.
- **Reason:** The real-user program needs reviewable exact-SHA evidence and cannot rely on voluntary local gates.
- **Consequences:** CI contexts must first be made unambiguous in `P0-01`; branch protection then becomes mandatory.

## ADR-014: Repository access does not imply production authority

- **Date:** 2026-11-19
- **Status:** Accepted under P0-03.
- **Decision:** Sensitive paths map to the founder/security owner in `.github/CODEOWNERS`. The founder's explicit 2026-11-18 autonomy instruction delegates only low-risk documentation, governance and test-only PR merges to Codex after every protected gate passes. Runtime, dependency, schema, infrastructure or deployment-affecting merges—and production deploys, migrations, secret operations, live AI/provider/payment activation, billing changes, customer-data exports, legal/public commitments and incident command—remain founder-gated under `docs/operations/AUTHORITY_MATRIX.md` until production topology and authority are deliberately revised.
- **Reason:** GitHub roles and AI tool access are technical capabilities, not proof of business, security, financial, legal or incident authority.
- **Consequences:** Collaborators may author and review without silently receiving production powers. AI merge execution is a narrow, explicit and revocable delegation rather than a consequence of tool access. Required CODEOWNER approval remains disabled until an independently accountable owner is confirmed, avoiding a solo-founder self-approval deadlock.

## Historical automotive decisions

## ADR-001: Dedicated Feature Branch for Automotive OS Platform
- **Date**: 2026-10-17
- **Decision**: Branch from latest hardened mobile & release baseline (`feat/mobile-app-store-release`) to `feat/automotive-os-platform`.
- **Reason**: Allows seamless integration of the diagnostics engine (`feat/production-diagnostics`) without risking main branch regressions until fully tested and verified.
- **Alternatives Considered**: Direct merge into main (rejected: would risk broken builds during incremental foundation expansion).
- **Consequences**: Fast, safe iteration cycle; full test safety net.

## ADR-002: Dual Diagnostic Brain (Deterministic Rules + AI Reasoning)
- **Date**: 2026-10-17
- **Decision**: Diagnostic engine must execute standard SAE J2012 deterministic rule evaluation before querying external AI. AI provides reasoning over ambiguous multi-source evidence, not raw DTC mapping.
- **Reason**: Automotive safety and latency: standard faults (P0301, P0171, P0420) must be evaluated deterministically, reliably, and cost-effectively without requiring external API roundtrips. AI is reserved for multi-signal synthesis and complex fault isolation.
- **Alternatives Considered**: Sole reliance on LLM (rejected: hallucination risk, cost, latency, non-determinism).
- **Consequences**: 100% reliable baseline diagnostic capability even during network or AI provider outages.

## ADR-003: Provider-Neutral Interface for AI Reasoning
- **Date**: 2026-10-17
- **Decision**: Define `DiagnosticReasoningProvider` interface and implement `AnthropicProvider` as an adapter. Core domain modules must not import `@anthropic-ai/sdk` directly.
- **Reason**: Prevents vendor lock-in. Enables effortless swapping to other providers (Azure OpenAI, DeepSeek, local LLMs) or running a mock provider for zero-cost unit and integration tests.
- **Alternatives Considered**: Direct NestJS service calling Anthropic SDK (rejected: leaks external SDK types across the codebase).
- **Consequences**: Easy mocking, test isolation, provider flexibility.

## ADR-004: Explicit Work Order State Machine
- **Date**: 2026-10-17
- **Decision**: Implement work orders as an explicit, auditable state machine with strict transition guards and automated audit logging.
- **Reason**: Garage operations require accountability. State changes (approval, parts received, QC sign-off, invoice) must have clear actors, timestamps, and preconditions.
- **Alternatives Considered**: Arbitrary status enum updates via standard CRUD (rejected: permits invalid transitions like moving from CANCELLED to IN_PROGRESS).
- **Consequences**: Absolute operational integrity for garage workflows.

## ADR-005: Provider-Neutral Parts Intelligence with Moroccan Market Localization
- **Date**: 2026-10-17
- **Decision**: Implement `IPartsProvider` interface with tier alternatives (`OEM_DIRECT`, `AFTERMARKET_PREMIUM`, `AFTERMARKET_STANDARD`, `ECONOMY`) and Moroccan supplier pricing in MAD (Autoplus Maroc, Somafaco, Maghreb Accessoires).
- **Reason**: Mechanics and garage managers need realistic local parts pricing and availability (IN_STOCK, 24H) to generate viable estimates and work orders without guessing.
- **Alternatives Considered**: Generic string inputs with no parts catalog or hardcoded US/European catalogs (rejected: US/EUR parts catalogs have irrelevant part numbers and non-MAD currencies).
- **Consequences**: Seamless integration from DTCs $\rightarrow$ matching parts $\rightarrow$ estimate $\rightarrow$ work order.

## ADR-006: Layman Customer Health Translation vs. False Precision
- **Date**: 2026-10-17
- **Decision**: Reject pseudo-scientific percentage health scores (e.g. "87.34% healthy") in favor of categorical subsystem evaluations (Engine, Cooling, Emissions, Fuel/Air, Electrical) and clear driveability verdicts ("Can I drive: Yes/No") with layman Q&A.
- **Reason**: Automotive safety and consumer trust: fake percentages deceive owners and expose garages to liability. Clear evidence-backed statuses grounded in verified DTCs and sensor boundaries provide actionable clarity.
- **Alternatives Considered**: Arbitrary composite numerical score algorithm (rejected: misleading, statistically undefendable).
- **Consequences**: High consumer trust, transparent dispute resolution, credible technician communication.

## ADR-007: Mandatory Post-Repair Diagnostic DTC Verification & Live-DB E2E Acceptance
- **Date**: 2026-10-18
- **Decision**: Work orders cannot transition to `COMPLETED` unless a certified post-repair verification is recorded certifying that active DTCs are cleared and road-test notes are supplied. This invariant is proven by a live-DB HTTP e2e test suite (`test/automotive-diagnostics.e2e-spec.ts`) against real PostgreSQL.
- **Reason**: Mechanics must not sign off on repairs without verifying that the root fault code does not return. Incomplete repairs returning to customers destroy trust and create repeat breakdowns.
- **Alternatives Considered**: Optional or advisory DTC check (rejected: mechanics forget or bypass checks under pressure).
- **Consequences**: Guaranteed proof of repair; automatic sync to vehicle's permanent `MaintenanceRecord` ledger only happens on confirmed, verified work orders.

## ADR-008: Automotive APM Tracing & Telemetry Stream Privacy (W3C TraceContext & VIN Masking)
- **Date**: 2026-10-18
- **Decision**: Ingest and propagate W3C `traceparent` and `X-Trace-Id` headers across all automotive routes via `AutomotiveTelemetryInterceptor`. Enforce mandatory VIN masking (`sanitizeVin`) in all structured JSON log emissions to prevent customer PII leakage to observability aggregators.
- **Reason**: Fleet and garage telemetry requires distributed tracing for diagnosis latency and token tracking, while strictly complying with data protection by never logging raw VINs in plaintext log indexes.
- **Alternatives Considered**: Plain console logging or unmasked VIN logging (rejected: security liability, unsearchable spans).
- **Consequences**: Production-ready Datadog / OpenTelemetry compatibility with guaranteed privacy.

## ADR-009: Automotive Knowledge Graph & Multi-DTC Copilot Synthesis
- **Date**: 2026-10-18
- **Decision**: Build an in-memory SAE J2012 / ISO 14229 Knowledge Graph with deep Moroccan fleet localization (extreme heat >45°C impact on cooling and coils; low cetane/sulfur & urban traffic impact on DPF soot accumulation in Casablanca/Rabat). Provide multi-DTC Copilot synthesis to correlate root causes (e.g. lean fuel trim causing misfire) and prioritize technician action plans.
- **Reason**: Mechanics need rapid, verified electrical/mechanical test steps with multimeter voltage and resistance ranges, factory torque specs, and local operating advice to avoid swapping expensive parts blindly.
- **Alternatives Considered**: Direct unprompted LLM queries on every DTC click (rejected: high latency, token cost, non-deterministic pinout values).
- **Consequences**: Instant technician guidance, accurate electrical diagnostic procedures, and evidence-grounded repair checklists.


