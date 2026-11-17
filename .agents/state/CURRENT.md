# Current Operational State

**Last updated:** 2026-11-17

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`

**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`

**Current setup branch:** `codex/platform-readiness-master-plan`

**Current setup PR:** #28 — draft, clean/mergeable at the last verification

**Audited base:** `origin/main` at `6a61b3c54d148e79b1dd82dcbc922f07607b2004`

**Active phase:** Phase 0 — control and one source of truth

**Active task:** `P0-00` — cross-AI execution system, status `REVIEW`; consult PR #28 for the live head/check state

**Next task:** `P0-01` — remove duplicate CI runs and establish stable required-check contexts

Always re-verify these drift-prone facts before acting.

## Completed in the current task

- Created the platform-readiness master plan and draft PR #28.
- Added a canonical execution board with stable task IDs, dependencies, status contract and acceptance evidence.
- Added the mandatory cross-AI start/pause/completion protocol.
- Replaced the obsolete automotive-branch resume state with this master-plan state.
- Updated repository instructions so agents do not work directly on `main` or resume from stale phase summaries.
- Corrected the plan so AI PRs #23–#26 remain unmerged until after the core pilot.
- Added duplicate-CI remediation, agency import safety and provisional pilot guardrails to the plan.

## Last verified state

- PR #28 was clean and mergeable before this continuity update; all duplicate backend, container, live-Postgres E2E, frontend, full Playwright and Vercel preview checks passed on the prior head.
- GitHub `main` had no branch protection and no ruleset.
- CI currently triggers identical jobs on every branch push and again on pull requests, producing duplicate status contexts.
- Public `carhub.codes`, `/api/health` and `/api/ready` were reachable during the plan audit, but the exact production project/database/deployed-SHA provenance remains unverified.
- Render “My Workspace” had no matching `MOUBI9A/carhubos` service during the audit.
- The local untracked `screenshots/` directory is user-owned and must remain untouched.

## Files changed by `P0-00`

- `AGENTS.md`
- `CLAUDE.md`
- `COORDINATION.md` (claim/release commits only)
- `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`
- `docs/operations/AI_CONTINUITY_PROTOCOL.md`
- `docs/progress/EXECUTION_BOARD.md`
- `.agents/state/CURRENT.md`
- `.agents/state/NEXT.md`
- `.agents/state/BLOCKERS.md`
- `.agents/state/DECISIONS.md`

No runtime code, database schema, migration, deployment, provider, billing configuration, or customer data was changed.

## Exact resume action

1. Verify Git/PR state and read the canonical files in the order required by `AGENTS.md`.
2. Finish review/acceptance of `P0-00` and merge PR #28 only with explicit human authorization.
3. After `P0-00` is merged, claim `P0-01` in the execution board and `COORDINATION.md` on a new scoped branch.
4. For `P0-01`, change CI triggers so a PR produces one unambiguous set of checks while preserving push-to-main coverage; verify with a test PR before enabling branch protection.

## Unresolved risks

- The continuity system is not canonical for agents starting from `main` until PR #28 is accepted and merged.
- `main` remains unprotected.
- Production topology and database provenance are not fully verified.
- Several old phase summaries and historical documents remain stale; `P0-04` owns their reconciliation.
- AI, provider, payment, GPS, legal, mobile-store and real-user pilot work remain gated by later board tasks.
