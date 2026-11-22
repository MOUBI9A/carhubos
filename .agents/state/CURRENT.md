# Current Operational State

**Last reviewed:** 2026-11-22

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`

**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`

**Current working branch:** `codex/p0-07-pr-disposition` (reconciled with `main` as of merge `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`)

**Active task:** `P0-07` — inventory submitted for protected `REVIEW` in draft PR #42. No implementation files remain claimed after separate coordination release.

**P0-05:** `DONE`; PR #39 merged as `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83` with founder approval. The Vercel production deployment for this exact SHA is READY. Full topology/provenance limitations are documented in `docs/operations/PRODUCTION_TOPOLOGY.md`.

## Verified P0-07 inventory

- PR #30 (P0-04) merged as `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`; canonical CI run `44481889569` passed all five required jobs.
- P0-07 was claimed on branch `codex/p0-07-pr-disposition` in `COORDINATION.md` at `b872005d9d2f70e701c7596f9fe9c1ea1bdf833d`, before editing.
- Recorded all 16 open PRs (#5–#13, #20, #22–#27), exact heads, GitHub-reported bases, merge-base comparisons, schema dependencies, ownership, approved disposition and required future evidence. Exact heads were independently compared with GitHub on 2026-11-22, all 16 matched.
- AI PR chain #23–#26 stays draft/deferred until after the core pilot; vehicle-control scope in #8 is not eligible for release. `docs/operations/PR_DISPOSITION.md` is a read-only decision inventory, not implementation or acceptance.
- The earlier base `ff6d1674` is preserved in the inventory as the exact historical comparison baseline, not misrepresented as current production.
- No runtime, schema, migrations, environment variables, provider configuration, real customer records or production settings were changed in this task.
- The untracked `screenshots/` directory remains user-owned and untouched.

## Current release and billing evidence

- Production `main` at `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83` auto-deploys on every merge; there is no production migration/promote gate (blocker B-009). `PAYMENT_PROVIDER=DISABLED` and `AI_VISION_MODE=disabled` remain verified deployment configuration; provider activation stays gated.
- Exact-commit isolated local verification: 45/45 full Chromium Playwright checks in one run, backend 17/17 live-DB integration tests, backend 656 passing unit tests (16 skipped), frontend 55 passing tests, backend/frontend production-style builds and syntax/lint/type checks passed. Synthetic PostgreSQL 17 accepted 21/21 migrations, and a local dump/restore reproduced 21 migration records and 41 public tables. These checks are **local-only**, not hosted staging, live storage or production PITR acceptance.
- GitHub-hosted required checks on the November 22 post-merge run `44986349161` **did not start** because GitHub annotated account payment/spending-limit restrictions. Root cause, evidence, and local fallback are recorded in issue #40. Never bypass required CI or enable paid overages.
- Azure for Students is enabled. The `carhub-staging-dev` resource group exists and was verified **empty**, with no additional billable resources. The existing unrelated `creator-os-dev` Azure VM remains untouched. Supabase rejected a quoted `$0/month` staging project because the owner is at the free-project count limit; no new project exists. Evidence and isolated staging matrix are in issue #41; hosted staging and recovery/PITR remain blocked.
- No real agency has signed pilot terms or been onboarded. CIG CAR is only a potential candidate, not a verified consenting user. Legal/operator, provider, backup and support gates still apply.

## Coordination status

P0-07 final inventory was submitted in draft PR #42 on implementation head `7dde1600d349a863bae0d515613f70b1c1e48871`. Its scoped file claim is to be released in a separate coordination-only commit. Do not edit screenshots, backend/schema, provider configuration or production data.

## Next action

1. Leave PR #42 in draft protected REVIEW until five exact-head GitHub checks can run again; billing blocker #40 is not a reason to bypass enforcement.
2. Release P0-07 claim in a separate coordination-only commit; a fresh P0-06 worker can then claim its files.
3. Prepare the P0-06 environment/provider/data matrix (issue #41) in a separate scope without touching live providers or user data.
4. No hosted staging, paid Azure resources or agency pilot until the applicable gates are met.

The board and master plan, not this snapshot, define dependencies and acceptance. Re-verify remote state before acting.
