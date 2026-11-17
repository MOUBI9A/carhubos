# Fider Platform Readiness Master Plan

**Plan date:** 2026-11-17

**Scope:** CarHub OS / Fider web, API, database, mobile, integrations, AI, telemetry, security, compliance, operations, and real-user rollout

**Plan of record:** staged consolidation of the existing platform; no rewrite and no big-bang merge

**First release target:** a controlled web-first pilot for 3–5 Moroccan rental agencies

**Production authority:** every production migration, provider activation, data import, billing change, and general-availability release remains a human approval gate

---

## 1. Outcome

Finish Fider as a trustworthy, operable product for real agencies and renters without weakening its tenant, money, consent, or audit guarantees.

The release sequence is:

1. Establish one truthful source of project and release state.
2. Protect the code and production delivery path.
3. Prove recovery, security, legal operations, and all core rental workflows.
4. Consolidate the useful draft work in a controlled merge queue.
5. Launch a small web pilot with AI and telemetry disabled.
6. Enable read-only AI for selected pilot agencies.
7. Add customer assistance, supervised workflows, passive GPS, and payment intelligence.
8. Permit only proven, low-risk automation after pilot evidence and founder approval.

“Ready for real users” does not mean every future idea is enabled. It means the core platform is safe and supportable, unfinished features are honestly hidden or labelled, failure can be recovered, and risky capabilities are default-off.

---

## 2. Evidence vocabulary

Every progress report and release decision must use these terms consistently:

| Status | Meaning |
|---|---|
| **Verified current** | Rechecked on the named commit or live service with reproducible evidence. |
| **Draft** | Code exists in an unmerged branch or pull request; it is not part of `main` or production. |
| **Local-only** | Passed locally or in CI, but not accepted in a hosted staging environment. |
| **Blocked** | Requires a named external decision, credential, contract, legal review, or environment. |
| **Not implemented** | No production-capable implementation exists. |
| **Production active** | Deployed and smoke-tested on the production commit; this never follows merely from a green build. |

No document may call a feature “done” when it is only drafted, mocked, locally tested, or deployed without acceptance evidence.

---

## 3. Verified baseline on 2026-11-17

### 3.1 Current platform

| Area | Verified state | Implication |
|---|---|---|
| Repository | `origin/main` is `6a61b3c54d148e79b1dd82dcbc922f07607b2004`. Planning is isolated on `codex/platform-readiness-master-plan`. | This exact main SHA is the comparison baseline. |
| Public service | `https://carhub.codes`, `/api/health`, and `/api/ready` returned HTTP 200 during this audit. | The endpoints are reachable. The exact hosting project, deployed SHA, database, migration history, and environment ownership behind them are not yet fully verified; HTTP 200 alone is not a production-readiness verdict. |
| Main CI | The latest `main` CI run for `6a61b3c` passed. CI has backend, backend-container, live-Postgres backend E2E, frontend, and full-stack Playwright jobs. | The automated foundation is substantial and should become mandatory. |
| Repository governance | GitHub reports `main` is not protected and there are no repository rulesets. | A contributor or token can bypass the green gate. This is a launch blocker. |
| Product surface | 40 backend controllers, 52 web route pages, 21 Prisma migrations, and a separate Expo mobile app exist. | This is an established modular monolith, not a greenfield project. |
| Core business platform | Authentication, roles/capabilities, tenant-scoped ERP flows, bookings, contracts, inspections, payments/refunds/deposits, consent vault, tasks/notifications, maintenance, analytics, SaaS administration, audit logs, and multilingual web surfaces exist. | Completion should focus on reconciliation, acceptance, missing operational controls, and truthful gaps. |
| Mobile | Separate mobile CI runs typecheck/tests and Expo configuration validation when mobile paths change. | Mobile is a distinct release track; it is not proven by the web release gate. |
| Render | The inspected “My Workspace” does not contain a matching `MOUBI9A/carhubos` service. | Render must not be treated as the current Fider production backend without a new deployment decision. |
| Vercel | The known production deployment is Ready and serving the public aliases, but this checkout is not locally linked to that Vercel project. | Environment inspection and deployment must use an explicitly verified project/team context. |

### 3.2 Important truthful gaps

The following were found in current `main` and must be resolved, hidden, or explicitly deferred before broad launch:

- Founder fleet-health report endpoint throws `NotImplementedException`.
- Owner reports page is labelled “coming soon.”
- Accident photo/constat upload and insurance notification are not wired.
- Contact WhatsApp is labelled “coming soon.”
- Database-level booking-overlap enforcement is still a TODO; application checks alone need a concurrency decision and test.
- Mock payment, Stripe test scaffolding, Twilio development behavior, and development email behavior exist. Production must fail closed unless real providers are deliberately configured.
- Existing backup/restore scripts are syntax-checked by CI, but a successful restore rehearsal into a disposable database is not yet part of the gate.
- Shared production rate limiting, error monitoring/APM, alert ownership, and a complete incident runbook are not established as verified production controls.
- Privileged-user MFA and emergency access procedures are not established as verified launch controls.
- Legal texts and data-subject workflows still need Moroccan business facts, operator procedures, and counsel/founder approval.
- Node versions differ across web/backend CI, mobile CI, and the current hosting default. Runtime alignment needs deliberate testing, not an automatic upgrade.

### 3.3 Draft work is not production

| PR | Status | Plan |
|---:|---|---|
| #22 compliance | Draft; GitHub currently reports merge state `CLEAN` against `main` | Rebase, review legal/DB impact, run migration rehearsal, accept first if the exact head stays green. `CLEAN` is Git graph status, not staging or production proof. External legal approval remains separate. |
| #27 runtime API contracts | Draft, stacked on #22; GitHub currently reports merge state `CLEAN` | Rebase after #22 lands; keep the runtime validation and live-stack contract test. `CLEAN` does not prove live data or migration compatibility. |
| #20 Guardian resumable video | Draft; GitHub currently reports merge state `CLEAN` | Do not merge for production use until hosted non-production Supabase/TUS acceptance, retention, scanning, authorization, and recovery evidence pass. |
| #23–#26 AI foundation stack | Four draft PRs; GitHub currently reports merge state `CLEAN` for each stacked base | Preserve the governance design. Rebase only after core/compliance consolidation; keep provider execution disabled until the AI release phases below. |
| #5–#13 legacy set | Mostly conflicting and months old | Compare each against exact `main`; port only still-missing behavior into small new PRs, then close the stale branches with disposition notes. |
| #8 telematics | Conflicting and includes immobilization | Never merge as-is. Salvage only safe adapter/crypto/network patterns; replace the feature with a new passive, read-only telemetry design. |

---

## 4. Architecture decision record

### Context

Fider already has a large NestJS/Next.js/PostgreSQL platform and reachable public endpoints whose exact deployment provenance still needs verification. It also has conflicting historical work, a separate compliance/contract stack, a four-PR AI stack, and an ambitious AI/telemetry product brief. The highest risk is no longer lack of ideas; it is combining too much unverified work without a reversible release path.

### Decision drivers

- Tenant isolation and consent are non-negotiable.
- Payment and financial records must reflect verified provider truth.
- Existing agencies must not be disrupted by a rewrite.
- A small team needs an operable architecture and low coordination overhead.
- AI and GPS need stronger controls than ordinary UI features.
- Every migration and provider activation must be reversible or containable.

### Options considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Rewrite into a new AI-first platform | Clean conceptual model | High regression/data-migration risk; delays users; repeats already solved tenancy and money work | **Rejected** |
| Merge every open PR, then repair | Fast apparent feature count | Conflicts, duplicate migrations, unsafe telemetry, false readiness, difficult rollback | **Rejected** |
| Keep the modular monolith, consolidate in small verified slices, and place AI/integrations behind governed boundaries | Reuses proven code; supports one transaction boundary; reversible releases; lower operational cost | Requires disciplined sequencing and honest deferrals | **Accepted** |
| Split AI, workflows, telemetry, and reporting into microservices now | Independent scaling | Premature operational complexity, distributed consistency, more secrets and failure modes | **Deferred until measured need** |

### Accepted architecture

- Keep NestJS, Prisma, PostgreSQL, Next.js, and the existing role portals as the system of record.
- Keep tenant and consent enforcement inside deterministic application services; never delegate authorization to a model.
- Introduce one AI orchestration boundary with a fixed tool registry, policy evaluation, quotas, approval records, audit events, and provider adapters.
- AI tools call typed service methods; they do not execute arbitrary SQL, browse arbitrary URLs, or mutate provider state directly.
- Use queues only for work that must be retryable or asynchronous: notifications, document processing, AI jobs, telemetry ingestion, report generation, and webhook reconciliation.
- Add Redis only with a clear production use and fail-safe behavior: shared rate limits, bounded caches, queue coordination, and short-lived idempotency locks. PostgreSQL remains authoritative.
- Keep telemetry provider-neutral. Initial GPS is read-only and cannot immobilize, unlock, or control a vehicle.
- Prefer backward-compatible schema changes: expand, deploy, backfill, validate, switch reads, then contract in a later release.

### Consequences

- The first real-user release will intentionally exclude or disable several headline AI/GPS features.
- “Complete” becomes a sequence of accepted capabilities rather than one giant launch.
- Old PRs are evidence and source material, not an automatic merge queue.
- Observability, recovery, legal operations, and support are product work, not post-launch chores.

---

## 5. Non-negotiable safety boundaries

These apply in every phase:

1. Derive business `agencyId` from the authenticated identity; a cross-tenant lookup returns 404.
2. Use Prisma Decimal operations and integer cents for comparisons; no floating-point money decisions.
3. Keep capability checks membership-scoped and fail closed; `ROOT_ADMIN` bypass stays explicit and audited.
4. Read renter documents only through active, in-scope consent. Revocation must take effect immediately.
5. Never commit secrets, log tokens/documents, or provide fallback production credentials.
6. Never seed, reset, or destructively test a production database.
7. Never record a payment, refund, deposit release, subscription, or payout as successful without a verified, replay-safe provider event.
8. Never let AI decide authorization, legal eligibility, blacklist status, contract acceptance, payment settlement, or adverse customer action.
9. Never give a model unrestricted database, file, network, email, WhatsApp, payment, or vehicle-control access.
10. No moving-vehicle shutdown. Initial telemetry is passive and read-only; any future control feature requires a separate safety/legal program and hardware assurance.
11. Sensitive AI outputs require provenance, confidence/limitations, and a human approval path.
12. New AI, provider, and automation capabilities start off globally and per agency, with zero budget and no implied consent.
13. Production changes require an exact commit, green required checks, migration evidence, release owner, rollback owner, and post-deploy smoke evidence.

---

## 6. Program sequence

The phases are ordered gates, not parallel promises. Work within a phase can run in parallel when file ownership and migration sequencing are explicit.

### Phase 0 — Establish control and one source of truth

**Goal:** make the repository and program safe to change.

**Work**

- Protect `main`: pull request required, no force pushes/deletion, conversation resolution, stale-review dismissal, and required CI checks.
- Require the five always-running web/backend checks by their stable names. Do not make the path-filtered mobile workflow globally required until it is changed to report a deterministic aggregate result on every PR.
- Add CODEOWNERS/reviewer ownership for schema/migrations, auth/tenancy, money/payments, consent/vault, CI/deployment, and legal pages.
- Reconcile the source-of-truth path mismatch. Move or index the legacy root documents into `docs/operations`, `docs/product`, and `docs/progress` without losing history; archive superseded readiness claims prominently.
- Generate a current inventory from exact `main`: routes, controllers, Prisma models/migrations, jobs, providers, environment variable names, feature flags, open TODOs, and externally owned decisions.
- Create the PR disposition record for #5–#13 and the dependency graph for #20 and #22–#27.
- Define `development`, `test`, `staging`, `pilot`, and `production` data/provider rules.
- Record who can merge, deploy, migrate, rotate secrets, enable AI, approve payments, access logs, and declare an incident.
- Resolve the true production topology without exposing secret values: hosting project/team, deployed SHA, API revision, database service, storage, DNS, deployment trigger, environment ownership, and migration history. Determine whether merging `main` deploys automatically; if it does, require staging promotion and a release approval before any schema PR can land.

**Verification**

- A test PR cannot merge when any required check fails.
- Direct push and force-push attempts to `main` are rejected.
- All active documents point to one readiness plan and one progress ledger.
- Every open PR has an owner, base, dependencies, disposition, and exit criteria.

**Exit gate:** protected main, clean ownership, current inventory, and no ambiguous source-of-truth document.

---

### Phase 1 — Production security, data, and recovery foundation

**Goal:** make failure containable before adding users or features.

**Identity and authorization**

- Add MFA for `ROOT_ADMIN` and agency `OWNER`; strongly encourage or require it for `MANAGER` based on pilot policy.
- Add session/device inventory, server-side revocation, secure password reset, login notification, and emergency account recovery.
- Time-limit and explicitly approve impersonation; show persistent banners; audit start, actions, and exit.
- Re-run a controller-by-controller guard/capability/tenant audit and negative IDOR tests.

**Database and recovery**

- Perform a read-only production provenance and schema audit before planning any production migration: deployed application SHA, Prisma migration table, actual schema drift, extensions, database version, row/tenant counts, large tables, invalid/duplicate data, and current backup/PITR policy. Export no raw customer data during this audit.
- Select a managed PostgreSQL staging/production service with encryption, automated backups, point-in-time recovery, regional policy, and access logs.
- Restore a fresh backup into a disposable environment and run integrity/smoke checks. Record RPO, measured RTO, owner, and evidence.
- Rehearse every pending migration against a recent sanitized production-like clone; inspect locks and duration.
- Resolve the booking-overlap concurrency invariant with a database-authoritative design—prefer a PostgreSQL exclusion constraint where the domain permits it, otherwise a serializable/advisory-lock transaction with proven retry behavior—and concurrent tests. Redis must not be the authority for booking correctness.
- Establish retention and deletion schedules for documents, audit records, telemetry, AI transcripts, provider payloads, and support exports.

**Secrets and network**

- Inventory environment variable names without exporting secret values.
- Rotate or remove stale credentials, separate staging/production identities, and restrict database/provider tokens to least privilege.
- Verify trusted proxy and secure cookie configuration on the actual host.
- Add a shared production rate-limit store before horizontal scaling; define fail-open/fail-closed behavior per endpoint class.

**Observability and operations**

- Add structured application error tracking, request correlation, redaction, service/DB/provider metrics, and actionable alerts.
- Dashboards: availability, latency, 4xx/5xx, login failures, throttling, DB pool, slow queries, queue depth, webhook failures, payment reconciliation, storage errors, and AI spend once enabled.
- Create incident, data-breach, payment mismatch, tenant-leak, provider outage, database recovery, and rollback runbooks.
- Establish support intake, severity levels, on-call ownership, and customer communication templates.

**Verification**

- Security test suite covers auth bypass, IDOR, capability denial, consent denial/revocation, CSRF/origin, SSRF, uploads, and webhook replay/signature checks.
- Backup restore and migration rehearsal pass with timestamps and owners.
- An alert test reaches the responsible person without exposing sensitive data.
- Dependency audits have no unresolved critical/high production vulnerability unless a signed exception has compensating controls and expiry.

**Exit gate:** recovery is rehearsed, privileged access is protected, critical alerts work, and security controls are proven on staging.

---

### Phase 2 — Consolidate safe draft work

**Goal:** bring useful completed work onto one current base without stacking hidden risk.

**Merge order**

1. Rebase #22 on current `main`; review privacy migration, public pages, accessibility, localization, and operator workflows; merge only with migration rehearsal and all required checks.
2. Rebase #27 on the new `main`; merge the runtime schemas and live-stack dashboard contract test.
3. Rebase #23–#26 as a newly reviewed AI foundation stack or squash into reviewable slices. Provider calls remain impossible/default-off.
4. Keep #20 separate until hosted staging storage acceptance is complete.
5. For #5–#13, produce a per-PR diff against current main. Create small replacement PRs only for behavior still missing; close the original conflicting PR after the replacement or documented rejection.

**Required review for every consolidation PR**

- Exact base/head SHA recorded.
- Schema and migration collision audit.
- Tenant/capability/money/consent analysis.
- API contract and UI consumer analysis.
- Full required CI, migration on fresh DB, and staging smoke tests.
- Feature flag/default behavior and rollback plan.
- Documentation updated in the same milestone.

**Special dispositions**

- #8 immobilization behavior is rejected. Any future telemetry work starts from a new read-only specification.
- #10 setup-console documentation may be useful, but it must not duplicate the canonical readiness ledger.
- #11 payment error behavior should be ported only after confirming current gateway exception mapping and avoiding sensitive provider details.
- #12 localization guards should be recreated against the current catalogs if the defect still reproduces.
- #13 must be decomposed; a broad “final unification” patch cannot bypass domain reviews.

**Exit gate:** one current merge graph, no useful change stranded in an unreviewed old branch, and no feature silently enabled by consolidation.

---

### Phase 3 — Core product acceptance for real users

**Goal:** prove that agencies and renters can operate safely without AI.

**Role journey matrix**

| Role | Required accepted journey |
|---|---|
| `ROOT_ADMIN` | Secure login/MFA, provision/suspend agency, manage plans/entitlements, view audit, time-limited impersonation, exit impersonation, emergency lock. |
| `OWNER` | Onboard agency, invite staff, configure fleet/rates/settings, create booking, collect deposit/payment, handover/return, reconcile, view reports, manage subscription. |
| `MANAGER` | Perform delegated operational/finance tasks and receive clear denial for owner-only capabilities. |
| `AGENT` | Customer lookup, availability, booking/check-in/inspection/return/task flows with no finance/settings privilege escalation. |
| `RENTER` | Register/login, link identity, view booking/contract/invoice, pay through an approved flow, upload/view/revoke consented documents, submit privacy request. |

**Functional completion**

- Prove the entire booking lifecycle including cancellation, no-show, overdue, extension, damage, deposit claim/refund, invoice/refund, and reconciliation.
- Complete or explicitly hide accident photo/constat and insurance notification actions.
- Implement fleet-health reporting or remove the endpoint/entry point from the pilot contract.
- Replace “coming soon” reporting/contact actions with working behavior or remove them from pilot navigation.
- Verify customer-to-renter linking and consent boundaries under duplicate/changed email/phone cases.
- Prove contract/PDF generation, escaping, signature/evidence, document retention, and access expiry.
- Prove real outbound email/SMS/WhatsApp only for the providers selected for pilot; otherwise make the unavailable channel explicit and non-successful.
- Verify SaaS subscription entitlement enforcement and the failure behavior of renewal/upgrade flows.
- Establish reconciliation queues for payment, refund, storage, and notification provider ambiguity.

**Mobile decision**

- The pilot defaults to web-first.
- Mobile may enter the pilot only after device-level iOS/Android checks, secure storage/logout, deep links, camera/QR/signature flows, crash reporting, privacy manifests, store metadata, signed builds, and API compatibility pass.
- Web launch does not imply App Store/Play Store readiness.

**Quality gates**

- Full role/locale/browser E2E with real API and PostgreSQL.
- Accessibility keyboard/screen-reader/contrast checks on critical journeys.
- Load tests based on pilot concurrency and largest expected fleet/customer datasets.
- No fabricated metrics, mock success toast, placeholder provider success, or unbounded list on a critical path.
- User acceptance performed by at least one non-developer using a staging agency.

**Phase 3A exit gate:** the non-AI web platform can operate one complete rental and financial cycle in production-shaped staging, recover failures, and support a user.

**Phase 3B — controlled core web pilot**

- Onboard the first agency only after Phases 0–3A, the legal/operator gates, a production migration rehearsal, and a signed release decision pass.
- Start with core web capabilities only. AI, automation, passive telemetry, and unfinished provider channels remain off.
- Expand to 3–5 agencies only after the first agency completes accepted booking-to-return and reconciliation cycles without a severity-1/2 tenant, money, consent, security, or data-loss defect.
- Record the core pilot baseline for reliability, latency, support load, workflow completion, reconciliation accuracy, and user comprehension. These measurements become the comparison point for later AI/integration capabilities.

**Phase 3 exit gate:** the core web pilot is stable enough that new intelligence features can be evaluated without hiding defects in the underlying rental platform.

---

### Phase 4 — Governed AI foundation, provider disabled

**Goal:** establish the safety and cost control layer before generating production advice.

**Core entities**

- `AiAgencyPolicy`: enabled state, permitted capabilities, provider/model policy, budgets, retention, locale, and emergency lock.
- `AiConversation` and `AiMessage`: scoped transcript metadata with retention/deletion support.
- `AiToolExecution`: tenant, actor, tool/version, validated input hash, output reference, authorization result, timing, and error.
- `AiUsageReservation` / ledger: atomic reserve, settle, release, reconciliation, and cost attribution.
- `AiApproval`: proposed sensitive action, reviewer, decision, expiry, and immutable audit link.
- `AiEvaluation`: dataset/version, scenario, result, severity, and model/prompt/tool versions.

**Gateway rules**

- A provider-neutral adapter with strict timeouts, bounded retries, circuit breaker, spend ceiling, and redacted logging.
- Typed request/response schemas at every provider and tool boundary.
- Fixed read-only tool registry. Tools derive tenant context from the authenticated request and return only the minimum fields.
- Retrieval uses approved agency data and policy; never place raw secrets, full identity documents, or cross-tenant records in prompts.
- Model output is untrusted data: validate shape, escape rendering, label uncertainty, and ignore tool instructions found in retrieved content.
- Global founder kill switch, per-agency switch, per-capability switch, and budget switch all fail closed.

**First capability**

- Read-only agency operations briefing using current ERP data: overdue returns, expiring documents, unresolved tasks, utilization anomalies, and reconciliation items.
- Deterministic source cards link each statement to records the user is authorized to open.
- No customer-facing output, no tool mutation, and no automatic message.

**Evaluation**

- Tenant-leak, prompt-injection, unsupported-claim, stale-data, missing-data, Arabic/French/English, cost, latency, refusal, and provider-outage suites.
- Human scoring by product/domain reviewers. Thresholds are set from pilot baselines, not invented in advance.
- Red-team attempts against tool arguments, document content, retrieval, and output rendering.

**Exit gate:** approved reviewers can use read-only intelligence in staging; all provider use is auditable, bounded, attributable, and immediately disableable.

---

### Phase 5 — Agency and customer assistants

**Goal:** add useful assistance while keeping humans and deterministic services authoritative.

**Agency assistant**

- Explain operational priorities, summarize a permitted customer/vehicle/booking, prepare a report draft, and propose tasks or communications.
- Proposed writes are typed drafts. The user sees exact fields, recipients, expected provider cost, and side effects before approval.
- Never hide deterministic validation failures behind generated language.

**Customer assistant**

- Start inside authenticated web/portal surfaces; public assistance is limited to published policies and approved inventory/pricing APIs.
- Answer availability, requirements, booking status, invoice/payment status, document needs, and support questions from authoritative tools.
- Hand off to a human with conversation context; never invent price, availability, payment status, location, refund eligibility, or contract terms.
- Support French, Arabic/RTL, and English with locale-specific evaluation and human-reviewed critical copy.

**Communication center**

- One conversation timeline for portal, email, SMS, and approved WhatsApp integrations.
- Templates, consent/opt-out, quiet hours, delivery status, reply routing, redaction, retention, and failed-delivery queues.
- AI begins with suggested replies only. Sending remains human-confirmed until the low-risk automation phase.

**Exit gate:** the assistants answer from authoritative sources, hand off cleanly, and cannot make or conceal a business commitment.

---

### Phase 6 — Payment protection, supervised workflows, and passive telemetry

**Goal:** move from insight to assisted action under explicit review.

**Automation modes**

- `MONITOR`: detect and explain; no proposed mutation.
- `ASSIST`: create a typed proposed action; a permitted human must approve.
- `AUTOMATE`: execute only a pre-approved low-risk rule inside strict limits; unavailable in this phase.

**Payment protection**

- Detect mismatches, duplicate/replayed events, abandoned checkout, overdue invoice, deposit imbalance, and reconciliation failures from verified records.
- AI may summarize and prioritize. Deterministic code performs money calculations and provider reconciliation.
- Refund, charge, deposit claim/release, subscription change, and invoice state mutation always use provider truth and existing authorization/idempotency controls.

**Passive telemetry**

- New provider-neutral adapter with signed webhook/polling authentication, schema validation, replay protection, device-to-vehicle assignment history, and ingestion audit.
- Store location with purpose, retention, access control, precision policy, and customer/driver notice required by the approved legal basis.
- Initial outputs: last-seen location, stale/offline status, geofence observation, mileage/fuel anomaly, and maintenance suggestions.
- No immobilization, unlock, remote command, or automatic adverse customer decision.
- Use simulators and recorded provider fixtures before any real vehicle pilot.

**Exit gate:** supervised proposals and passive telemetry survive security, privacy, provider-failure, replay, and human-approval tests in staging and a limited pilot.

---

### Phase 7 — Selective low-risk automation, growth, and advanced intelligence

**Goal:** automate only what the pilot proves is safe and valuable.

**Eligible first automations**

- Create an internal task from a deterministic event.
- Schedule an approved reminder template within consent and quiet-hour rules.
- Refresh a non-critical internal summary.
- Escalate an unresolved provider/reconciliation item.

**Never eligible without a separate governance decision**

- Payment/refund/deposit settlement.
- Vehicle control.
- Contract acceptance or signature.
- Customer rejection, blacklist, trust score enforcement, or pricing discrimination.
- Destructive data deletion outside the approved privacy workflow.
- Cross-tenant data disclosure or model training.

**Growth advisor**

- Begin with descriptive analytics and counterfactual suggestions grounded in agency history.
- Show data window, assumptions, uncertainty, and expected trade-off.
- A/B tests require consent, minimum sample rules, stop conditions, and no protected/sensitive feature targeting.
- Dynamic pricing remains a recommendation until legal, fairness, margin, and override controls are accepted.

**Exit gate:** each automated rule has a bounded blast radius, owner, metric, audit trail, pause switch, compensation path, and measured false-positive rate.

---

### Phase 8 — Capability pilots, expansion, hardening, and general availability

**Goal:** operate the product with real users and evidence before scaling.

**Capability-pilot and expansion shape**

- Use the stable 3–5 agency core cohort from Phase 3B, selected for varied fleet size and workflow, with named owners and signed pilot terms.
- Separate onboarding, data-import validation, role setup, training, support, and feedback checklist per agency.
- Enable later capabilities per agency in this order: read-only AI → assistant → supervised workflows → passive telemetry → eligible automation.
- Never enable a later capability to rescue an unstable earlier one.

**Core and capability scorecard**

- Security/privacy incidents and tenant boundary violations.
- Successful booking-to-return cycles and financial reconciliation accuracy.
- Availability/error/latency against measured baseline.
- Support volume, resolution time, abandonment, and user comprehension.
- Provider ambiguity and webhook replay counts.
- AI unsupported-claim, unsafe-tool, human-override, cost, latency, and disablement rates.
- Restore drill, incident exercise, and rollback exercise outcomes.

**General availability gate**

- No open severity-1/2 security, tenant, money, consent, data-loss, or legal-operability defect.
- At least two successful release/rollback rehearsals and one successful restore exercise.
- Measured service objectives and error budgets approved from pilot evidence.
- Support/on-call coverage, status communication, terms/privacy, subprocessors, retention, and incident processes active.
- Billing, taxes/VAT presentation, invoices, refunds, cancellation, and subscription lifecycle approved by business/legal owners.
- Feature-by-feature evidence attached to the exact release SHA.

---

## 7. Testing and evidence matrix

| Layer | Required evidence |
|---|---|
| Static | Typecheck, lint, build, Prisma generate/validate, migration format, dependency/license/secret scanning. |
| Unit | Money boundaries, state machines, policy evaluation, DTO/schema validation, quota/idempotency, redaction. |
| Service integration | Real PostgreSQL transactions, concurrent booking/payment/deposit cases, tenant 404s, consent, provider fixtures. |
| API contracts | Runtime schemas for critical frontend consumers and provider payloads; backward-compatibility tests. |
| Browser E2E | All role-critical journeys, FR/AR/EN, desktop/mobile viewports, accessibility, error/retry/expired-session states. |
| Mobile | Unit/type/lint plus signed-build and real-device acceptance; offline/session/deep-link/camera/QR/signature cases. |
| Security | Authz/IDOR, CSRF/origin, SSRF, uploads, webhook signature/replay, dependency/container scan, AI prompt/tool attacks. |
| Performance | Representative data volume, concurrent users, slow DB/provider behavior, queue backlog, memory/connection limits. |
| Recovery | Backup restore, point-in-time recovery, migration retry/failure, provider outage, queue replay, rollback rehearsal. |
| AI | Fixed evaluation sets, human review, provenance, multilingual quality, injection, missing/stale data, cost/latency, kill switch. |
| Telemetry | Simulator and signed fixtures, replay/out-of-order/stale points, assignment changes, retention, access and audit. |
| Payments | Provider sandbox, signed webhooks, duplicates/out-of-order events, ambiguous result reconciliation, refund/deposit races. |

Every result records environment, exact SHA, commands/scenarios, pass/fail counts, artifacts, limitations, timestamp, and reviewer. A screenshot alone is not test evidence.

---

## 8. Safe schema and data-change protocol

1. Classify the change as additive, backfill, constraint, destructive, or provider/data migration.
2. Snapshot and restore a recent sanitized production-like database into an isolated rehearsal environment.
3. Measure migration duration, locks, table growth, and application compatibility.
4. Use expand-and-contract for renames/type changes: add new shape, dual-write/backfill, validate, switch reads, remove old shape later.
5. Backfills are idempotent, resumable, bounded, observable, and tenant-safe.
6. Deploy code compatible with both old and new schema when rollback may be required.
7. Take a production backup/PITR checkpoint immediately before approved migration.
8. Run `prisma migrate deploy` as a one-shot gate; never use development migration/reset commands in production.
9. Validate counts, constraints, sampled business invariants, and service readiness after migration.
10. Do not claim “rollback” for an irreversible destructive migration. Use forward repair or restore only with a rehearsed, approved data-loss window.

---

## 9. Deployment, observation, and rollback checklist

### Pre-deploy

- Exact release SHA and approved PR list recorded; branch protected; required checks green.
- Release diff reviewed for schema, env names, providers, feature flags, permissions, and irreversible behavior.
- Staging uses production-shaped configuration with test/sandbox providers and no production customer data unless explicitly governed.
- Migration rehearsal, backup/restore evidence, security review, and role smoke suite passed.
- Feature flags are off by default; owner and rollback owner are available.
- No mock provider can report success in production.
- Customer/support communication prepared when behavior or availability changes.

### Deploy

- Apply the migration gate before new code begins serving incompatible traffic.
- Deploy one exact immutable commit; do not build from a dirty tree or floating branch.
- Start with internal/pilot scope or a small traffic slice where the host supports it.
- Run `/api/health`, `/api/ready`, login, tenant boundary, core read, one reversible write, and provider-specific smoke checks.
- Confirm migrations, DB pool, logs, errors, latency, jobs, webhooks, storage, and reconciliation queues.

### Observe

- Intensive observation for the first hour, then daily review through the pilot window.
- Compare against the immediately preceding production baseline, not arbitrary vanity numbers.
- Check all role portals and selected agencies; absence of 5xx alone is insufficient.
- Save the deployment URL/revision, SHA, smoke output, metrics snapshot, and decision.

### Immediate stop/rollback triggers

- Any confirmed or credible cross-tenant data exposure.
- Any incorrect payment/refund/deposit/subscription settlement or unexplained financial ledger mismatch.
- Any consent bypass, document disclosure, secret exposure, destructive data loss, or privilege escalation.
- Readiness failures, migration incompatibility, sustained error/latency regression beyond the approved release threshold, or exhausted DB connections.
- Repeated provider side effects, webhook replay failure, or inability to reconcile an ambiguous external operation.
- AI tool execution outside policy, material unsupported customer commitment, budget bypass, or kill-switch failure.
- Telemetry disclosed to an unauthorized role or used for an unapproved control/adverse action.

### Rollback choice

- **Code regression, compatible schema:** route traffic to the prior immutable deployment and disable the new flag.
- **Provider/integration failure:** disable the provider/capability and queue/reconcile uncertain operations; never blindly retry side effects.
- **Migration issue:** stop writes to the affected path and execute the rehearsed forward fix or approved restore procedure.
- **Security/tenant incident:** disable the affected surface, revoke relevant sessions/keys, preserve evidence, start the incident/breach runbook, and communicate through the appointed owner.

---

## 10. Immediate execution backlog

These are the next concrete milestones, in order:

1. **Repository gate:** protect `main`, stabilize required check names, add ownership, and test that a red PR cannot merge.
2. **Canonical truth:** consolidate progress/backlog/design/production-gate documents and publish the PR disposition matrix.
3. **Staging and recovery:** explicitly link/identify hosting projects, create a production-shaped staging environment, select managed PostgreSQL, and complete a backup/restore plus migration rehearsal.
4. **Privileged security:** MFA, session revocation, impersonation controls, secret/provider inventory, and controller-level authz audit.
5. **Observability:** error tracking, correlation/redaction, dashboards, alerts, incident ownership, and provider reconciliation queues.
6. **Compliance stack:** finish #22’s technical review and business/legal operator inputs, then merge through the protected gate.
7. **Contract boundary:** rebase/merge #27 and extend runtime validation to the remaining release-critical frontend/provider boundaries.
8. **Core acceptance:** execute the five-role journey matrix; close or hide the fleet report, accident upload/insurance, contact, and booking-concurrency gaps.
9. **AI foundation:** rebase #23–#26 with provider disabled, run threat/evaluation review, and preserve zero-default budgets.
10. **Pilot:** onboard the first agency only after Phases 0–3 exit; enable later features one capability and one agency at a time.

Suggested engineering delivery shape is reviewable milestones of roughly two weeks, each ending in a verified outcome. This is a work-sizing cadence, not a promise that procurement, production access, legal review, provider contracts, or pilot-agency acceptance will finish inside a sprint. The web pilot is scheduled from gate completion, not from a fixed calendar date.

---

## 11. Decisions that need a human owner

The plan can progress while these are prepared, but the named decisions cannot be invented by engineering:

| Decision | Recommended default | Required before |
|---|---|---|
| Legal business identity, controller/contact details, terms/privacy, retention, GPS notice, subprocessors | Founder supplies facts; Moroccan counsel reviews public/operational text | Real-user pilot for affected data |
| Managed PostgreSQL/backup region and budget | Choose one managed service with PITR and documented restore support | Staging/pilot data |
| Transactional email/SMS/WhatsApp provider and sender identity | Enable only contracted channels; unavailable channels remain honest | Outbound production messages |
| Payment provider/merchant contract | One provider first; sandbox then limited live acceptance; CMI remains off until contracted | Real online payment |
| AI provider/model and data terms | One provider, zero-retention/no-training terms where available, strict spend cap | Any real agency data sent to a model |
| Pilot agencies and support commitment | 3–5 named agencies with onboarding owner and feedback cadence | Pilot start |
| Mobile release | Web-first; mobile follows its separate device/store gate | Store submission |
| GPS provider and legal basis | Passive/read-only pilot only | Any real location ingestion |

---

## 12. Definition of real-user ready

Fider is ready for the first controlled real-user pilot only when all of the following are true:

- `main` is protected and the exact release SHA passed all mandatory checks.
- Staging is production-shaped and the release passed role, locale, accessibility, security, and migration acceptance there.
- Tenant, money, capability, consent, registration, and secret invariants have negative tests and no open critical/high defect.
- Backup restore and rollback were rehearsed, with named owners and measured results.
- Privileged accounts use MFA; sessions and impersonation can be revoked and audited.
- Monitoring, alerting, incident response, support, and provider reconciliation are active.
- Legal/business facts, public policies, retention, privacy request operation, and selected providers are approved.
- Core booking-to-return and payment/deposit/reconciliation journeys work without AI.
- Mock/unfinished features cannot present success or appear as available production functionality.
- AI, automation, GPS, and non-pilot integrations are disabled by default and cannot bypass their gates.
- The first pilot agency has a validated import/onboarding plan and a documented support/rollback path.

General availability requires the additional Phase 8 evidence; pilot readiness is not general availability.

---

## 13. Completion reporting template

At every milestone, publish:

1. **Completed:** exact features and decisions delivered.
2. **Verified state:** SHA, environment, checks, counts, and evidence links.
3. **Changed:** files, migrations, flags, environment variable names, providers, and operational procedures.
4. **Not proved:** local-only, mocked, disabled, externally blocked, or awaiting human acceptance.
5. **Risks:** tenant, money, consent, data, security, provider, performance, legal, and support risks.
6. **Rollback:** trigger, owner, exact containment/recovery path, and rehearsal status.
7. **Next gate:** the smallest next milestone that produces independently reviewable evidence.

This template is mandatory for code, infrastructure, AI, provider, mobile, and production milestones.
