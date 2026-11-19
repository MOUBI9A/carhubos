# Release and Incident Authority Matrix

**Effective:** 2026-11-19

**Repository:** `MOUBI9A/carhubos`

**Owner:** Hamza El Moueddane / GitHub `@MOUBI9A`

This matrix separates repository access, review ownership and operational
authority. A GitHub role, CODEOWNERS entry, AI tool login or successful test is
not by itself authorization to change production, spend money, access customer
data or make a public/legal commitment.

## Current actors

| Actor | Repository role | Standing authority |
|---|---|---|
| Hamza El Moueddane (`@MOUBI9A`) | Admin, founder, security owner | Final authority for product risk, production, payments, secrets, providers, legal commitments and incident command |
| `@ChaimaAhaik` | Write collaborator | May author and review scoped pull requests; has no production, billing, migration, secret, provider, legal or incident-command authority unless the founder records a specific delegation |
| Codex and approved external AI reviewers | Implementation and review tools | May inspect, implement, test, commit, push, open PRs and merge routine board-scoped work when all protected gates pass; may not infer operational authority from tool access |

## Decision matrix

| Action | Required owner | AI / collaborator role | Required evidence and gate |
|---|---|---|---|
| Merge low-risk documentation, governance or test-only changes | Founder-delegated Codex workflow or founder | Prepare/review; Codex may execute the merge only within the explicit delegation below | Exact PR head; all five required checks green; conversations resolved; no runtime, dependency, schema, infrastructure, provider, payment, data, legal or environment effect |
| Merge runtime, dependency, schema, infrastructure or deployment-affecting changes | Founder | Prepare, test and recommend; do not merge without the founder's recorded decision while production topology remains unverified | Exact PR head; all protected checks; production-trigger impact; applicable migration/provider/payment/data gates |
| Change branch protection, CI security thresholds or CODEOWNERS | Founder/security owner | Propose and verify through a scoped PR; never weaken a gate merely to merge | Before/after API evidence; red enforcement proof when applicable; protected PR |
| Deploy or promote production | Founder/release owner | Prepare release and observe evidence; no manual production action without a recorded release decision | Exact release SHA; green required checks; rollback owner; post-deploy smoke; provider and migration gates satisfied |
| Apply or roll back a production database migration | Founder plus named migration owner | Prepare, review and rehearse only until the production gate is recorded | Backup/PITR evidence; disposable rehearsal; lock/duration estimate; forward/rollback plan; exact migration set |
| Create, reveal, rotate or revoke secrets | Founder/security owner | May validate secret names and fail-fast behavior; never print or copy secret values into code, logs, chat or docs | Named system and environment; rotation/revocation plan; least privilege; audit record |
| Enable a paid or production AI/provider integration | Founder/security owner and billing owner | Implement provider-neutral, default-off adapters and sandbox tests | Contract/cost/data-region/retention review; scoped credentials; kill switch; budget and privacy approval |
| Enable live payments, change pricing, issue a real charge/refund/payout | Founder/payment owner | Implement and test sandbox behavior; never fabricate provider success | Live-account ownership; idempotency/reconciliation proof; webhook verification; explicit amount/currency/customer scope |
| Access or export real customer/tenant data | Founder/data owner; legal input when required | Use bounded read-only queries only when explicitly scoped; do not export raw data by default | Purpose, tenant scope, minimization, retention, audit trail and legal basis |
| Publish legal/privacy/store claims or customer communications | Founder; counsel review where required | Draft and validate against code/provider truth; do not publish or send without the recorded gate | Approved wording, business identity, subprocessors, retention and support owner |
| Declare or command a production incident | Founder is incident commander until explicitly delegated | Diagnose, preserve evidence, recommend containment, and stop unsafe automation when reversible; do not notify customers or alter production data without authority | Incident timeline; affected scope/tenants; evidence preservation; containment and recovery owners |
| Production rollback or emergency disablement | Founder/incident commander | Prepare the command/runbook and verify the target; execute only under a recorded incident/release decision | Exact target revision; blast radius; data compatibility; smoke/recovery evidence |

## Explicit low-risk merge delegation

On 2026-11-18 the founder explicitly instructed Codex and Antigravity to work
autonomously without routine prompts. This is a recorded delegation, not an
authority inferred from repository or tool access. Until P0-05 proves the
main-to-production trigger, Codex may use it only to merge reversible
documentation, governance and test-only pull requests after the protected
branch reports every required check green and no unresolved conversation or
material finding remains.

The delegation does not cover runtime or dependency changes, infrastructure or
deployment configuration, production deployment, schema or production
migrations, live provider/payment activation, billing changes, secret
operations, customer-data access/exports, public communications, legal
acceptance or incident command. The founder may revoke or narrow the delegation
at any time.

## Review and escalation rules

1. `.github/CODEOWNERS` maps sensitive paths to `@MOUBI9A`. It requests the
   accountable owner but does not replace required CI or this matrix.
2. `@ChaimaAhaik` may review code, but repository write access does not silently
   delegate any operational decision in the table above.
3. Required CODEOWNER approvals remain disabled while the founder is the only
   confirmed accountable CODEOWNER; enabling them now would deadlock founder-
   authored pull requests. Add an independently accountable owner before making
   CODEOWNER approval mandatory.
4. When an action spans rows, the strictest gate applies. If authority is
   unclear, keep the capability disabled and record the decision in
   `.agents/state/BLOCKERS.md` or `.agents/state/DECISIONS.md`.
5. A preview, local test, CI run, export or provider response proves only what
   its evidence directly covers. It is not automatically a deployment,
   migration, payment, notification or production acceptance.

## Emergency recovery

Branch protection applies to administrators. If CI infrastructure itself is
unavailable, the founder/security owner may temporarily change protection only
after recording the incident, the exact setting changed, why no safer path
exists, and the restoration condition. Restore and reverify protection as soon
as the incident ends; never leave an emergency bypass implicit.
