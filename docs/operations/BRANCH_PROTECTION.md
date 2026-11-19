# Main Branch Protection

**Applied:** 2026-11-18

**Repository:** `MOUBI9A/carhubos`

**Protected branch:** `main`

**Task:** `P0-02`

This policy protects the canonical integration branch. It is an external GitHub
repository setting, so agents must verify the live API response instead of
assuming this document is current.

## Enforced policy

- Pull requests are required; direct administrator pushes are not exempt.
- Required checks are strict, so the PR branch must be current with `main`.
- Required conversations must be resolved before merge.
- Stale reviews are dismissed after new commits.
- Force pushes and branch deletion are disabled.
- Administrators are subject to the same protection.
- Required approving reviews are set to zero because this is currently a
  solo-founder repository. The PR, checks, conversation-resolution, and admin
  enforcement gates remain mandatory. `P0-03` owns CODEOWNERS and the future
  release/incident authority matrix.

P0-03 added `.github/CODEOWNERS` and
`docs/operations/AUTHORITY_MATRIX.md`. Required CODEOWNER approval remains
disabled until an independently accountable owner is explicitly confirmed;
enabling it with only the founder as accountable CODEOWNER would deadlock
founder-authored pull requests. CODEOWNERS still documents and requests the
responsible reviewer for sensitive paths.

## Required application checks

1. `Backend (tsc + jest + lint + build)`
2. `Backend e2e (live Postgres)`
3. `Backend production container`
4. `Frontend (tsc + vitest + lint + build)`
5. `E2E (Playwright, full stack)`

Mobile path-filtered CI and Vercel preview are intentionally not global required
contexts. Mobile jobs do not report on every pull request, and Vercel remains a
separate preview/deployment signal. See `docs/operations/CI_GOVERNANCE.md`.

## Enforcement proof

- Disposable PR #33 used exact head
  `79a18e1bb8164585803fd5166170074acbb0a30a`.
- Its isolated temporary file deliberately produced TypeScript error `TS2322`.
- Required check `Frontend (tsc + vitest + lint + build)` completed with
  `FAILURE` in run `44280610548`.
- GitHub reported `mergeStateStatus: BLOCKED` while the failing required check
  was present.
- The test PR was closed without merge. Its remote and local proof branch were
  deleted after evidence capture; PR #33 remains the durable audit record.

## Change control

Any protection change must be tied to the execution board, record the before
and after API state, and preserve at least the five stable application checks.
Do not add a path-filtered job as globally required until it reports a
deterministic result on every pull request. Do not disable admin enforcement,
force-push protection, deletion protection, or conversation resolution to
unblock a merge.

## Completion evidence

- Protection documentation PR #34 passed all five required checks on exact head `022d2e9` and merged as `b7cc4156f61ca017ef08aaec190d7e8672b59a67`.
- After the withdrawn-advisory cleanup merged, canonical `main` SHA `eba3c5cd9aab02e15b99f2a85a45561bdf541654` passed all five jobs in run `44442498902`.
- The live API was reverified after that run: strict mode, all five contexts, admin enforcement, stale-review dismissal and conversation resolution remain enabled; force pushes and deletion remain disabled.
