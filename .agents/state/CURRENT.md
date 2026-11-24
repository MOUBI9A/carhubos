# Current Operational State

**Last verified:** 2026-11-24 for Git, required checks and read-only Actions budget UI; code/policy review remains November 23; hosting, cost and local QA observations remain dated November 22.

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`
**Canonical task board:** `docs/progress/EXECUTION_BOARD.md`
**Working branch:** `codex/p0-09-source-inventory` (draft [PR #44](https://github.com/MOUBI9A/carhubos/pull/44), parent #43 at `e0ee6ba57967429757b000ed30d45c355301933f`).
**Active task:** P0-09 in REVIEW. P0-06 (#43) and P0-07 (#42) remain in REVIEW.

## P0-09 handoff

The master plan already required a source inventory at the Phase 0 exit. The board now tracks it separately from the PR disposition inventory. Source main is `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`. Claim `a9caf32`, implementation `a5245be`. See `docs/operations/SOURCE_INVENTORY.md` and `scripts/source-inventory.py`. Board, CURRENT, NEXT and COORDINATION carry the handoff.

Local verification reproduced the report byte for byte and resolved the referenced source paths against the pinned tree. Independent Git queries confirmed 52 web pages, 42 controller declarations, 206 HTTP methods, four scheduled methods, 40 Prisma models and 21 SQL migrations. The 206 HTTP method/path combinations are unique in the snapshot. Antigravity reviewed the validation approach and flagged its limits: literal scans can miss dynamic registrations or share blind spots with grep. Runtime access, deployment state and provider activation require separate tests. The change affects repository documentation and a local reporting utility only. Revert the scoped change through review to roll back.

## Release order

Resolve B-011 and accept #42 through protected review, then retarget and verify #43, followed by #44. Recheck the inventory if application sources move. The last verified #43 preview passed on `e0ee6ba`. CI for PRs targeting feature branches is unscheduled by the current workflow. Preserve the zero paid-overage limit.

## Latest accepted and pending work

- P0-04 PR #30 merged as `ff6d167`; five canonical checks passed.
- P0-05 PR #39 merged with founder approval as `a854a21`. Vercel production is READY on this exact SHA and live health/readiness returned HTTP 200. Canonical topology document: `docs/operations/PRODUCTION_TOPOLOGY.md`.
- P0-07 completed a read-only 16-PR disposition inventory on draft [PR #42](https://github.com/MOUBI9A/carhubos/pull/42); implementation/merge is still protected REVIEW due GitHub account billing/limit blocker #40. Its coordination claim was released separately as `10eb837`.
- P0-06 was separately claimed in the `COORDINATION.md` + execution-board commit `0ebace0`. The accepted implementation scope is documentation/coordination only. `docs/operations/ENVIRONMENT_PROVIDER_DATA_MATRIX.md` defines the six environment boundaries, provider/secret/data, seed/retention and release gates.
- No source code, schema, migration, cloud secrets, production settings, customer rows, payment provider or Vercel aliases were changed by P0-06.

## Verified environment and cost constraints

- GitHub PR #42 head `10eb8377ce46cf831b30948c660684eb41f71bed` has five failed jobs in run `45011531906`. Its annotation, re-read November 23, reports account payment/spending-limit failure before execution (#40 / B-011). PR #43 has no five-job CI run because its base is a feature branch and the workflow filters PRs to `main`; Vercel success is not required CI. No bypass or paid spending is permitted.
- Azure for Students is **Enabled**; actual month-to-date Azure cost was approximately USD 3.83 from existing unrelated resources (not remaining student credit). Dedicated Azure resource group `carhub-staging-dev` in `northeurope` has **no billable child resources**, and unrelated Creator OS VM remains untouched.
- Supabase attempted to create `carhubos-staging` after a `$0/month` quote but provider rejected it on the owner's **2-free-project** limit. No staging Supabase project/database/storage exists. Existing CarHub production and Influence Factory projects were unchanged.
- Synthetic **local-only** exact-release tests at `a854a21`: full pinned Chromium Playwright 45/45, backend live-DB 17/17, backend unit 656 passed (16 skipped), frontend 55 passed; both production-style builds, type/lint and PostgreSQL 17 fresh migration/restore passed. Not hosted Preview runtime, real storage, production PITR or pilot acceptance.
- Production `main` automatically deploys; no production migration or promotion gate (B-009). Online payment and AI Vision remain disabled by verified production configuration. Do not publish legal claims, activate live providers or import customers.

## P0-06 handoff

The proposed policy is in draft [PR #43](https://github.com/MOUBI9A/carhubos/pull/43), deliberately targeting `codex/p0-07-pr-disposition` until parent PR #42 merges. Initial implementation `cd5f8d353a9ee4037ea722e02b805d0220f50f8e` and prior claim release `286985521f212626ef38578b75b631a2a5b10361` were already present when this session resumed. Review corrections were claimed and pushed separately as `21d509c`; do not duplicate the initial implementation.

November 23 review added:

- Actual provider enforcement versus proposed policy, including Resend credential-triggered activation, explicit AI simulation override, generic WhatsApp mock success and the unimplemented CMI adapter. B-012 assigns the WhatsApp acceptance gap to existing `P3-02` work, with configuration/redaction follow-ups in `P1-07`/`P1-06`.
- Synthetic-data cleanup ownership, proposed expiry limits and exception evidence; real-data legal retention and backup deletion remain unapproved under B-004.
- Exact stacked-PR CI scheduling and B-011; retarget/rerun steps preserve all protected gates. Stale topology and claim-release instructions corrected.
- Touched files only: matrix, execution board, CURRENT, NEXT, BLOCKERS and COORDINATION. No functions/classes, runtime files, secrets, schemas, data, hosted settings or user screenshots changed.

Independent consultation: Antigravity `gemini-3.8-flash-low`, plan mode, received only the policy and bounded nonsecret code facts; returned six findings. CI scheduling, retention distinction, provider overrides and unprovisioned-stage clarity were incorporated. Its suggestion to call branch protection inoperative was rejected: the gate still blocks acceptance; compute cannot start. Existing 7-day CI artifact retention is a verified workflow setting, not an invented legal period.

Verification: local documentation links, code-source references, whitespace and credential-pattern scan; no application tests rerun for documentation-only changes. Historical synthetic QA above is not a new run or evidence for unimplemented controls. Protected remote CI, hosted staging, provider execution and production recovery remain unproved. Rollback is a reviewed documentation revert. Final review/release commits are recorded in the PR history; verify its current head before accepting.

## Prior P0-06 release evidence

November 24 release-blocker refresh (claim `653d282`): canonical main remains `a854a21`; #42 remains at `10eb837` with the same pre-start failures and no later run. All five required contexts remain enforced for administrators. #43 Vercel status passed on `124b674`; this does not supply its unscheduled GitHub jobs. Signed-in account UI reports Actions `Usage blocked` at zero paid budget even though some included compute remains. B-011 now records this discrepancy and the CLI billing-permission limitation. No paid budget, account permission, production setting or provider was changed; no new test run or merge was attempted.

The next external action is account-owner resolution of included Actions access, using GitHub billing support if necessary while retaining zero paid overages. Do not equate the displayed budget block with proven exhaustion or a confirmed failed payment. Further release retries need evidence that the account restriction has cleared. This documentation refresh was checked with `git diff --check` and staged-file inspection; application tests are unchanged.

1. Leave P0-06 PR #43 in protected REVIEW until PR #42 merges and the five exact-head required jobs run successfully. Retarget #43 to `main` only when its parent is safely accepted.
2. Read COORDINATION for current ownership: its separate release commit is authoritative; do not repeat a released claim. Use `git worktree list` and the remote PR head to locate the correct branch.
3. Do not create staged paid services until Azure remaining credit/expiration and verified free-tier eligibility are known. Do not bypass GitHub checks while billing is blocked.
4. Later Phase 1 starts with P1-01 read-only provenance, then P1-02 hosted staging and P1-03 recovery rehearsal. No agency import until those gates pass.

The canonical board and master plan, not this file, define completion. No P0-06 claim is `DONE` before the required protected evidence and merge into main.
