# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Consolidate canonical documentation (`P0-04`)

**Status:** `IN_PROGRESS` on existing draft PR #30.

- Preserve the useful seven-document hierarchy/banner work while merging current `main` without rewriting branch history.
- Remove stale B-007/current-state edits and re-run link, source-of-truth and protected-CI evidence.

## 2. Verify production topology (`P0-05`)

**Status:** `NOT_STARTED`; queued behind the current documentation reconciliation.

- Verify hosting project/team, deployed SHA, database/storage/DNS and migration provenance read-only.
- Record the exact main-to-production deployment trigger without exposing secrets.

## 3. Define environment/provider/data rules (`P0-06`)

**Status:** `NOT_STARTED`; depends on P0-05.

- Define allowed data, credentials, providers, flags, seeding, retention and approvals for every environment.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
