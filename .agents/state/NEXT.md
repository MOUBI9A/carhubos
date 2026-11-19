# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Add CODEOWNERS and authority matrix (`P0-03`)

**Status:** `REVIEW` on `codex/p0-03-codeowners-authority`.

- Add sensitive-path ownership without granting unverified authority.
- Record merge, deploy, migration, secret, AI, payment, and incident authority.

## 2. Consolidate canonical documentation (`P0-04`)

**Status:** `NOT_STARTED`; queued behind P0-03.

- Reconcile active progress/backlog/design/production-gate pointers.
- Mark stale readiness claims as historical without deleting useful evidence.

## 3. Verify production topology (`P0-05`)

**Status:** `NOT_STARTED`; queued behind the current Phase 0 governance tasks.

- Verify hosting project/team, deployed SHA, database/storage/DNS and migration provenance read-only.
- Record the exact main-to-production deployment trigger without exposing secrets.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
