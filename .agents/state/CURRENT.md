# Current Operational State

**Last verified:** 2026-11-22

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`
**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`
**Working branch:** `codex/p0-06-environment-rules` (stacked on PR #42 for conflict-free shared-state review)
**Branch base:** PR #42's released-claim SHA `10eb8377ce46cf831b30948c660684eb41f71bed`; canonical `main` remains `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`
**Active task:** `P0-06` — environment, providers, credentials, seeding, retention and stage approval rules, `IN_PROGRESS` until protected PR review.

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

## Owned P0-06 files

- `COORDINATION.md`
- `docs/progress/EXECUTION_BOARD.md`
- `.agents/state/CURRENT.md`
- `.agents/state/NEXT.md`
- `docs/operations/ENVIRONMENT_PROVIDER_DATA_MATRIX.md`

No other branches, owner `screenshots/`, `backend/`, `frontend/`, `prisma/schema.prisma`, data or cloud resources are within this claim.

## Resume

1. Verify all linked documents and internal facts in the P0-06 matrix, `git diff --check` and exact branch/base SHA.
2. Push the P0-06 implementation and open a **draft stacked PR targeting `codex/p0-07-pr-disposition`**, so P0-07 state remains preserved. Retarget to `main` only after PR #42 passes required checks and is merged.
3. Record draft PR exact SHA, Vercel preview result and the five GitHub required check outcomes. If billing still blocks the jobs, leave the PR unmerged in REVIEW.
4. Release the P0-06 coordination claim in a separate commit. The next unblocked safety work is P1-01 read-only database provenance, not staged customer onboarding.

The canonical board and master plan, not this file, define completion. No P0-06 claim is `DONE` before the required protected evidence and merge into main.
