# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Consolidate canonical documentation (`P0-04`)

**Status:** `IN_PROGRESS` on `codex/p0-04-doc-consolidation`.

- Point every active entry document to the canonical plan, execution board and current state.
- Mark obsolete phase narratives and work queues as historical/superseded without moving or deleting them.
- Verify links and conflicting source-of-truth claims, then open a scoped documentation PR.

## 2. Resolve CI security blocker and accept deduplication (`P0-01`)

**Status:** `BLOCKED` on draft PR #29 by B-007.

- Wait for a safe patched dependency or reviewed upstream dependency removal.
- Do not suppress the advisory or lower the production audit gate.
- Once safe, prove one green five-job CI set on the exact PR head and one push-triggered set after merge.

## 3. Protect `main` (`P0-02`)

**Status:** `NOT_STARTED`; blocked until `P0-01` is accepted and merged.

- Require PRs and the stable contexts.
- Block force pushes and deletion.
- Configure approval/conversation/stale-review policy and prove enforcement with a deliberately red test PR.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
