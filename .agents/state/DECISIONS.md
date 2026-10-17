# Architectural Decision Records (ADR)

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

