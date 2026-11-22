# Open PR Disposition and Dependency Matrix

Audit: 2026-11-21. Task: P0-07. Canonical comparison commit: `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`.

This is a read-only inventory and disposition decision under the accepted master plan. It does not approve, close, rebase or merge any listed PR. No draft runtime was executed. All 16 PRs remain open. Acceptance below means evidence still required, not evidence already passed.

## Ownership and evidence

All listed PRs were authored by `@MOUBI9A`; GitHub assigns none to an implementer. Founder `@MOUBI9A` owns disposition/release decisions. Codex owns this inventory only; future implementation owners must claim the relevant board task before edits.

Sources: GitHub PR metadata and complete changed-file lists, local Git merge-base and three-dot diffs against the comparison commit, plus focused source review for #7, #11 and #12. GitHub returned older `baseRefOid` values for main-targeted PRs; these are preserved below as API-reported values, not mislabelled as current main. The independent Git merge-base and current comparison SHA make the distinction explicit. Mergeability was UNKNOWN for several PRs; no conflict-free or merge-ready verdict is inferred.

## Disposition summary

| PR | Decision | Dependency / re-entry | Schema and release risk |
|---|---|---|---|
| [#5](https://github.com/MOUBI9A/carhubos/pull/5) | Port only reproduced failures; otherwise close as superseded | P2-03 | No schema diff; auth throttling and CI behavior change |
| [#6](https://github.com/MOUBI9A/carhubos/pull/6) | Port pagination into a current-base PR | P2-03 | No schema diff; tenant list/API compatibility and locale changes |
| [#7](https://github.com/MOUBI9A/carhubos/pull/7) | Reimplement selectively after identity/consent review | P2-03 plus P1-05 and migration rehearsal | CustomerInvite table and schema changes; sensitive identity linkage |
| [#8](https://github.com/MOUBI9A/carhubos/pull/8) | Reject merge as-is; retain only reviewed passive adapter patterns | P2-03 disposition; passive telemetry waits for Phase 6 | Two migrations, capabilities/backfill, location and vehicle control |
| [#9](https://github.com/MOUBI9A/carhubos/pull/9) | Defer pricing feature; selectively port after business approval | P2-03 plus core pricing acceptance | Rate-rule migration and booking price behavior; Decimal/VAT risk |
| [#10](https://github.com/MOUBI9A/carhubos/pull/10) | Close as superseded after extracting any still-missing operator inputs | P2-03 | Documentation HTML only; competing setup source |
| [#11](https://github.com/MOUBI9A/carhubos/pull/11) | Port exception mapping into a small current-base fix | P2-03 plus payment/security review | No schema diff; payment failures and public webhook error handling |
| [#12](https://github.com/MOUBI9A/carhubos/pull/12) | Port duplicate-key detection; preserve current translations | P2-03 | No schema diff; locale catalog overwrites and parser correctness |
| [#13](https://github.com/MOUBI9A/carhubos/pull/13) | Reject bulk unification merge; split proven missing fixes | P2-03 | No schema migration in delta; stress seed, auth, money, PDF and broad docs changes |
| [#20](https://github.com/MOUBI9A/carhubos/pull/20) | Keep draft; rebase for hosted staging acceptance | P2-04 after P1-02; release also needs P1-03 | Upload-intent migration, private storage, cleanup workflow and dependencies |
| [#22](https://github.com/MOUBI9A/carhubos/pull/22) | Rebase first in compliance consolidation after Phase 1 | P2-01 | Legal acknowledgements and privacy-request migrations; auth/public policy changes |
| [#23](https://github.com/MOUBI9A/carhubos/pull/23) | Preserve draft; rebase after stable core pilot | Phase 4 / ADR-012 | No schema diff in this slice; new tenant API/UI and module registration |
| [#24](https://github.com/MOUBI9A/carhubos/pull/24) | Preserve stacked draft; rebase after #23 acceptance | Phase 4 / #23 | Governance schema migration; budgets and tenant settings |
| [#25](https://github.com/MOUBI9A/carhubos/pull/25) | Preserve stacked draft; rebase after #24 acceptance | Phase 4 / #24 | Platform-control migration plus inherited governance migration |
| [#26](https://github.com/MOUBI9A/carhubos/pull/26) | Preserve stacked draft; rebase after #25 acceptance | Phase 4 / #25 | Quota migration plus two inherited AI migrations; concurrency |
| [#27](https://github.com/MOUBI9A/carhubos/pull/27) | Rebase only after #22 is accepted | P2-02 after P2-01 / #22 | Own delta has no migration; inherits two compliance migrations and dependency changes |

## Exact revision evidence and acceptance

### PR #5: fix(e2e): fix the real E2E failures — stale locators, rate limit, aged-out dates

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `282517352a394ec00b6b252abbcce0dab5af155f` (`fix-e2e-ci-timeouts`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 3.
- Draft: no. Changed files against PR base: 9.
- Prisma paths changed against audited main: none.
- Decision: Port only reproduced failures; otherwise close as superseded.
- Acceptance still required: Run current full-stack suite first; reproduce each old failure, preserve production throttles, then accept a small replacement or record why no port is needed.

### PR #6: feat(pagination): adopt "Load more" on the customers and fleet lists

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `43f900c4f191d67439ee4d98d2ab5559a5b5f908` (`feat-load-more-pagination`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 1.
- Draft: yes. Changed files against PR base: 7.
- Prisma paths changed against audited main: none.
- Decision: Port pagination into a current-base PR.
- Acceptance still required: Verify server pagination, empty/loading/error states, stable ordering and FR/AR/EN; current fleet hook from the draft is absent.

### PR #7: feat(trust): real Customer to renter-User link (invite + auto-match)

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `0d9b3b0ab6377030ae72bc0b939cd9da0de36b8b` (`feat-customer-renter-link`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 1.
- Draft: yes. Changed files against PR base: 19.
- Prisma paths changed against audited main: `backend/prisma/migrations/20260808134050_add_customer_invite/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Reimplement selectively after identity/consent review.
- Acceptance still required: Prove single-use expiry/replay/concurrency, identity matching and tenant/consent denial; rehearse migration before release.

### PR #8: feat(telematics): GPS provider integration — locate, monitor, immobilize

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `8912befebd6eee95ea22324a9ba70b3c4ea9f101` (`feat-telematics-gps`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 3.
- Draft: yes. Changed files against PR base: 28.
- Prisma paths changed against audited main: `backend/prisma/migrations/20260809040000_add_telematics/migration.sql`, `backend/prisma/migrations/20260809043000_backfill_telematics_capabilities/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Reject merge as-is; retain only reviewed passive adapter patterns.
- Acceptance still required: Do not port immobilization or remote commands; require signed/replay-safe ingest, assignment history, retention and approved passive pilot.

### PR #9: feat(pricing): rate tiers — season, duration and vehicle class

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `1248bbd0cc8596d236ec9a945400d1be4abb9ce2` (`feat-rate-tiers`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 3.
- Draft: yes. Changed files against PR base: 20.
- Prisma paths changed against audited main: `backend/prisma/migrations/20260810020000_add_rate_rules/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Defer pricing feature; selectively port after business approval.
- Acceptance still required: Reproduce missing pricing requirements; prove overlaps, precedence, MAD rounding, quote consistency and migration rehearsal.

### PR #10: docs: founder setup console — every pending input in one page

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `814ae933d16ca8335d5feda331d4a8b64d130c6f` (`docs-setup-console`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 2.
- Draft: yes. Changed files against PR base: 1.
- Prisma paths changed against audited main: none.
- Decision: Close as superseded after extracting any still-missing operator inputs.
- Acceptance still required: Compare every input with canonical blockers/environment rules; port omissions into canonical docs before closing.

### PR #11: fix(payments): gateway failures were bare 500s, including on a public endpoint

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `358562962c87e32f1d59f6d886b1452da796ca85` (`fix-payment-gateway-errors`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 1.
- Draft: yes. Changed files against PR base: 4.
- Prisma paths changed against audited main: none.
- Decision: Port exception mapping into a small current-base fix.
- Acceptance still required: Verify missing/invalid signatures, unavailable config and ambiguous provider results; redact provider errors; never infer no checkout exists after a timeout.

### PR #12: fix(i18n): remove 42 duplicate catalog keys and add a guard that can see them

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `e41c244498705b01d9b6b8f74cf1187688bd9031` (`fix-i18n-duplicate-keys`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `68b302e72296a6208059ed73940760df0b393f53`.
- Commits unique to main / head: 171 / 2.
- Draft: yes. Changed files against PR base: 6.
- Prisma paths changed against audited main: none.
- Decision: Port duplicate-key detection; preserve current translations.
- Acceptance still required: Test raw JSON with escaped-equivalent keys and sibling scopes; reproduce current duplicates before removal; do not replace entire catalogs with old copies.

### PR #13: Final Unification & Security Patch

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `695aadcb66e23228072f2258e1c9dd67df323f9e` (`unification-security-patch`).
- Target: `main`; API-reported base: `68b302e72296a6208059ed73940760df0b393f53`.
- Git merge-base with audited main: `f130af663583d4430bb1616b5dbe1b47abd3a968`.
- Commits unique to main / head: 180 / 7.
- Draft: no. Changed files against PR base: 100.
- Prisma paths changed against audited main: `backend/prisma/seed-stress.js`.
- Decision: Reject bulk unification merge; split proven missing fixes.
- Acceptance still required: Review each security patch against current code; isolate reproduction/tests; never run stress seed on production or restore obsolete readiness claims.

### PR #20: Guardian: private signed resumable video uploads (staging review)

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `9deb880b05100713bc9f53057479e9aea7970532` (`feat/guardian-resumable-video-upload`).
- Target: `main`; API-reported base: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 6.
- Draft: yes. Changed files against PR base: 29.
- Prisma paths changed against audited main: `backend/prisma/migrations/20261112100000_guardian_resumable_upload_intents/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Keep draft; rebase for hosted staging acceptance.
- Acceptance still required: Prove TUS auth, tenant ownership, signed access, retries, retention/scanning and orphan cleanup on isolated hosted storage.

### PR #22: Compliance: 20-point privacy, consumer and accessibility prelaunch audit

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `8eb842ce0f3838eff97bf837a940359a0623884e` (`feat/compliance-20-point-audit`).
- Target: `main`; API-reported base: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 8.
- Draft: yes. Changed files against PR base: 50.
- Prisma paths changed against audited main: `backend/prisma/migrations/20261112160000_agency_legal_acknowledgements/migration.sql`, `backend/prisma/migrations/20261112170000_privacy_requests/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Rebase first in compliance consolidation after Phase 1.
- Acceptance still required: Rehearse both migrations; test privacy-request authorization; founder/counsel supply approved business/legal text; preserve current governance files.

### PR #23: AI foundation: tenant-scoped Operations Intelligence and honest automation UI

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `b5590b8e591d895fc7342ae42a97887c4e70935b` (`feat/ai-operations-foundation`).
- Target: `main`; API-reported base: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 2.
- Draft: yes. Changed files against PR base: 14.
- Prisma paths changed against audited main: none.
- Decision: Preserve draft; rebase after stable core pilot.
- Acceptance still required: Tenant negative tests, honest source cards, default-off provider behavior and staging review after Phase 3 exit.

### PR #24: AI Phase 1B: default-off agency governance, budgets and usage foundation

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `74168f1962f6297d2959a78540d364a46375a1db` (`feat/ai-governance-foundation`).
- Target: `feat/ai-operations-foundation`; API-reported base: `b5590b8e591d895fc7342ae42a97887c4e70935b`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 4.
- Draft: yes. Changed files against PR base: 15.
- Prisma paths changed against audited main: `backend/prisma/migrations/20261112183000_ai_governance_foundation/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Preserve stacked draft; rebase after #23 acceptance.
- Acceptance still required: Default-off/zero budgets, owner capabilities, audit evidence, tenant denials and migration rehearsal.

### PR #25: AI Phase 1C: founder review, emergency lock and read-only tool registry

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `c6140e35e86fb0fe19150bdc6811770033f53d12` (`feat/ai-platform-controls`).
- Target: `feat/ai-governance-foundation`; API-reported base: `74168f1962f6297d2959a78540d364a46375a1db`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 16.
- Draft: yes. Changed files against PR base: 21.
- Prisma paths changed against audited main: `backend/prisma/migrations/20261112183000_ai_governance_foundation/migration.sql`, `backend/prisma/migrations/20261112190000_ai_platform_controls/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Preserve stacked draft; rebase after #24 acceptance.
- Acceptance still required: Founder authorization, fail-closed kill switch, fixed read-only tools, redaction and denied-access audit tests.

### PR #26: AI Phase 1D: atomic quota reservations and disabled-by-default usage ledger

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `d6aaa1e0fc13e4c6598285bea94b8a695e6392ee` (`feat/ai-quota-foundation`).
- Target: `feat/ai-platform-controls`; API-reported base: `c6140e35e86fb0fe19150bdc6811770033f53d12`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 18.
- Draft: yes. Changed files against PR base: 14.
- Prisma paths changed against audited main: `backend/prisma/migrations/20261112183000_ai_governance_foundation/migration.sql`, `backend/prisma/migrations/20261112190000_ai_platform_controls/migration.sql`, `backend/prisma/migrations/20261112203000_ai_quota_reservation_foundation/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Preserve stacked draft; rebase after #25 acceptance.
- Acceptance still required: Real PostgreSQL reservation concurrency, reserve/settle/release idempotency, ambiguity reconciliation, zero-default budgets and migration rehearsal.

### PR #27: Frontend: validate dashboard API contracts at runtime

- Owner: founder `@MOUBI9A`; implementation assignee: none.
- Head: `a7dab8cded2fc9314014a297f620080a6b69f795` (`codex/api-contract-boundary`).
- Target: `feat/compliance-20-point-audit`; API-reported base: `8eb842ce0f3838eff97bf837a940359a0623884e`.
- Git merge-base with audited main: `6a61b3c54d148e79b1dd82dcbc922f07607b2004`.
- Commits unique to main / head: 56 / 12.
- Draft: yes. Changed files against PR base: 11.
- Prisma paths changed against audited main: `backend/prisma/migrations/20261112160000_agency_legal_acknowledgements/migration.sql`, `backend/prisma/migrations/20261112170000_privacy_requests/migration.sql`, `backend/prisma/schema.prisma`.
- Decision: Rebase only after #22 is accepted.
- Acceptance still required: Validate runtime response schemas and failure UI on current endpoints; run live-stack contract tests; do not merge as if independent of compliance.

## Sequencing and collision controls

1. Complete Phase 0 and the Phase 1 security/recovery gates before compliance consolidation. #22 precedes #27; #27's own file list hides inherited schema work.
2. #20 is independent of the AI stack, but requires isolated hosted storage and migration rehearsal before release.
3. #23 → #24 → #25 → #26 remains deferred until the Phase 3 core-pilot exit gate. A clean stacked diff does not prove compatibility with current main.
4. #7, #8, #9, #20, #22 and #24–#26 touch the shared Prisma schema. Serialize schema ownership; compare migration names and SQL semantics against the then-current database and repo, not merely filenames. No full SQL collision/drift audit was performed here.
5. Locale catalogs, Sidebar, auth, booking and coordination files overlap across branches. Port small reviewed slices; preserve current translations, guard behavior, deployment rules and source-of-truth hierarchy.
6. Close legacy PRs only after a replacement is accepted or a documented rejection/supersession review passes. This inventory does not perform those closures. #8 vehicle-control scope is rejected by the accepted plan.

## Limits and release gate

The November 19 topology audit in PR #39 found automatic production deployment from main without a production migration gate. PR #39 is still awaiting merge approval as of this inventory; its facts must be refreshed before release. No production mutation, data export, provider activation, branch rewriting or dependency installation occurred in P0-07. The untracked screenshots directory is untouched.

Rollback for this documentation change is a reviewed revert of this PR; no database rollback is needed. Each future code release must satisfy its own tests, staging, migration and founder approval gates. P0-07 completes only when this inventory is accepted and merged; P2-03 owns actual selective ports and closures.
