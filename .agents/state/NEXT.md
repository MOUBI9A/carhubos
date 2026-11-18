# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Protect `main` (`P0-02`)

**Status:** `REVIEW`; protection is live and red proof PR #33 was blocked. Documentation PR pending.

- Merge the protection documentation only after all five required checks pass.
- Re-verify the live API after merge, record the result, and release the P0-02 claim.

## 2. Add CODEOWNERS and authority matrix (`P0-03`)

**Status:** `NOT_STARTED`; blocked until P0-02 documentation merges.

- Add sensitive-path ownership without inventing unavailable reviewers.
- Record merge, deploy, migration, secret, AI, payment, and incident authority.

## 3. Consolidate canonical documentation (`P0-04`)

**Status:** `NOT_STARTED`; keep queued behind P0-03 unless explicitly reprioritized.

- Reconcile active progress/backlog/design/production-gate pointers.
- Mark stale readiness claims as historical without deleting useful evidence.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
