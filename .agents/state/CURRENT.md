# Current Operational State

**Last updated:** 2026-11-18

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`

**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`

**Current branch:** `codex/p0-01-ci-contexts`

**Current PR:** pending creation for `P0-01`

**Current base:** `origin/main` at `e010505e5f5ad53cc3bf9535e506668e2ed913ef`

**Active phase:** Phase 0 — control and one source of truth

**Active task:** `P0-01` — remove duplicate push+PR CI runs and establish stable required-check contexts, status `IN_PROGRESS`

**Next task:** `P0-02` — protect `main` and prove enforcement, after `P0-01` is accepted and merged

Always re-verify these drift-prone facts before acting.

## Completed before the current task

- Created the platform-readiness master plan and merged PR #28.
- Added a canonical execution board with stable task IDs, dependencies, status contract and acceptance evidence.
- Added the mandatory cross-AI start/pause/completion protocol.
- Replaced the obsolete automotive-branch resume state with this master-plan state.
- Updated repository instructions so agents do not work directly on `main` or resume from stale phase summaries.
- Corrected the plan so AI PRs #23–#26 remain unmerged until after the core pilot.
- Added duplicate-CI remediation, agency import safety and provisional pilot guardrails to the plan.

## Current task progress

- Verified PR #28 at exact head `2f2bbe4a82b61427f536895bc97e225f6beda79c`; all CI and Vercel preview checks were green.
- Merged PR #28 with explicit founder authorization; merge commit is `e010505e5f5ad53cc3bf9535e506668e2ed913ef`.
- Created `codex/p0-01-ci-contexts` from that exact `origin/main` and pushed coordination claim `b3003de`.
- Re-ran the mandatory repository, remote, branch, worktree and open-PR audit. The user-owned untracked `screenshots/` directory remains untouched.
- Obtained a bounded, read-only Antigravity review. It independently recommended limiting normal CI branch pushes to `main`, keeping PR/manual triggers, preserving the five job names, and leaving path-filtered mobile CI non-required.

## Last verified state

- PR #28 is merged into `main` as `e010505e5f5ad53cc3bf9535e506668e2ed913ef`.
- GitHub `main` had no branch protection and no ruleset.
- CI still triggers identical jobs on every branch push and again on pull requests; `P0-01` owns the correction and test-PR proof.
- Public `carhub.codes`, `/api/health` and `/api/ready` were reachable during the plan audit, but the exact production project/database/deployed-SHA provenance remains unverified.
- Render “My Workspace” had no matching `MOUBI9A/carhubos` service during the audit.
- The local untracked `screenshots/` directory is user-owned and must remain untouched.

## Files currently claimed by `P0-01`

- `.github/workflows/ci.yml`
- `docs/operations/CI_GOVERNANCE.md`
- `docs/progress/EXECUTION_BOARD.md`
- `.agents/state/CURRENT.md`
- `.agents/state/NEXT.md`
- `.agents/state/BLOCKERS.md`
- `COORDINATION.md` (claim/release commits only)

No runtime code, database schema, migration, deployment, provider, billing configuration, or customer data was changed.

## Exact resume action

1. Change `.github/workflows/ci.yml` so ordinary feature-branch pushes do not duplicate the pull-request run while `main` pushes and manual dispatch remain covered.
2. Document the five stable web/backend contexts, event matrix, mobile path-filter limitation and verification method.
3. Open the `P0-01` test PR, prove exactly one CI set and a green exact head, then move the task to `REVIEW`.
4. Do not begin `P0-02` or enable branch protection until `P0-01` is accepted and merged.

## Unresolved risks

- `main` remains unprotected.
- Feature-branch pushes without a PR will no longer run automatically after `P0-01`; manual dispatch remains available.
- Path-filtered mobile CI cannot be globally required until it reports a deterministic result for every PR.
- Production topology and database provenance are not fully verified.
- Several old phase summaries and historical documents remain stale; `P0-04` owns their reconciliation.
- AI, provider, payment, GPS, legal, mobile-store and real-user pilot work remain gated by later board tasks.
