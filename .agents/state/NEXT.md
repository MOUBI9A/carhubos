# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Remove duplicate CI execution (`P0-01`)

**Status:** `IN_PROGRESS` on `codex/p0-01-ci-contexts`.

- Limit normal CI push coverage to `main`; preserve pull requests targeting `main` and manual dispatch.
- Keep the exact five web/backend job names stable.
- Document event behavior and why mobile CI is not yet globally required.
- Open a test PR and prove exactly one green CI set on its exact head.

## 2. Protect `main` (`P0-02`)

**Status:** `NOT_STARTED`; depends on accepted and merged `P0-01`.

- Require PRs and the stable checks.
- Block force pushes and deletion.
- Configure approval/conversation/stale-review policy.
- Prove enforcement with a deliberately red test PR.

## 3. Consolidate canonical documentation (`P0-04`)

**Status:** `NOT_STARTED`; depends on `P0-00` and is unblocked after the current serialized task.

- Reconcile active progress/backlog/design/production-gate pointers.
- Mark stale readiness claims as historical without deleting useful evidence.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
