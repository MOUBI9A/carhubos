# CI Governance

This document defines the stable GitHub Actions contract used by Phase 0 repository protection. The implementation lives in `.github/workflows/ci.yml`; task `P0-02` must use the exact contexts below when protecting `main`.

## Event contract

| Event | Web/backend CI behavior | Purpose |
|---|---|---|
| Pull request targeting `main` | Run one complete CI workflow | Validate the exact proposed change once, without a duplicate branch-push run. |
| Push to `main` | Run one complete CI workflow | Verify the accepted commit on the canonical branch. |
| Manual dispatch | Run one complete CI workflow on the selected ref | Allow CI for a branch that does not yet have a pull request and support controlled diagnostics. |
| Push to another branch | Do not run automatically | Avoid duplicating the pull-request event. Open a PR to `main` or use manual dispatch when early branch feedback is needed. |

Pull requests targeting a future release or integration branch are not covered automatically. If the repository adopts those branches, add them deliberately to `pull_request.branches`. If GitHub merge queue is enabled later, add and verify the `merge_group` event before relying on the queue.

## Stable web/backend contexts

The following five job-level names are the always-running web/backend contexts. Keep them stable unless branch protection and this document are changed in the same accepted milestone:

1. `Backend (tsc + jest + lint + build)`
2. `Backend production container`
3. `Backend e2e (live Postgres)`
4. `Frontend (tsc + vitest + lint + build)`
5. `E2E (Playwright, full stack)`

Workflow-level provider checks such as Vercel preview are separate from this five-context contract and must not be confused with the application CI gate.

## Mobile CI

`.github/workflows/mobile-ci.yml` is intentionally path-filtered to `mobile/**` and the mobile workflow file. A web-only, backend-only, or documentation-only pull request therefore produces no mobile check at all.

Do not make a mobile job globally required in branch protection yet. GitHub would wait for a required context that is never created on an unrelated pull request. Mobile can become globally required only after its workflow reports one deterministic aggregate pass or intentional-skip context on every pull request, or after a ruleset can require it only for matching paths without leaving unrelated changes pending.

Mobile remains a separate release track. A green web/backend PR does not prove signed builds, store readiness, device behavior, or mobile API compatibility.

## Production dependency audit

The frontend runs the standard `npm audit --omit=dev --audit-level=high` command. No advisory allowlist or exception wrapper is active.

The former `GHSA-fc5q-39xc-vjpf` exception was retired after GitHub withdrew the advisory on 2026-11-18 and the unchanged production dependency tree returned a clean audit. The historical approval, controls and retirement evidence remain in `docs/security/DEPENDENCY_EXCEPTION_GHSA_FC5Q_39XC_VJPF.md`.

## Verification for `P0-01`

Before accepting the CI change:

1. Validate the workflow syntax and review the event diff.
2. Open a test PR targeting `main` whose head contains the trigger change.
3. Confirm GitHub dispatched exactly one `CI` run for that pull-request head.
4. Confirm the run contains exactly one instance of each five stable contexts and all five pass.
5. Confirm the documentation-only test PR does not create or wait for a mobile check.
6. Confirm `workflow_dispatch` remains declared; a manual run on a non-PR head may be used as additional proof.
7. After the accepted PR merges, confirm the resulting `main` commit receives one push-triggered `CI` run. This post-merge fact is part of `P0-01` completion evidence, not pre-merge review evidence.

Record the base SHA, exact PR head SHA, run URL, event name, job conclusions, and any untested behavior in `docs/progress/EXECUTION_BOARD.md` and `.agents/state/CURRENT.md`.

## Rollback

If pull requests stop receiving CI, restore the previous trigger temporarily and use manual dispatch while the event configuration is repaired. Do not enable or weaken branch protection around missing contexts; fix the workflow and re-prove the exact check names first.
