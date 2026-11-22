# Next Engineering Priorities

The canonical task order is `docs/progress/EXECUTION_BOARD.md`. This is only a near-term handoff, not a second roadmap.

## 1. Review draft PR #42 (P0-07)

- Inventory submitted in [PR #42](https://github.com/MOUBI9A/carhubos/pull/42) with all 16 exact GitHub heads and future disposition. Merge blocked until the required five CI checks run.
- No code from those PRs was merged or closed. Coordination claim to be released separately.
- GitHub required checks are currently blocked before job start by account billing limits (issue #40); preserve branch protection and do not merge a red/unverified PR.

## 2. Start P0-06 environment isolation rules

- P0-05 / PR #39 is merged (`a854a21`); P0-06 is dependency-satisfied and unclaimed. Issue #41 records the tentative environment/provider/data matrix and zero-cost constraints.
- Use separate scoped branch after the P0-07 ownership release. Vercel Preview is not production-shaped staging. Azure CarHub staging resource group is empty and Supabase free-project quota rejected a new staging project.
- No cloud database, production schema, provider or payment activation until verified budget, separate credentials and migration/recovery controls exist.

## 3. Prepare P1-01 read-only database security provenance

- Audit exact production schema grants, RLS policy posture, drift and scale without reading/exporting real customer rows.
- Do not run production migrations or call local synthetic restore proof a production PITR exercise.

AI foundation remains deferred until Phase 3 pilot acceptance. Never weaken protected checks to bypass the GitHub account billing restriction.
