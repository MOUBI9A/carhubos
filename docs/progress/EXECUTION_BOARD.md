# Fider Platform Execution Board

**Board version:** 1

**Last updated:** 2026-11-18

**Canonical plan:** `docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md`

**Canonical base at board creation:** `origin/main` at `6a61b3c54d148e79b1dd82dcbc922f07607b2004`

**Active phase:** Phase 0 — control and one source of truth

**Active task:** `P0-01`

**Plan/setup PR:** #28 (`codex/platform-readiness-master-plan`) — merged as `e010505e5f5ad53cc3bf9535e506668e2ed913ef`

This board is the canonical work queue. Strategy belongs in the master plan; exact resume state belongs in `.agents/state/CURRENT.md`. Do not create another roadmap.

## Board rules

1. Follow `docs/operations/AI_CONTINUITY_PROTOCOL.md` before changing a row.
2. Only a task with status `READY` and all dependencies `DONE` may be claimed.
3. Only one active owner per task. Schema/migrations are always serialized.
4. `DONE` means accepted evidence passed and the change is merged into the canonical base.
5. When a task changes status, update `.agents/state/CURRENT.md` in the same milestone.
6. Add new work with the phase prefix and next unused number; never renumber existing IDs.
7. Human gates are not blockers to bypass. Record the required decision/action in `.agents/state/BLOCKERS.md`.

Allowed statuses: `NOT_STARTED`, `READY`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE`, `DEFERRED`.

## Phase gates

| Phase | Goal | Status | Entry dependency | Exit evidence |
|---|---|---|---|---|
| 0 | Protected repository, canonical truth, verified topology and controlled PR queue | `IN_PROGRESS` | None | Master plan accepted; CI unambiguous; `main` protected; ownership, environment rules, topology and PR disposition recorded |
| 1 | Security, data, recovery and observability foundation | `NOT_STARTED` | Phase 0 | MFA/session controls, staging, restore/migration rehearsal, alerts and security gates proven |
| 2 | Safe consolidation of compliance/contracts and still-useful legacy work | `NOT_STARTED` | Phase 1 | Reviewed current merge graph with no silent enablement; AI stack remains unmerged |
| 3 | Non-AI core acceptance and controlled web pilot | `NOT_STARTED` | Phase 2 | First agency then 3–5 agencies complete accepted core cycles within pilot guardrails |
| 4 | Governed AI foundation | `NOT_STARTED` | Phase 3 | Rebased AI controls, provider bounded/default-off, read-only staging evaluation passes |
| 5 | Agency/customer assistants and communication center | `NOT_STARTED` | Phase 4 | Grounded answers, human handoff, no unapproved commitment or send |
| 6 | Payment protection, supervised workflows and passive telemetry | `NOT_STARTED` | Phase 5 | Provider/replay/privacy/approval tests and limited capability pilots pass |
| 7 | Selective low-risk automation and growth intelligence | `NOT_STARTED` | Phase 6 | Each automation has bounded blast radius, evidence, pause and compensation path |
| 8 | Capability expansion and general availability | `NOT_STARTED` | Phase 7 | GA gate in master plan satisfied on exact release SHA |

## Phase 0 — current queue

| ID | Status | Task | Dependencies | Acceptance evidence | Owner / PR |
|---|---|---|---|---|---|
| `P0-00` | `DONE` | Install the canonical cross-AI plan, board, current-state and handoff protocol; remove stale resume signals | None | Canonical files linked from `AGENTS.md`/`CLAUDE.md`; stale state replaced; master-plan corrections incorporated; exact-head CI and preview green; merged | Codex / #28 |
| `P0-01` | `REVIEW` | Remove duplicate push+PR CI runs and establish stable required-check contexts | `P0-00` | One CI set per PR; push-to-main coverage preserved; five web/backend contexts deterministic; mobile required-check behavior documented; green test PR | Codex / PR #29; exact head 815c831, CI run 44267324796 green across all jobs, awaiting merge |
| `P0-02` | `NOT_STARTED` | Protect `main` and prove enforcement | `P0-01` | PR required; required checks enforced; force-push/deletion blocked; stale approvals/conversations policy set; deliberately red test PR cannot merge | Unclaimed |
| `P0-03` | `NOT_STARTED` | Add CODEOWNERS and release/incident authority matrix | `P0-02` | Sensitive paths have reviewers; merge/deploy/migrate/secret/AI/payment/incident owners recorded and reviewed | Unclaimed |
| `P0-04` | `NOT_STARTED` | Consolidate canonical documentation and archive/signal stale readiness claims | `P0-00` | All active docs link to plan/board/current state; stale phase summaries visibly historical; no conflicting source-of-truth claim | Unclaimed |
| `P0-05` | `NOT_STARTED` | Verify production topology and deployment trigger read-only | `P0-02` | Hosting project/team, deployed SHA/revision, DB/storage/DNS, env ownership, migration history and main-to-production behavior recorded without secrets | Unclaimed |
| `P0-06` | `NOT_STARTED` | Define environment/provider/data rules for development, test, staging, pilot and production | `P0-05` | Matrix covers allowed data, providers, credentials, feature flags, seeding, retention and approvals for every environment | Unclaimed |
| `P0-07` | `NOT_STARTED` | Publish disposition/dependency matrix for PRs #5–#13, #20 and #22–#27 | `P0-04` | Every PR has exact base/head, owner, dependency, schema risk, port/close/rebase decision and exit evidence | Unclaimed |

## Phase 1 — security, data and recovery

| ID | Status | Task | Dependencies | Acceptance evidence | Owner / PR |
|---|---|---|---|---|---|
| `P1-01` | `NOT_STARTED` | Read-only production schema, migration and data-quality provenance audit | Phase 0 | Deployed SHA/schema/migration table/version/extensions/scale/drift and invalid-data risks recorded; no raw customer export | Unclaimed |
| `P1-02` | `NOT_STARTED` | Select and provision production-shaped staging plus managed PostgreSQL/PITR | `P1-01` | Approved service/region/access/backup policy; staging isolated with sandbox providers | Unclaimed |
| `P1-03` | `NOT_STARTED` | Rehearse backup restore, PITR, pending migrations and rollback/forward repair | `P1-02` | Measured RPO/RTO, successful disposable restore, integrity smoke, migration lock/duration evidence and named owners | Unclaimed |
| `P1-04` | `NOT_STARTED` | Privileged MFA, session inventory/revocation and emergency recovery | Phase 0 | ROOT_ADMIN/OWNER MFA and recovery pass; session revoke proven; impersonation time-bound/audited | Unclaimed |
| `P1-05` | `NOT_STARTED` | Controller/tenant/capability/consent security audit | Phase 0 | Negative IDOR/authz/consent suite and review cover every sensitive controller; findings resolved or explicitly gated | Unclaimed |
| `P1-06` | `NOT_STARTED` | Observability, redaction, alerts, on-call and incident runbooks | `P0-05` | Error/request/provider/DB dashboards; alert reaches owner; tenant/payment/breach/provider/restore runbooks exercised | Unclaimed |
| `P1-07` | `NOT_STARTED` | Shared throttling and runtime/dependency/security baseline | `P0-05` | Multi-replica rate-limit behavior defined/proven; runtime versions aligned deliberately; no unaccepted critical/high production issue | Unclaimed |

## Phase 2 — safe consolidation

| ID | Status | Task | Dependencies | Acceptance evidence | Owner / PR |
|---|---|---|---|---|---|
| `P2-01` | `NOT_STARTED` | Rebase and accept compliance PR #22 | Phase 1 | Exact-head review, migration rehearsal, legal/operator inputs identified, required CI and staging acceptance pass | Unclaimed |
| `P2-02` | `NOT_STARTED` | Rebase and accept runtime-contract PR #27 | `P2-01` | Runtime schemas and live-stack contract tests pass on current base with no consumer regression | Unclaimed |
| `P2-03` | `NOT_STARTED` | Port or close legacy PRs #5–#13 | `P0-07` | Reproduced current defect before each port; small replacement PR or documented rejection; originals closed | Unclaimed |
| `P2-04` | `NOT_STARTED` | Hosted staging acceptance for Guardian upload PR #20 | `P1-02` | TUS/storage auth, signed access, retention, scanning, failure recovery and tenant tests pass in hosted staging | Unclaimed |

AI PRs #23–#26 are reviewed/preserved during Phase 2 but remain unmerged until Phase 4.

## Phase 3 — core web acceptance and pilot

| ID | Status | Task | Dependencies | Acceptance evidence | Owner / PR |
|---|---|---|---|---|---|
| `P3-01` | `NOT_STARTED` | Five-role journey matrix and multilingual/accessibility acceptance | Phase 2 | ROOT_ADMIN/OWNER/MANAGER/AGENT/RENTER critical journeys pass with real API/PostgreSQL in FR/AR/EN | Unclaimed |
| `P3-02` | `NOT_STARTED` | Close or hide core gaps and prove booking/payment/deposit/reconciliation cycles | `P3-01` | Fleet report, accidents, contact, overlap concurrency and unfinished-success surfaces resolved or removed from pilot contract | Unclaimed |
| `P3-03` | `NOT_STARTED` | Tenant-safe agency data-import pipeline/runbook | `P3-01` | Encrypted dry run, mapping/dedupe/validation/control totals/idempotency/audit/rollback/temp-file deletion proven | Unclaimed |
| `P3-04` | `NOT_STARTED` | Pilot guardrails and support readiness | `P1-06`, `P3-02` | Provisional SLO/error/latency/RPO/RTO/support/reconciliation/capacity thresholds and stop owner approved | Unclaimed |
| `P3-05` | `NOT_STARTED` | Onboard first core web pilot agency | `P3-03`, `P3-04` | Signed release decision; accepted booking-to-return and reconciliation cycle; no Sev-1/2 invariant failure | Unclaimed |
| `P3-06` | `NOT_STARTED` | Expand core pilot to 3–5 agencies and establish baseline | `P3-05` | Stable cohort metrics, support load, workflow completion, reconciliation and comprehension baseline recorded | Unclaimed |

## Phases 4–8 — governed capability expansion

| ID | Status | Task | Dependencies | Acceptance evidence | Owner / PR |
|---|---|---|---|---|---|
| `P4-01` | `NOT_STARTED` | Rebase/review AI PRs #23–#26 against post-pilot main | `P3-06` | Migration/contract drift resolved; policy/kill switch/zero budgets/quota/tool registry reviewed; provider remains disabled | Unclaimed |
| `P4-02` | `NOT_STARTED` | Read-only agency intelligence gateway and evaluation | `P4-01` | Tenant/provenance/injection/stale/missing/multilingual/cost/latency/kill-switch evaluation passes in staging | Unclaimed |
| `P5-01` | `NOT_STARTED` | Agency assistant, customer assistant and human-handoff communication center | `P4-02` | Authoritative answers, typed drafts, consent/retention, failed-delivery queues and human handoff accepted | Unclaimed |
| `P6-01` | `NOT_STARTED` | Deterministic payment-protection monitoring and supervised proposals | `P5-01` | Replay/duplicate/ambiguous-result/reconciliation cases pass; no model performs money mutation | Unclaimed |
| `P6-02` | `NOT_STARTED` | Provider-neutral passive telemetry pilot | `P5-01` | Simulator/provider fixtures, replay/privacy/retention/access tests pass; no vehicle control path exists | Unclaimed |
| `P7-01` | `NOT_STARTED` | First bounded low-risk automations | `P6-01`, `P6-02` | Per-rule owner, metric, blast radius, audit, pause, compensation and false-positive evidence | Unclaimed |
| `P7-02` | `NOT_STARTED` | Evidence-grounded growth advisor | `P7-01` | Assumptions/uncertainty/fairness/experiment stop conditions and human override accepted | Unclaimed |
| `P8-01` | `NOT_STARTED` | Capability expansion and general-availability gate | Phase 7 | Every Phase 8 gate in the master plan satisfied on an immutable release SHA | Unclaimed |

## Completed task evidence

Add entries here only when a task becomes `DONE`:

| ID | Merge SHA | Evidence summary | Date |
|---|---|---|---|
| `P0-00` | `e010505e5f5ad53cc3bf9535e506668e2ed913ef` | PR #28 merged after duplicate backend, container, live-Postgres E2E, frontend, full Playwright and Vercel preview checks passed on exact head `2f2bbe4a82b61427f536895bc97e225f6beda79c`. | 2026-11-18 |
