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
