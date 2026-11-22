# Next Engineering Priorities

The canonical queue is `docs/progress/EXECUTION_BOARD.md`. This file intentionally contains only the next one to three actions.

## 1. Finish production topology evidence (`P0-05`)

**Status:** `REVIEW` in draft PR #39.

- Independent review returned `NO BLOCKER`; wait for exact-head CI plus Vercel Preview evidence.
- Resolve any material review finding without weakening the recorded production restrictions.
- Do not merge without the founder/release-owner gate: P0-05 proves that every `main` merge triggers production automatically.

## 2. Define environment/provider/data rules (`P0-06`)

**Status:** `NOT_STARTED`; depends on P0-05.

- Define allowed data, credentials, providers, flags, seeding, retention and approvals for development, test, Preview, staging, pilot and production.
- Record explicitly that Vercel Preview is not production-shaped staging and currently has no project-level Preview variables.

## 3. Publish the legacy/open-PR disposition matrix (`P0-07`)

**Status:** `NOT_STARTED`; dependency P0-04 is complete.

- Record exact base/head, owner, dependencies, schema risk and port/close/rebase disposition for PRs #5–#13, #20 and #22–#27.
- Do not merge or enable the AI stack while completing the inventory.

Do not skip ahead to provider activation, production schema changes, telemetry, AI or pilot onboarding while their gates remain incomplete.
