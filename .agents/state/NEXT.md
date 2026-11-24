# Next Engineering Priorities

The task order is `docs/progress/EXECUTION_BOARD.md`; this is a near-term handoff only.

## 1. Review P0-09 inventory and its parent PRs

- Draft [PR #44](https://github.com/MOUBI9A/carhubos/pull/44) targets #43. Reproduce the report using its pinned main SHA. Review the source coverage before protected acceptance. Retarget after #43 merges and check for source drift.

- Draft P0-06 [PR #43](https://github.com/MOUBI9A/carhubos/pull/43) includes `docs/operations/ENVIRONMENT_PROVIDER_DATA_MATRIX.md`; initial implementation `cd5f8d3`, review corrections claimed at `21d509c` on November 23. Read its current head and COORDINATION before edits.
- Review allowed data, credentials, providers, feature flags, seeding, retention, preview/staging separation and release approvals for each environment. It is policy documentation, not hosted staging.
- PR #43 deliberately targets P0-07 PR #42. CI's `main` base filter means its five jobs are not scheduled yet. After #42 safely merges, retarget #43 to `main` and require final-head CI; use existing workflow dispatch if no run starts. Separate claim release is recorded in COORDINATION; do not repeat it.

## 2. P0-07 and protected CI

- P0-07 inventory is already in draft PR #42; do not duplicate it. All five GitHub required jobs are blocked before execution by account billing/allowance (#40); local passes do not satisfy exact-head required checks.
- Never bypass branch protection, activate production services or increase spending because CI is blocked.
- Founder/account owner must resolve the account restriction within included allowances (B-011); check annotations before retrying. Neither local QA nor Vercel status replaces the five required checks.

## 3. P1-01 then P1-02

- With the canonical Phase 0 handoff accepted, perform **read-only** database/schema/extension/grant provenance and data-quality checks before choosing hosted staging.
- Azure student subscription is enabled but remaining credit/expiry is unverified; staging Azure group is empty; Supabase free-project creation is rejected by owner quota. Do not provision priced resources or touch unrelated products without verifiable allowance.
- Carry B-012 into existing `P3-02`: generic WhatsApp mock success cannot prove delivery; Guardian flags do not disable generic sends. Stage-validation and log-redaction gaps belong to `P1-07` and `P1-06`; policy documentation does not implement them.

AI, video, live payments and real agency import stay deferred until their independently accepted gates.
