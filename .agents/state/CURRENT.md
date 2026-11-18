# Current Operational State

**Last updated:** 2026-11-18

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`

**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`

**Current branch:** `codex/p0-01-ci-contexts`

**Current PR:** #29 — in review; hardening head `9158de7` passed all five jobs on run `44269223199`

**Current base:** `origin/main` at `e010505e5f5ad53cc3bf9535e506668e2ed913ef`

**Active phase:** Phase 0 — control and one source of truth

**Active task:** `P0-01` — remove duplicate push+PR CI runs and establish stable required-check contexts, status `REVIEW`

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
- Changed the CI branch-push trigger from every branch to `main` only and added `docs/operations/CI_GOVERNANCE.md` with the event/check/mobile contract.
- Antigravity performed a second read-only diff review and returned `PASS`; YAML parsing and `git diff --check` also passed.
- Manual run `44230394964` on implementation head `ad585eb0a28096b9dae0ded718d8821607b4308a` created exactly the five expected jobs. Backend, backend E2E, backend container and full-stack E2E passed; frontend failed only at the unchanged production dependency audit.
- Opened draft PR #29. Exact head `8171ef517ce9654a26a04c5cef68ca804c90fe12` received one `pull_request` CI run (`44231169636`) and no feature-branch `push` run, proving the duplication fix on that head.
- Investigated the audit failure. `GHSA-fc5q-39xc-vjpf` affects every published `picomatch` release through current latest `4.0.7`; no safe npm upgrade exists. An attempted lockfile-only update could not clear the audit and was fully reverted.
- Proved that an exact `@parcel/watcher@2.5.1` override is not a safe workaround: its `micromatch -> picomatch` chain remains affected and the production audit still fails. The attempted package and lock changes were fully reverted.
- Verified the current reachability boundary: `next-intl` extraction/watch options are disabled, the watcher subscription is not started, and no application/user input supplies glob patterns through this path.
- Obtained a bounded Antigravity read-only assessment. It supports only an exact-path, fail-closed, expiring exception with formal approval and continuous monitoring; its opinion is not authorization or runtime proof.
- Added `docs/security/DEPENDENCY_EXCEPTION_GHSA_FC5Q_39XC_VJPF.md` as a proposed, inactive 14-day exception with exposure analysis, mandatory controls, removal triggers and a pending approval record.
- Obtained explicit founder/security approval for the 14-day exception from Hamza El Moueddane on 2026-11-18.
- Implemented the fail-closed audit wrapper in `frontend/scripts/audit-production.mjs` with hardcoded UTC expiry `2026-12-02T23:59:59Z`, exact tuple validation, disabled extractor check, and audit artifact generation.
- Added fail-closed unit tests in `frontend/scripts/audit-production.test.mjs` proving all required pass and fail conditions.
- Updated `.github/workflows/ci.yml` to replace the frontend audit step with `node scripts/audit-production.mjs` and upload audit artifacts; backend audit remains unchanged.
- Adversarial review reproduced a fail-open advisory identity check, incomplete installed-chain validation and missing daily upstream monitoring; all three were fixed in `9158de7`.
- Added `.github/workflows/dependency-exception-monitor.yml` to re-evaluate the audit daily and fail when npm publishes a version newer than the reviewed `picomatch@4.0.7`.
- Verified frontend checks locally: real audit wrapper, typecheck, 15 Vitest suites (64 tests), ESLint and production build all pass. ESLint retains three pre-existing navigation warnings and no errors.

## Last verified state

- PR #28 is merged into `main` as `e010505e5f5ad53cc3bf9535e506668e2ed913ef`.
- GitHub `main` had no branch protection and no ruleset.
- Draft PR #29 changes the branch-push trigger to `main`; its PR head produced exactly one automatic five-job CI set.
- All five GitHub Actions CI jobs passed on run `44269223199` for hardening head `9158de7`: Backend, Backend e2e, Backend production container, Frontend, and E2E full stack.
- The 14-day fail-closed dependency exception for `GHSA-fc5q-39xc-vjpf` was approved by the founder on 2026-11-18, hardened after adversarial review, and is monitored daily after merge.
- Public `carhub.codes`, `/api/health` and `/api/ready` were reachable during the plan audit, but the exact production project/database/deployed-SHA provenance remains unverified.
- Render “My Workspace” had no matching `MOUBI9A/carhubos` service during the audit.
- The local untracked `screenshots/` directory is user-owned and must remain untouched.

## Files currently claimed by `P0-01`

None. The claim is released; PR #29 is in `REVIEW` awaiting the final state-only head check and founder merge gate.

No runtime code, database schema, migration, deployment, provider, billing configuration, or customer data was changed.

## Exact resume action

1. Verify the final state-only PR head receives exactly one green five-job CI run.
2. Merge PR #29 into `main` only after the founder merge gate.
3. After merge, verify that `origin/main` receives exactly one push-triggered CI run and all 5 jobs remain green. Mark `P0-01` `DONE`.
4. Proceed to `P0-02` (protect `main` and prove enforcement) or rebase PR #30 (`codex/p0-04-doc-consolidation`) onto updated `main`.

## Unresolved risks

- `main` remains unprotected.
- The approved exception expires at `2026-12-02T23:59:59Z`; a permanent patched dependency or reviewed replacement is still required before then.
- Feature-branch pushes without a PR will no longer run automatically after `P0-01`; manual dispatch remains available.
- Path-filtered mobile CI cannot be globally required until it reports a deterministic result for every PR.
- Production topology and database provenance are not fully verified.
- Several old phase summaries and historical documents remain stale; `P0-04` owns their reconciliation.
- AI, provider, payment, GPS, legal, mobile-store and real-user pilot work remain gated by later board tasks.
