# ADR-001: Runtime validation for dashboard API contracts

**Status:** Proposed in `codex/api-contract-boundary`  
**Date:** 2026-11-16  
**Deciders:** Founder and CarHub OS maintainers

## Context

The owner dashboard consumed untyped JSON from the work-order metrics and predictive-maintenance endpoints. A stale frontend field name (`forecast30DaysMad` instead of `projected30DayCostMad`) reached production and could crash the dashboard. TypeScript interfaces do not validate network responses, and a frontend-only fixture does not prove that the live NestJS response still matches the consumer.

The first increment must remain frontend-only, preserve each widget when the other endpoint fails, and add a CI signal for real backend drift without introducing an API-generation pipeline.

## Decision

Declare Zod as a direct frontend dependency and define reusable runtime schemas for the two operational-pulse responses. Fetch and validate each endpoint independently; malformed, non-finite, non-JSON, or unsuccessful responses become `null` for that widget while valid sibling data remains available.

Use the same schemas in two test layers:

1. Vitest fixtures cover missing, renamed, wrong-type, `NaN`, `Infinity`, and partial-failure behavior.
2. A Playwright test calls the real authenticated NestJS endpoints in the isolated CI stack and validates their responses with those schemas.

Schemas accept additional fields so additive backend changes remain backward compatible.

## Options considered

### A. Hand-written type guards

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Runtime safety | Medium; easy to omit edge cases |
| Dependency cost | None |
| Maintenance | Duplicates interfaces and validation logic |

### B. Zod schemas plus live-stack contract test

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Runtime safety | High for the validated boundary |
| Dependency cost | One small direct frontend dependency |
| Maintenance | Types derive from schemas; CI checks actual responses |

### C. Generated OpenAPI client

| Dimension | Assessment |
|---|---|
| Complexity | High for the first increment |
| Runtime safety | Requires a validation-capable generator or plugin |
| Dependency cost | Backend annotations, spec generation, client generation |
| Maintenance | Best long-term synchronization once adopted platform-wide |

## Trade-off analysis

Option B adds a dependency and keeps a small amount of contract knowledge in the frontend, but it prevents runtime crashes immediately and the live-stack test detects backend drift. Option C is the stronger platform-wide destination, but introducing it for two endpoints would expand the change into backend annotations, generated artifacts, and CI tooling.

## Consequences

- Dashboard widgets degrade independently instead of discarding both responses.
- Non-finite numbers and stale field names cannot reach rendering code.
- The CI Playwright job fails when the real backend response no longer satisfies the frontend contract.
- Future consumers should add schemas at their network boundary rather than casting JSON.
- OpenAPI generation should be reconsidered when several modules need the same treatment or external API consumers are introduced.

## Action items

1. [x] Add operational-pulse schemas and independent fetching.
2. [x] Add fixture-level validation tests.
3. [x] Add an authenticated live-stack Playwright contract test.
4. [ ] Expand the pattern to the next production mismatch only after this increment is reviewed and merged.
5. [ ] Evaluate generated OpenAPI clients as a separate architecture change when contract coverage grows.
