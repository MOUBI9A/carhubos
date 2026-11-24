# Environment, Provider, and Data Isolation Matrix

**Board task:** `P0-06` — Phase 0 control and one source of truth
**Status:** Implementation proposal for protected review, **not a deployed staging environment**
**Code and GitHub review:** 2026-11-23; `main` at `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`. Hosting, cost and local QA observations below were recorded on November 22 and were not rerun for this documentation review.
**Owner:** Founder/release and security owner `@MOUBI9A`
**Related:** [Production topology](PRODUCTION_TOPOLOGY.md), [authority matrix](AUTHORITY_MATRIX.md), [master plan](PLATFORM_READINESS_MASTER_PLAN_20261117.md), [CI billing blocker #40](https://github.com/MOUBI9A/carhubos/issues/40), [environment decision #41](https://github.com/MOUBI9A/carhubos/issues/41).

This is the authoritative **policy proposal** for environment ownership, data, providers, credentials, seeding, retention, and promotion. It is **not evidence** that hosted staging, backup/PITR, legal approval, privileged MFA, or a customer pilot already exists. The execution board defines which gates must be accepted. Never silently fall through from a nonproduction environment into production.

## Actual systems versus desired environments

| Environment | Verified now | Control status |
|---|---|---|
| Local development | Mac/Docker-based PostgreSQL and frontend/backend development workflows | Exists; data and secrets must be isolated before destructive commands |
| Automated tests | GitHub Actions uses fresh Postgres, fixed five required CI contexts; local independent disposable PostgreSQL 17 with synthetic fixtures also tested | Hosted CI **blocked before job start** by GitHub billing/limit; local tests do not satisfy required remote checks |
| Vercel Preview | Git branch deployments produce preview builds; project-level Preview variables and isolated backend database have not been verified | **Build preview only**, not production-shaped staging or live-data acceptance |
| Staging | Azure `carhub-staging-dev` resource group in `northeurope` is empty; no staging database or private storage exists | **Not provisioned**; no real customer data or live provider integrations allowed |
| Pilot | No signed pilot agency agreement or verified owner/support/legal baseline | **Not opened**; cannot infer consent from past expressions of interest |
| Production | Vercel `carhubos` frontend + backend; Supabase `carhubos` PostgreSQL 17 eu-west-1 and private `vault-files` bucket; main auto-deploys | Live MVP, **not** accepted as generally available or independently recoverable |

### Critical production boundary

`main` merges **automatically deploy to Vercel production**. There is no mandatory production `prisma migrate deploy` gate, tested staging promotion or accepted production rollback/restore procedure. Production settings observed in the topology audit include `PAYMENT_PROVIDER=DISABLED` and `AI_VISION_MODE=disabled`. These are configuration facts, **not** feature-completeness or AI safety proofs. Do not merge runtime/dependency/schema/infra changes until the release, backup and rehearsal gates are met.

## Required data and provider rules (target policy)

Staging remains unprovisioned. Its row is a prerequisite for `P1-02`, not permission to seed, deploy or rehearse against an existing production service.

| Scope | Database and storage | Credentials and providers | Seeding and retention | Release and owners |
|---|---|---|---|---|
| **Development** | Local/disposable PostgreSQL and synthetic tenant/vehicle/renter records only; never point local seed or tests at Supabase production or another app | Local-only `JWT_SECRET` and `IDENTITY_PEPPER`. Payment `DISABLED` or explicit `MOCK` in **nonproduction only**. AI `disabled`, or clearly labeled local `simulation`. External SMS/WhatsApp, GPS, real AI and production billing disabled | `backend/prisma/seed.js` is destructive: **only run after verifying disposable database identity**. Dispose synthetic data and local traces deliberately. Never remove owner files or `screenshots/` | Developer can run local tests; no public side effects |
| **Test / CI** | Dedicated fresh PostgreSQL for each run; no production DB, storage, shared secret, or real renter PII | Hard-coded **dummy test-only** JWT/pepper; `PAYMENT_PROVIDER=DISABLED` unless a specific mock-gateway test explicitly needs `MOCK`; no live provider keys, AI execution, external communications or GPS | Auto-delete ephemeral fixtures; keep only redacted reports/traces for stated CI retention (Playwright artifact workflow currently 7 days) | Protected PR; five named checks must pass for the **exact head**; never bypass CI due to billing |
| **Preview** | No production DB/storage and no customer data. Before functional smoke tests, configure **distinct** preview database/storage and verify connection identity and bucket privacy | Preview-only credentials and allowed origins, separate backend-only storage key. No fallback to production environment variables. Providers default disabled or sandbox only | No destructive seed on shared service. Expire synthetic preview data and revoke preview-only keys when preview ends | A READY Preview proves build only until service isolation + test evidence exists |
| **Staging** | Independent PostgreSQL 17 and distinct private object storage/bucket. Synthetic or formally anonymized fixtures, never a clone of raw production PII | Dedicated service identity and secret set: database, JWT/pepper, storage and allowed origins. Sandbox payment/communications only after their own contract gate; AI/GPS initially disabled | Provision only within a **verified zero-out-of-pocket budget** and explicit ownership. Stage-only seeding with a fail-closed target check, backup/restore testing, purge policy and access logs | `P1-02` provisioning/access review, `P1-03` fresh migration, restore and forward-repair rehearsal. Free service does **not** imply PITR or backups |
| **Controlled pilot** | Tenant-limited real agency records only after explicit consent, retention/legal basis, import mapping and rollback plan; never use unrelated business datasets | Production-scoped credentials and capability gates; online payments, AI, GPS, automated actions, WhatsApp/SMS remain disabled until individually proven and approved; no fabricated delivery/settlement | Real-user storage consent, per-item photos and retention, audit trail, support/on-call owner, signed pilot terms, controlled import and deletion workflow | Founder/release and legal/operator approval; Phase 3A core acceptance and recovery evidence required before first agency |
| **Production** | Supabase `carhubos` and private `vault-files`; least-privilege access and tenant-scoped APIs; no test imports or seeds | Vercel Production-only backend secrets; never expose `SUPABASE_SECRET_KEY`, DB credentials, JWT/pepper, provider keys in client or artifact. Mock payment refused in production. AI and payments remain disabled until own gates | No `seed.js`, no synthetic fixtures or raw customer export. RPO/RTO, PITR, backup, retention and restore ownership still **unverified** | Protected exact-SHA CI, release owner, migration rehearsal, manual release/rollback decision and post-deploy smoke. Treat merge to main as production action today |

## Secret and environment-variable contract

These are required boundaries, not a claim that a universal stage validator or provider kill switch already exists. The implementation gaps below must be closed before relying on this policy for hosted acceptance.

| Variable / setting | Allowed placement | Owner / purpose |
|---|---|---|
| `DATABASE_URL` | Backend/worker secrets only, different server for every stage; never public or in CI logs | Infra and migration owner; enforce TLS, minimum database role, migration privileges separately when feasible |
| `JWT_SECRET`, `IDENTITY_PEPPER` | Backend-only, distinct high-entropy values per stage | Security owner; rotation/revocation is a separate approved operation |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_VAULT_BUCKET` | Secret key server-only; distinct project and private bucket for each hosted environment | Storage/security owner; Supabase secret bypasses RLS and must never be a `NEXT_PUBLIC_*` field |
| `PUBLIC_APP_URL`, `ALLOWED_ORIGINS` | Exact environment hostnames; no wildcard that implicitly trusts production from preview | Web/release owner; verify redirect, CORS and cookie behavior on hosted deployment |
| `NEXT_PUBLIC_API_URL` | Public endpoint only; never credentials; correct preview/staging host | Frontend owner; any `NEXT_PUBLIC_*` value is browser-visible |
| `PAYMENT_PROVIDER` | `DISABLED` by default on Preview/staging/production; `MOCK` only in isolated local/test fixtures | Payment owner; verified provider settlement and idempotency before real money |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Twilio tokens and similar | Only in specifically approved, separate **server-side** sandbox/live stage; unset while provider disabled | Provider/billing owner, explicit per-environment approval and spending cap |
| `RESEND_API_KEY`, `EMAIL_FROM` | Key server-only; absent unless outbound email is approved; verified sender and isolated recipient test sink required | Communications owner; setting the key activates the adapter regardless of deployment stage |
| `GUARDIAN_WHATSAPP_MODE`, `GUARDIAN_WHATSAPP_AGENCY_IDS`, `GUARDIAN_WHATSAPP_CONTENT_SID` | Guardian mode unset and agency allowlist empty until explicitly approved; template identifier is stage-specific | Communications/security owner; these settings do not disable the generic Twilio sending path |
| `AI_VISION_MODE` and any AI/GPS feature controls | `disabled` by default in hosted environments; labeled `simulation` only in nonproduction development | AI/security owner; AI quota/kill-switch and consent review required before activation |

**Configuration enforcement requirement for later implementation:** Validate the actual backend configuration at startup. Missing isolated staging/preview identity must **fail closed**, not default to `DATABASE_URL` or Supabase production. Distinguish deploy stage from `NODE_ENV`: staging/pilot can run production builds with `NODE_ENV=production` and a separate, explicit stage label; do not assume Nest or Next understands `NODE_ENV=staging`. No new runtime stage flag is claimed to exist yet.

### Observed enforcement and assigned gaps

Static review of canonical runtime code on November 23; no provider calls or production changes:

| Area | Current code behavior | Required containment / follow-up |
|---|---|---|
| Payments | `PaymentGatewayService` defaults unknown/unset selection to MOCK outside production; production startup rejects MOCK. DISABLED rejects checkout/callbacks. `CmiGateway` is an unimplemented throwing scaffold. | Explicit DISABLED for hosted environments. A provider selector or merchant key alone is not CMI implementation. `P1-07` configuration validation; `P3-02` provider-truth acceptance. |
| Email | `EmailService` selects Resend whenever its key exists, including development/test. Without a key the development adapter reports mock success outside production and failure in production. | Keep keys absent in automated tests; use an approved recipient sink for sandbox evaluation. `P1-07` stage configuration; `P3-02` honest delivery state. |
| WhatsApp | Guardian applies its own mode and agency allowlist. Generic `TwilioService.sendWhatsAppMessage` sends whenever credentials exist, independently of Guardian settings; without credentials it returns `success: true, status: mock_sent`, including in production. | No production delivery claim from this result; keys absent until approved. Track B-012, `P3-02` must fix or hide affected surfaces before pilot; `P1-06` must review recipient/body log redaction. No global disable switch is assumed. |
| AI Vision | Explicit `AI_VISION_MODE=simulation` takes precedence even with production `NODE_ENV`; only the unset production default is disabled. | Explicit disabled setting is required on hosted deployments; `P1-07` must enforce stage constraints before hosted acceptance. Simulation is not real AI. |
| Stage identity | No unified six-stage validator is established by this PR; CI uses PostgreSQL 15 while production audit reports 17. | `P1-02` verifies production-shaped staging and separate credentials; `P1-07` aligns runtime/config deliberately. Do not silently treat existing CI as PG17 rehearsal. |

Source: `backend/src/payment-gateway/payment-gateway.service.ts`, `backend/src/payment-gateway/providers/cmi.gateway.ts`, `backend/src/email/email.service.ts`, `backend/src/email/providers/development-email.provider.ts`, `backend/src/integrations/twilio/twilio.service.ts`, `backend/src/ai-vision/ai-vision.service.ts`, `.github/workflows/ci.yml`.

## Retention and cleanup ownership

The following synthetic-data limits are proposed operating policy, not implemented schedulers or legal retention periods. Before creating shared fixtures, record resource ID, owner, purpose, creation/expiry date and cleanup evidence without credentials or customer rows. Expiry alone never authorizes deleting an unidentified database, user file or unrelated resource. A cleanup failure blocks reuse and is escalated to the founder/security owner.

| Environment / data | Proposed limit or required decision | Cleanup owner and evidence |
|---|---|---|
| Development synthetic databases/traces | Remove task-created disposable fixtures at task close; review any justified extension every 7 days | Task owner verifies exact target and records removal or dated extension; never include owner screenshots or unrelated local files |
| CI fixtures and artifacts | Ephemeral DB/container ends with run; current Playwright artifact retention is 7 days. Other logs/artifacts require a verified repository retention setting; no claim of a universal 7-day purge | CI owner verifies teardown and artifact settings; exclude tokens, real contacts and document content from reports |
| Preview synthetic DB/storage | Expire within 7 days after PR closure; access credentials revoked on closure after confirming no remaining consumer | Preview owner records exact resource IDs, deletion and revocation; no automatic shared-service seed/reset |
| Staging synthetic/anonymized fixtures | Maximum 30 days per dataset before purge or explicit renewed purpose/expiry; test uploads follow the same limit | Staging/data owner inventories datasets, files and backups; verifies anonymization before import and records cleanup |
| Pilot/production personal, financial and audit records | **Unapproved**: category-specific purpose, legal basis, retention, deletion/hold exceptions and backup expiry must be accepted under B-004 before onboarding | Founder plus legal/data owner define the schedule and privacy-request workflow; no invented legal duration, bulk deletion or automated production purge |

Backup copies follow their environment's data classification. Their expiry, access, deletion propagation, restore quarantine and legal-hold handling must be documented under `P1-02`/`P1-03` and B-004 before real-user data. Synthetic TTLs do not establish a production backup or PITR policy.

## Exact-head CI and stacked review

PR #43 targets `codex/p0-07-pr-disposition`. `.github/workflows/ci.yml` triggers PR checks only against `main`, so its five jobs are **not scheduled** on #43 at this stage; a successful Vercel status is not those jobs. Parent PR #42 at `10eb8377ce46cf831b30948c660684eb41f71bed` has five failed jobs in run `45011531906`; the check annotation re-read November 23 reports account payment/spending-limit failure before execution.

Restore included GitHub allowance/account access without paid overages, then rerun and accept #42 through protected review. After the parent is merged, retarget #43 to `main`, reconcile any changed base without force-push, and verify all five checks on its final head. If retargeting does not schedule a run, use the existing workflow-dispatch entry point on the exact branch and verify its head SHA; do not alter branch protection or count local tests as hosted checks. Review/deployment authority still applies to each merge.

## Budget and service facts — verified November 22

1. **Hard limit: no additional out-of-pocket charges.** Existing student benefits/credits may be consumed only after their remaining balance, expiry, eligibility and worst-case run rate are verified. A free resource group is a namespace, not a free server or free database.
2. The **Azure for Students** subscription is enabled. Read-only Cost Management query showed approximately **$3.83 USD actual month-to-date cost** attributed to existing resources; this is **not a remaining-credit number**. No subscription balance/expiry was available through the attempted CLI/REST calls.
3. Azure `carhub-staging-dev` exists in `northeurope`, tagged synthetic-only, and was confirmed to have **zero billable child resources**. The existing `creator-os-dev` VM, disk, network and IP belong to a different product; **do not reconfigure or reuse them**.
4. Existing Supabase organization has CarHub production plus separate, inactive Influence Factory production. A **$0/month** quote for `carhubos-staging` was returned, but provider creation was **rejected** because the owner hit the **two-free-project count limit**. No new staging project was created; never delete, pause, unpause, repurpose or upgrade the unrelated project to bypass the quota.
5. GitHub Actions post-merge run `44986349161` and PR #42 exact-head runs failed **before steps began**, with an account payment/spending-limit annotation. The Mac's **local** isolated QA passed, but required hosted checks remain failed. Self-hosted runner eligibility/billing and isolation must be verified independently; do not register the personal Mac as a general-purpose runner or weaken branch protection.
6. No managed Azure PostgreSQL has been provisioned or priced for this exact subscription, and the provider has not yet been registered. A marketing free-tier listing does not establish this subscription's remaining entitlement, account credit or final bill. Do not provision until those facts are verified.

## Operational release and migration gates

**Before any code or schema release:**

1. Verify exact source SHA, change/diff scope, all five required GitHub contexts, no unresolved review threads and current production target project/team.
2. For schema changes: decide reversible expand/migrate/contract sequence; rehearsal on a **separate** PostgreSQL 17 instance; record index locks, query compatibility, failure/forward-repair and production backup/PITR evidence before migration approval.
3. Verify secrets and allowed origins belong to the selected environment **without printing values**; check disabled providers cannot report success. Never seed/reset production. Real-user imports require the separately approved `P3-03` validated, audited import procedure and `P3-05` pilot gate; this policy does not authorize an import.
4. Record named migration and rollback owners, recovery approach and support escalation. Test the selected hosted build before promotion, then read-only health, API readiness, auth, and a representative tenant/consent negative test.
5. With the present auto-deploy topology, a merge itself deploys production. Do not treat a documentation-only preview or a local restored database as proving this release pipeline safe.

## Remaining acceptance decisions

- `P0-06`: documentation-only policy review, links/evidence verified, five required **exact-PR-head** checks green, merge into canonical base and update board to `DONE`. Until then, this file is a proposed policy, not an implemented production guard.
- `P1-01` and `P1-05`: independently inspect the Supabase exposed-schema grants, RLS defaults, database drift and server-side authorization tests. 33 of 41 public tables without RLS is a defense-in-depth gap, but direct `anon`/`authenticated` DML grants were not found at audit time; do not bulk enable policies without compatibility testing.
- `P1-02`/`P1-03`: select hosted isolated staging with verified budget/region/access/backups; run actual hosted migration and backup/restore/PITR rehearsals. Neither a `$0` quote nor local synthetic restore is proof of production recovery.
- `B-004`/`B-006`: counsel-approved legal operator facts, retention/subprocessor terms, named consenting first agency and support/on-call owner; no pilot invitation or import yet.
- `B-009`/issue #40: restore GitHub required CI and production release/promotion/migration controls **without bypassing checks or allowing unapproved paid overruns**.

## Rollback and scope

This proposal changes documentation and coordination only. Revert through a reviewed documentation PR if the policy is superseded. The file does not contain credentials or customer records, alter Vercel/Azure/Supabase configuration, activate providers, create a hosted database, change branch protection or grant permission to send outreach. Pilot readiness remains a separate decision.
