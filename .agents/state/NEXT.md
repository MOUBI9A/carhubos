# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Remove duplicate CI execution (`P0-01`)

**Status:** `DONE`; PR #29 plus recovery PR #31 are merged, and all five jobs passed on canonical `main` run `44278183559`.

- Limit normal CI push coverage to `main`; preserve pull requests targeting `main` and manual dispatch.
- Keep the exact five web/backend job names stable.
- Document event behavior and why mobile CI is not yet globally required.
- The founder-approved, fail-closed, artifact-backed controls and daily monitor are active on `main` at `61e30ac`.

## 2. Protect `main` (`P0-02`)

**Status:** `READY`; claim on a new branch after this P0-01 closeout merges.

- Require PRs and the stable checks.
- Block force pushes and deletion.
- Configure approval/conversation/stale-review policy.
- Prove enforcement with a deliberately red test PR.

## 3. Consolidate canonical documentation (`P0-04`)

**Status:** `READY`; depends on completed `P0-00` and may proceed on a separate branch while B-007 blocks `P0-01`.

- Reconcile active progress/backlog/design/production-gate pointers.
- Mark stale readiness claims as historical without deleting useful evidence.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
