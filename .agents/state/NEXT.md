# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Accept the continuity setup (`P0-00`)

**Status:** `REVIEW` after PR #28 is pushed.

- Review the plan, protocol, board and state files for consistency.
- Confirm the PR exact head is green.
- Merge only with explicit human authorization.
- After merge, mark `P0-00` `DONE`, add the merge SHA to the board and refresh `.agents/state/CURRENT.md`.

## 2. Remove duplicate CI execution (`P0-01`)

**Status:** `NOT_STARTED`; change it to `READY` after dependency `P0-00` becomes `DONE`.

- Current cause: `.github/workflows/ci.yml` runs on every branch push and again for pull requests.
- Target: one unambiguous five-job web/backend CI set per PR, push-to-main coverage preserved, mobile behavior explicitly documented.
- Acceptance: a test PR shows one set of stable contexts and passes all checks.

## 3. Protect `main` (`P0-02`)

**Status:** `NOT_STARTED`; depends on `P0-01`.

- Require PRs and the stable checks.
- Block force pushes and deletion.
- Configure approval/conversation/stale-review policy.
- Prove enforcement with a deliberately red test PR.

Do not skip ahead to AI, telemetry, provider activation, schema consolidation or pilot onboarding while these dependencies are incomplete.
