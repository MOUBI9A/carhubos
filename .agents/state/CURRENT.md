# Current Operational State

**Last verified:** 2026-11-22

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`
**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`
**Working branch:** `codex/p0-06-environment-rules` (stacked on PR #42 for conflict-free shared-state review)
**Branch base:** PR #42's released-claim SHA `10eb8377ce46cf831b30948c660684eb41f71bed`; canonical `main` remains `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`
**Active task:** `P0-06` — policy submitted for protected `REVIEW` in draft PR #43; no other implementation action is in progress once coordination is released.

## Latest accepted and pending work

- P0-04 PR #30 merged as `ff6d167`; five canonical checks passed.
- P0-05 PR #39 merged with founder approval as `a854a21`. Vercel production is READY on this exact SHA and live health/readiness returned HTTP 200. Canonical topology document: `docs/operations/PRODUCTION_TOPOLOGY.md`.
- P0-07 completed a read-only 16-PR disposition inventory on draft [PR #42](https://github.com/MOUBI9A/carhubos/pull/42); implementation/merge is still protected REVIEW due GitHub account billing/limit blocker #40. Its coordination claim was released separately as `10eb837`.
- P0-06 was separately claimed in the `COORDINATION.md` + execution-board commit `0ebace0`. The accepted implementation scope is documentation/coordination only. `docs/operations/ENVIRONMENT_PROVIDER_DATA_MATRIX.md` defines the six environment boundaries, provider/secret/data, seed/retention and release gates.
- No source code, schema, migration, cloud secrets, production settings, customer rows, payment provider or Vercel aliases were changed by P0-06.

## Verified environment and cost constraints

- GitHub required CI jobs failed **before executing** because of owner account billing/allowance restriction. See issue #40. No bypass to `main` protection or paid spending is permitted.
- Azure for Students is **Enabled**; actual month-to-date Azure cost was approximately USD 3.83 from existing unrelated resources (not remaining student credit). Dedicated Azure resource group `carhub-staging-dev` in `northeurope` has **no billable child resources**, and unrelated Creator OS VM remains untouched.
- Supabase attempted to create `carhubos-staging` after a `$0/month` quote but provider rejected it on the owner's **2-free-project** limit. No staging Supabase project/database/storage exists. Existing CarHub production and Influence Factory projects were unchanged.
- Synthetic **local-only** exact-release tests at `a854a21`: full pinned Chromium Playwright 45/45, backend live-DB 17/17, backend unit 656 passed (16 skipped), frontend 55 passed; both production-style builds, type/lint and PostgreSQL 17 fresh migration/restore passed. Not hosted Preview runtime, real storage, production PITR or pilot acceptance.
- Production `main` automatically deploys; no production migration or promotion gate (B-009). Online payment and AI Vision remain disabled by verified production configuration. Do not publish legal claims, activate live providers or import customers.

## P0-06 handoff

The proposed policy and handoff changes are submitted as draft [PR #43](https://github.com/MOUBI9A/carhubos/pull/43) on exact implementation head `cd5f8d353a9ee4037ea722e02b805d0220f50f8e`; the PR deliberately targets `codex/p0-07-pr-disposition` until parent PR #42 merges. The P0-06 coordination claim is to be released in a separate commit. No other branch, user `screenshots/`, backend, frontend, Prisma schema, data or cloud resource was changed by this task.

## Resume

1. Leave P0-06 PR #43 in protected REVIEW until PR #42 merges and the five exact-head required jobs run successfully. Retarget #43 to `main` only when its parent is safely accepted.
2. Release P0-06 claim in a separate coordination-only commit.
3. Do not create staged paid services until Azure remaining credit/expiration and verified free-tier eligibility are known. Do not bypass GitHub checks while billing is blocked.
4. Later Phase 1 starts with P1-01 read-only provenance, then P1-02 hosted staging and P1-03 recovery rehearsal. No agency import until those gates pass.

The canonical board and master plan, not this file, define completion. No P0-06 claim is `DONE` before the required protected evidence and merge into main.
