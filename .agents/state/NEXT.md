# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Retire withdrawn dependency exception (`P0-08`)

**Status:** `REVIEW`; local gate and independent review pass; protected PR pending.

- Remove the exception wrapper, tests, monitor and artifact-only steps.
- Restore `npm audit --omit=dev --audit-level=high` and prove all protected checks green.

## 2. Close protected-main task (`P0-02`)

**Status:** `REVIEW`; policy and red-PR enforcement proof are merged, but post-merge `main` must return green after P0-08.

- Re-verify the live protection API after P0-08 merges.
- Record canonical green `main` evidence and mark P0-02 done.

## 3. Add CODEOWNERS and authority matrix (`P0-03`)

**Status:** `NOT_STARTED`; claim after P0-08 and P0-02 closeout.

- Add sensitive-path ownership without inventing unavailable reviewers.
- Record merge, deploy, migration, secret, AI, payment, and incident authority.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
