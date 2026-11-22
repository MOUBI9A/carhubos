# Next Engineering Priorities

The task order is `docs/progress/EXECUTION_BOARD.md`; this is a near-term handoff only.

## 1. Review draft P0-06 PR #43 and P0-07 PR #42

- Draft P0-06 [PR #43](https://github.com/MOUBI9A/carhubos/pull/43) includes the new `docs/operations/ENVIRONMENT_PROVIDER_DATA_MATRIX.md`; implementation head `cd5f8d3`, coordinated through claim `0ebace0`.
- Review allowed data, credentials, providers, feature flags, seeding, retention, preview/staging separation and release approvals for each environment. It is policy documentation, not hosted staging.
- PR #43 deliberately targets P0-07 PR #42 to avoid overwriting that owner's state. Release the P0-06 file claim separately, then wait for the protected review and retarget after #42 safely merges.

## 2. P0-07 and protected CI

- P0-07 inventory is already in draft PR #42; do not duplicate it. All five GitHub required jobs are blocked before execution by account billing/allowance (#40); local passes do not satisfy exact-head required checks.
- Never bypass branch protection, activate production services or increase spending because CI is blocked.

## 3. P1-01 then P1-02

- With the canonical Phase 0 handoff accepted, perform **read-only** database/schema/extension/grant provenance and data-quality checks before choosing hosted staging.
- Azure student subscription is enabled but remaining credit/expiry is unverified; staging Azure group is empty; Supabase free-project creation is rejected by owner quota. Do not provision priced resources or touch unrelated products without verifiable allowance.

AI, video, live payments and real agency import stay deferred until their independently accepted gates.
