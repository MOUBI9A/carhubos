# CarHub OS integration and upgrade roadmap

**Date:** 2026-11-16  
**Scope:** GitHub, Vercel production, local branches/worktrees, pasted production-account verification record, and the current compliance branch.  
**Rule:** verified facts are separated from reported facts and release proposals.

## Verified current state

- GitHub `main` is `6a61b3c`, the merged dashboard contract-mismatch fix from PR #21.
- Vercel production deployment `dpl_45uYKsYToddYg3uE1nKUdWWivJtg` is READY and serves `www.carhub.codes`, `carhub.codes`, and `carhubos.vercel.app` from commit `6a61b3c` on Node.js 24.
- Public smoke checks returned HTTP 200 for `/`, `/login`, `/dashboard`, `/api/health`, and `/api/platform/plans` on 2026-11-16. Anonymous 200 responses do not prove every authenticated workflow.
- Vercel reported no production `error` or `fatal` runtime logs in the latest 30-minute window. Its seven-day error cluster belongs to an older deployment; Hobby retention prevented a complete long-window log read.
- The active checkout is `feat/compliance-20-point-audit` at `d8a6b12`. The user's existing `screenshots/` directory is untracked and must remain untouched.
- GitHub draft PRs #20 and #22–#26 are mergeable. CI is green on #20 and #23–#26. PR #22 has successful frontend/backend/container/Playwright checks, but its latest live-Postgres jobs are canceled and must be rerun or replaced with equivalent exact-head evidence before release.
- Render exposes one account workspace named `My Workspace`; service/database inspection is intentionally pending explicit workspace confirmation.

## Reported production account state

The pasted operational record says all 11 test accounts were verified in the production database: 1 root admin, 4 owners, 2 managers, 3 agents and 1 renter. Existing passwords were preserved and none matched the known local demo password. This audit did not retrieve or retest those credentials. Local seed accounts still intentionally use `admin123`; they are not production credentials.

## Draft workstreams and release gates

| PR | Capability | Current boundary | Release gate |
|---|---|---|---|
| #22 | Legal notices, signup acknowledgements, privacy-rights intake | Active branch; two unapplied migrations; legal text remains draft | Exact-head live-Postgres CI, operator runbook, verified business contacts, counsel approval, backup/migration/rollback rehearsal |
| #23 | Tenant-scoped read-only operations intelligence | Base of stacked AI series; no model calls | Independent authz/security review, migration rehearsal after rebase, keep inference disabled |
| #24 | Agency AI governance and budgets | Default-off configuration only | Merge after #23; preserve fail-closed state and revoked-capability checks |
| #25 | Founder review, emergency lock, read-only tool registry | No provider and no autonomous actions | Merge after #24; ROOT_ADMIN live-role checks and audit trail must remain intact |
| #26 | Atomic quota reservation ledger | Provider-disabled; receipts are not trusted billing proof | Merge after #25; provider-specific cost verification and reconciliation remain separate blockers |
| #20 | Private signed resumable Guardian video | Local real-wire TUS passed; hosted nonproduction Supabase acceptance missing | Dedicated nonproduction storage, CORS/limit/retention validation, orphan-sweep rehearsal, migration and rollback approval |

## Recommended integration order

1. **Finish compliance PR #22 first.** It improves truthful disclosures and data-rights intake, but must remain a draft until legal/operator facts and exact-head database CI are complete.
2. **Rebase and review the AI stack as one program, merge in dependency order #23 → #24 → #25 → #26.** Keep provider integration disabled. The value today is deterministic operations intelligence, governance, auditability and quota foundations—not autonomous AI.
3. **Keep Guardian video PR #20 isolated until hosted staging storage passes.** Do not substitute production storage for the missing acceptance test.
4. After each merge: apply migrations to an isolated clone, run backend/frontend/full-stack gates, deploy one production revision, smoke-test role workflows, inspect errors, and retain the previous Vercel deployment as a rollback candidate.

## Product upgrades worth building next

1. **Contract-tested API clients.** Generate or validate frontend response schemas from backend contracts so mismatches like `forecast30DaysMad` versus `projected30DayCostMad` fail in CI instead of crashing production.
2. **Role-based QA cockpit.** Give operators a non-production checklist for Owner → Agent → Renter Guardian handoff, with test-data reset and no stored passwords.
3. **Release evidence page.** Show deployed commit, migration set, feature flags, health state and last smoke-test timestamp to ROOT_ADMIN without exposing secrets.
4. **Guardian capture quality gates.** Add blur/darkness/coverage checks before upload, then human-reviewed comparison assistance; never auto-assign fault or charge a renter.
5. **Localized legal centre.** Publish counsel-approved FR/AR/EN versions with revision identifiers and acknowledgement history; never machine-translate final legal obligations without review.
6. **Operational observability.** Add structured request IDs, error tracking and role-flow synthetic checks before expanding production features.

## Definition of the next safe milestone

- Compliance panel is locale-aware and its focused frontend tests pass.
- PR #22 exact-head backend, frontend, live-Postgres and Playwright checks are green.
- Legal/operator blockers remain explicit; no certification claim is made.
- No production migration or deployment occurs until the compliance release checklist is approved.
