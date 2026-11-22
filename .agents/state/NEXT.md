# Next Engineering Priorities

The canonical task order is `docs/progress/EXECUTION_BOARD.md`. This is only a near-term handoff, not a second roadmap.

## 1. Submit and review P0-07

- Inventory all 16 exact GitHub heads from PRs #5–#13, #20, and #22–#27 with dependency, schema and port/close/rebase disposition; document is `docs/operations/PR_DISPOSITION.md`.
- No code from those PRs is merged or closed in this task. Release the coordination claim after creating the PR.
- GitHub required checks are currently blocked before job start by account billing limits (issue #40); preserve branch protection and do not merge a red/unverified PR.

## 2. Start P0-06 environment isolation rules

- P0-05 / PR #39 is merged (`a854a21`); P0-06 is now dependency-satisfied but has not been claimed. Issue #41 records the tentative environment/provider/data matrix and zero-cost constraints.
- Use separate scoped branch after the P0-07 ownership release. Vercel Preview is not production-shaped staging. Azure CarHub staging resource group is empty and Supabase free-project quota rejected a new staging project.
- No cloud database, production schema, provider or payment activation until verified budget, separate credentials and migration/recovery controls exist.

## 3. Prepare P1-01 read-only database security provenance

- Audit exact production schema grants, RLS policy posture, drift and scale without reading/exporting real customer rows.
- Do not run production migrations or call local synthetic restore proof a production PITR exercise.

AI foundation remains deferred until Phase 3 pilot acceptance. Never weaken protected checks to bypass the GitHub account billing restriction.
