# Current Operational State

**Last updated:** 2026-11-19

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`

**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`

**Current branch:** `codex/p0-05-topology-audit`

**Current PR:** #39 — draft; implementation and independent review complete, protected exact-head checks pending

**Current base:** `origin/main` at `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`

**Active phase:** Phase 0 — control and one source of truth

**Active task:** `P0-05` — verify production topology and deployment trigger read-only, status `REVIEW`

**Next task:** finish protected review for PR #39; merge only through the founder/release-owner gate, then begin `P0-06`

Always re-verify these drift-prone facts before acting.

## Current P0-05 evidence

- P0-04 PR #30 merged as `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`; canonical run `44481889569` passed all five required jobs.
- P0-05 was claimed on `codex/p0-05-topology-audit`; claim commit `480860db92069f92bb16bd7c5997f92cdef34d4a` is pushed.
- Vercel team `hel-moues-projects` owns project `carhubos`, which is linked to `MOUBI9A/carhubos` with production branch `main`.
- Current production is Vercel deployment `dpl_CoTyp78nFzyKXiSmQpKhG8tcziTv`, READY on exact SHA `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`.
- `main` auto-deploys to production; feature branches create previews. There is no staging promotion between protected `main` and production.
- `carhub.codes` and `www.carhub.codes` are valid Vercel domains. Public page, API health and API readiness checks returned HTTP 200 after redirects; readiness reported the database reachable.
- Production data is Supabase project `carhubos` in `eu-west-1`, PostgreSQL `17.6.1.147`, status `ACTIVE_HEALTHY`; storage bucket `vault-files` is private.
- All 21 checked-in Prisma migration names exist in production `_prisma_migrations`, finished with no rollback marker. Supabase's separate migration registry is empty because Prisma owns migration history.
- Production startup does not run `prisma migrate deploy`; CI and local Compose migration gates do not protect the Vercel production release.
- Render `My Workspace` has no service or database linked to this repository. `carhub-infinity-api` belongs to the different `MOUBI9A/carhub-infinity` repository.
- Production has 41 ordinary public-schema tables; 33 lack RLS, but direct checks found zero DML grants to `anon` or `authenticated`. This is a contained defense-in-depth gap, not proof of current anonymous access.
- Only Production Vercel variables are configured. Secret values were not read or copied; no production mutation or customer-row export occurred.
- Detailed evidence and limitations are recorded in `docs/operations/PRODUCTION_TOPOLOGY.md`.
- A bounded read-only Antigravity review returned `NO BLOCKER`; it found the production/Preview distinction, migration conclusions, RLS wording, secret handling and release restrictions consistent.
- Draft PR #39 is open for the documentation-only change; exact-head CI, Vercel Preview and the founder/release-owner merge gate remain pending.

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
- PR #29 was authorized and merged as `2c9c93f9cc88a81650a3e59e33b75b3cfc1ed443`, but a stale interactive Antigravity session pushed `a697a31` during the merge window and reverted the approved controls before GitHub created the merge commit.
- Stopped the stale interactive process, preserved Git history, created `codex/p0-01-recover-approved-controls` from the actual merged `main`, and pushed exclusive recovery claim `4a113e2`.
- The recovery restores the exact implementation previously reviewed at `e2a5942`; no force push or direct edit to `main` is used.
- Recovery PR #31 passed all five jobs on exact head `5e571ab`, merged as `61e30aca33d196442ec74926e0f911e63e15f4ab`, and produced exactly one push-triggered run on `main`.
- Canonical `main` run `44278183559` passed Backend, Backend e2e, Backend production container, Frontend, and E2E full stack; P0-01 acceptance is complete.
- Merged P0-01 closeout PR #32 as `4421ec39217484d5f5fffe26c3820414637f5295` and claimed P0-02 on `codex/p0-02-branch-protection`.
- Applied `main` branch protection through the GitHub API: pull requests required; strict five-check gate; stale-review dismissal; conversation resolution; admin enforcement; force pushes and deletion disabled; zero mandatory approvals for the solo-founder repository.
- Opened disposable red proof PR #33 at `79a18e1`; its isolated TS2322 failure made the required Frontend check fail in run `44280610548`, and GitHub reported `mergeStateStatus: BLOCKED`.
- Closed PR #33 without merge and deleted only its disposable local and remote branch after evidence capture.
- A bounded read-only Antigravity review returned `NO BLOCKER`; it confirmed the solo-owner zero-approval policy avoids self-approval deadlock while retaining mandatory PR, strict CI, conversation, admin, force-push, and deletion protections.
- P0-02 PR #34 passed all five protected checks, became `CLEAN`, and merged as `b7cc4156f61ca017ef08aaec190d7e8672b59a67`; the live protection API remained correct after merge.
- Canonical `main` run `44440792583` failed closed in the frontend because `npm audit --omit=dev --json` now exits `0` while the temporary exception wrapper required status `1` for the approved finding.
- GitHub's advisory API reports `GHSA-fc5q-39xc-vjpf` withdrawn at `2026-11-18T15:38:56Z`; a local unchanged-tree production audit on 2026-11-19 reports zero findings at every severity.
- Claimed urgent P0-08 to remove the obsolete wrapper, monitor, artifacts and exception-only tests and restore the standard frontend production audit.
- Verified P0-08 locally: direct production audit reports zero vulnerabilities; TypeScript passes; 14 Vitest suites / 55 non-exception tests pass; ESLint has zero errors and the same three pre-existing navigation warnings; production build, workflow YAML and diff checks pass.
- A bounded read-only Antigravity review returned `NO BLOCKER`, confirming complete exception cleanup, restored standard auditing, unchanged severity threshold, preserved historical evidence, and consistent operational state.
- P0-08 PR #35 passed all five protected checks plus Vercel on exact head `8b461b8`, became `CLEAN`, and merged as `eba3c5cd9aab02e15b99f2a85a45561bdf541654`.
- Canonical `main` run `44442498902` passed all five jobs, including the restored standard production audit; live branch protection was reverified with the same strict five contexts and safety controls.
- P0-08 and P0-02 now satisfy their acceptance evidence and are marked `DONE`; P0-03 is the next ready task.
- P0-02/P0-08 closeout PR #36 passed all five protected checks plus Vercel and merged as `4fd683d5f80a0638e7c5d6185d886e809b6ab7ae`.
- Claimed P0-03 on `codex/p0-03-codeowners-authority`; live collaborator inventory shows founder/admin `@MOUBI9A` and write collaborator `@ChaimaAhaik`.
- Added founder-owned sensitive-path mappings in `.github/CODEOWNERS` and a release/incident authority matrix that separates repository access from production, payment, secret, provider, data, legal and incident authority.
- Recorded ADR-014 and documented why mandatory CODEOWNER approval remains disabled until an independently accountable owner is confirmed.
- Confirmed canonical `main` run `44444423639` passed all five required jobs on closeout SHA `4fd683d5f80a0638e7c5d6185d886e809b6ab7ae`.
- An initial bounded Antigravity review identified that autonomous merge authority could be read too broadly while the main-to-production trigger remains unverified; the matrix and ADR were narrowed to reversible documentation, governance and test-only PRs.
- A second complete-snapshot Antigravity review returned `NO BLOCKER`, finding the sensitive-path coverage, solo-founder deadlock handling, authority boundaries and coordination state consistent.
- P0-03 PR #37 passed all five protected checks plus Vercel on exact head `0e1afa66f37c7d099c5237bf46d96e5ace6d4730`, became `CLEAN`, and merged as `091d320066ae3ab6c2bec42877f19512bea40c02`.
- GitHub reports zero CODEOWNERS parser errors on canonical `main`, and post-merge run `44446578976` passed all five required jobs.
- Audited the existing P0-04 draft PR #30: it contains useful consolidation work but is based on the pre-hardening `e010505` baseline and records the now-resolved B-007 blocker, so it must be rebased and reconciled rather than merged unchanged or duplicated.
- Merged current `main` `238c56f5bda6e2223b60091a7c79c40c32f1034b` into the existing PR #30 branch as `c3c3840` without rebasing, force-pushing or rewriting history; the five expected state/coordination conflicts were reconciled to current verified facts.
- Revalidated all seven target documents: every relative Markdown link resolves, `git diff --check` passes, and the targeted source-of-truth scan finds no active conflicting task-pickup claim.
- A bounded read-only Antigravity review returned `NO BLOCKER`, confirming the canonical hierarchy, historical banners, current state consistency, documentation-only scope and absence of reintroduced exception controls.

## Last verified state

- PR #28 is merged into `main` as `e010505e5f5ad53cc3bf9535e506668e2ed913ef`.
- GitHub `main` is protected with strict five-check PR enforcement, admin enforcement, stale-review dismissal, conversation resolution, and force-push/deletion disabled.
- Canonical `main` is `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`; P0-04 is complete and canonical run `44481889569` is green across all five required jobs.
- PR #29 is merged as `2c9c93f9cc88a81650a3e59e33b75b3cfc1ed443`; recovery PR #31 is merged as canonical head `61e30aca33d196442ec74926e0f911e63e15f4ab`.
- All five GitHub Actions CI jobs passed on run `44269223199` for hardening head `9158de7`: Backend, Backend e2e, Backend production container, Frontend, and E2E full stack.
- The former 14-day dependency exception is no longer active: GitHub withdrew `GHSA-fc5q-39xc-vjpf`, and the unchanged production dependency tree audits clean.
- PR #30 consolidated the canonical hierarchy and merged as `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`.
- No historical file was moved or deleted; existing open-PR and Git-history links remain valid.
- Public `carhub.codes`, `/api/health` and `/api/ready` are served by Vercel production deployment `dpl_CoTyp78nFzyKXiSmQpKhG8tcziTv` on exact SHA `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`.
- Supabase project `carhubos` is the live database/storage service; all 21 Prisma migrations are applied and the private `vault-files` bucket exists.
- Render “My Workspace” has no matching `MOUBI9A/carhubos` service or database.
- The local untracked `screenshots/` directory is user-owned and must remain untouched.

## Files currently claimed by `P0-05`

`COORDINATION.md`, `docs/progress/EXECUTION_BOARD.md`,
`.agents/state/CURRENT.md`, `.agents/state/NEXT.md`,
`.agents/state/BLOCKERS.md`, and
`docs/operations/PRODUCTION_TOPOLOGY.md`.

No runtime code, database schema, migration, CI implementation, deployment,
provider, billing configuration or customer data mutation is in scope.

## Exact resume action

1. Release the P0-05 coordination claim in a separate commit and mark PR #39 ready for review.
2. Wait for exact-head CI and Vercel Preview evidence; resolve any material review finding without weakening the documented restrictions.
3. Because P0-05 proves that every merge to `main` is a production deployment trigger, merge only after the founder/release-owner gate recorded in B-009.

## Unresolved risks

- Feature-branch pushes without a PR will no longer run automatically after `P0-01`; manual dispatch remains available.
- Required CODEOWNER approval is intentionally disabled while the founder is the only confirmed accountable CODEOWNER; automated checks and conversation resolution remain mandatory.
- Path-filtered mobile CI cannot be globally required until it reports a deterministic result for every PR.
- `main` auto-deploys to production and there is no production migration gate; B-009 blocks production-affecting merges until the staged release path is accepted.
- Full schema drift, extensions, backup/PITR, restore, scale and data-quality provenance remain `P1-01` through `P1-03`; this topology audit does not replace them.
- RLS is disabled on 33 public tables. Current direct grants to `anon` and `authenticated` are zero, but `P1-01`/`P1-05` must preserve that containment and design compatible policies.
- Vercel Preview has no verified isolated database/provider configuration and is not staging.
- GitHub Actions reports Node 20 deprecation annotations for action runtimes, and frontend lint retains three pre-existing internal-navigation warnings; both are non-blocking follow-up evidence, not P0-03 failures.
- AI, provider, payment, GPS, legal, mobile-store and real-user pilot work remain gated by later board tasks.
