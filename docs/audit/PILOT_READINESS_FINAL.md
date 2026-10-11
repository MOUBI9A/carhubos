# Fider / CarHub OS — Pilot Readiness Final Report

**Repository:** `MOUBI9A/carhubos`  
**Verification date:** 2026-10-11  
**Release target:** controlled real-agency production pilot

## Executive Summary

The repository and live deployment were independently inspected against the production-hardening goal instead of relying on earlier completion narratives. The codebase has passed its application release gates and the Vercel production stack is live on `carhub.codes` / `www.carhub.codes` with a Next.js frontend and a containerized NestJS backend.

Current production deployment evidence:

- deployment: `dpl_CbjjT31p6rWs4C7nzrRXdp8wRyjQ`
- deployed source commit before this documentation-only refresh: `ecc257c7e4991e063c007d3bb90b2eb5e2b2bf2d`
- deployment state: **READY**
- `GET /api/health` → **200 OK**
- service response identifies `fider-api`
- fresh cold start completed successfully
- fresh one-hour Vercel error-group check reported no runtime errors
- fresh 30-minute `error`/`fatal` log check reported no matching logs

Production readiness is intentionally separate from liveness. The current readiness probe returns:

- `GET /api/ready` → **503 Service Unavailable**
- database state → **unreachable**

This is expected because the production `DATABASE_URL` has not yet been connected. The linked Supabase project is active and healthy, but its `public` schema is still empty. We deliberately did not apply the committed Prisma migrations through an incompatible side channel because doing so without Prisma migration metadata could create schema-history drift.

Therefore the current state is **LIVE APPLICATION SHELL / NOT YET DATA-READY FOR A REAL AGENCY PILOT**.

## Verified Live Infrastructure

### Vercel

- Project: `carhubos`
- Framework: Vercel Services
- Frontend: Next.js service
- Backend: container service built from `backend/Dockerfile.vercel`
- Production API routing: same-origin `/api/*` → backend service
- Production domains include `carhub.codes` and `www.carhub.codes`
- Backend container uses Node 22, OpenSSL, Chromium, and production dependencies
- Production backend container build is also gated independently in GitHub Actions
- Current production deployment is READY and attached to the production aliases

### Supabase

- Linked project: `carhubos`
- Region: `eu-west-1`
- PostgreSQL: 17.x
- Project status: **ACTIVE_HEALTHY**
- `public` tables: **0** at this verification point
- private Storage bucket `vault-files` exists and is configured as non-public

No production application data exists in the linked database yet.

## Work Completed

### Application operations

- Added `/api/health` liveness probe.
- Added `/api/ready` readiness probe that verifies PostgreSQL connectivity.
- Decoupled Nest application liveness from database startup so a DB outage does not crash the whole API process.
- Added request correlation IDs and structured HTTP request/error logging.
- Structured logs use request pathnames rather than full URLs so query-string credentials/tokens are not copied into application logs.
- Added backend and frontend container health checks.
- Added a one-shot Prisma migration gate to Docker Compose before backend startup.
- Corrected browser API routing to use same-origin `/api` in production.
- Switched the Vercel backend to a container runtime so NestJS runtime dependencies, Prisma, Chromium, and PDF dependencies are packaged consistently.
- Aligned the production backend image to Node 22 and installed OpenSSL for Prisma.

### Payments

- Added an explicit `PAYMENT_PROVIDER=DISABLED` production-safe mode for the pilot.
- Disabled mode does not simulate or accept payments.
- Checkout/webhook operations fail closed with a service-unavailable response until a real gateway is configured.

### AI transparency

- Real production CV inference is **not implemented**.
- Production AI simulation is disabled unless intentionally enabled for a clearly labeled preview.
- Simulation responses are distinguishable from real inference and must not be used as repair decisions.

### File security

- Existing tenant prefixes, signed download URLs, size limits, and allowlisted MIME types were retained.
- Upload validation checks file signatures/magic bytes for PDF, JPEG, PNG, and WebP rather than trusting multipart MIME metadata alone.
- Regression tests cover spoofed content rejection.
- Generated Playwright authentication/session files are ignored and committed copies were removed from `main`.

### Recovery tooling

- `scripts/db-backup.sh` uses PostgreSQL custom-format archives.
- Backup archives are verified with `pg_restore --list` before success is reported.
- Retention support and restrictive local permissions are present.
- `scripts/db-restore.sh` is guarded; destructive restore requires `ALLOW_DB_RESTORE=YES`.
- Operational guidance exists in `docs/devops/BACKUP_RESTORE.md`.

### CI / QA

CI gates include:

- backend typecheck
- backend unit tests
- backend lint
- backend production build
- backend live-PostgreSQL migration + E2E
- frontend typecheck
- frontend unit/component tests
- frontend lint
- frontend production build
- full-stack Playwright E2E
- production dependency audit
- backend production container build
- recovery script syntax validation

Fresh live-PostgreSQL CI continues to prove the committed Prisma migration path and cross-tenant authentication behavior independently of the empty production database.

### PDF engine

- Puppeteer is on the patched runtime line used by the project.
- The Vercel backend image installs Chromium and required fonts.
- OpenSSL is installed for Prisma runtime compatibility.
- The contract grid CSS defect (`grid-template-cols`) was corrected to `grid-template-columns`.

### Production dependency security

Current release gates enforce:

```bash
npm audit --omit=dev --audit-level=high
```

for backend and frontend. The production container install has also reported zero npm vulnerabilities during verified builds.

See `docs/security/DEPENDENCY_AUDIT.md`.

## Important Findings Fixed During Live Deployment

| ID | Severity | Problem | Resolution | Status |
| --- | --- | --- | --- | --- |
| LIVE-01 | P1 | Browser production API default pointed at localhost | switched to same-origin `/api` | FIXED |
| LIVE-02 | P1 | Vercel serverless packaging omitted Nest runtime dependencies | moved backend to Vercel container service | FIXED |
| LIVE-03 | P1 | Top-level `dotenv/config` caused production bundle/runtime dependency failure | removed redundant top-level import | FIXED |
| LIVE-04 | P1 | Prisma startup DB connection prevented liveness when DB unavailable | decoupled liveness from readiness | FIXED |
| LIVE-05 | P1 | Container lacked guaranteed OpenSSL for Prisma | installed OpenSSL in image | FIXED |
| LIVE-06 | P1 | Runtime dependencies required Node 22 while image used Node 20 | aligned image to Node 22 | FIXED |
| LIVE-07 | P1 | Internal service-prefix routing did not strip path for the Nest container | replaced with direct `/api/*` routing | FIXED |
| LIVE-08 | P1 | Production mock payment provider would prevent safe pilot startup | explicit `DISABLED` payment mode | FIXED |
| LIVE-09 | P2 | Generated Playwright session/account files were committed | removed files and ignored `/playwright/.auth/` | FIXED |
| LIVE-10 | P2 | Public marketing overstated trust hashing/security posture | primary landing claims corrected to server-side HMAC and security-readiness language | FIXED / VERIFY REMAINING COPY |
| LIVE-11 | P1 | Protected-deployment query parameters could appear in application request/error logs | request and exception logging now use pathname only | FIXED |

## Product Status

Core ERP behavior remains protected by the automated release gate. No random feature expansion was introduced during the hardening/deployment work.

The public landing site is live. Database-backed signup/login/ERP workflows are not considered production-ready until the database is connected, migrations are applied through the canonical Prisma path, and live smoke tests pass.

## Frontend Status

- Production build is gated in CI.
- Unit/component tests and lint/typecheck are gated.
- Full Playwright browser suite is gated.
- Production browser API calls use same-origin `/api`.
- Public landing is serving successfully in production.

## Backend Status

- Nest backend runs in a Vercel container.
- `/api/health` is live and returns 200.
- `/api/ready` correctly returns 503 while the database is unavailable.
- A fresh production cold-start probe completed successfully on 2026-10-11.
- Runtime includes Node 22, OpenSSL and Chromium.
- Structured request/error logging includes correlation IDs and excludes query strings.
- Payments can be disabled safely rather than simulated.

## Database Status

- Supabase project is active and healthy.
- Production public schema remains empty.
- Fresh PostgreSQL migration path passes CI.
- Production `DATABASE_URL` is not configured yet.
- Production Prisma migrations have therefore not been executed yet.

### Required database activation sequence

1. copy the exact supported Supabase production connection string from the project connection workflow; for the current one-URL Prisma configuration, use the appropriate Session Pooler connection rather than guessing a pooler hostname;
2. store the resulting production `DATABASE_URL` only in the Vercel production environment;
3. run the committed Prisma migrations using the canonical Prisma migration workflow;
4. verify Prisma migration history and table/constraint/index state;
5. verify `/api/ready` returns 200;
6. run authenticated production smoke tests on a controlled pilot account;
7. only then onboard a real agency.

Do **not** bypass this by manually applying raw migration SQL without reconciling Prisma migration history. Do not reintroduce a Prisma `directUrl` change as part of this activation unless it is handled separately and verified cleanly through CI.

## Vault Storage Status

The code contains a real Supabase Storage adapter. Production already has:

- `SUPABASE_URL` configured;
- `SUPABASE_VAULT_BUCKET=vault-files` configured;
- private `vault-files` bucket provisioned.

Vault runtime activation is still blocked because the server-only secret is missing:

- preferred: `SUPABASE_SECRET_KEY` (`sb_secret_...` modern server key);
- compatibility fallback supported by the code: legacy `SUPABASE_SERVICE_ROLE_KEY`.

A publishable/anon key is not a substitute for the server-only secret. The secret must never be exposed to frontend code, repository files, logs, or client-side environment variables. After configuration, signed-URL/download authorization and tenant isolation must be reverified against the live pilot environment.

## Security Status

Verified hardening includes:

- tenant-isolation live-PostgreSQL E2E;
- role/capability enforcement covered by the existing test suite;
- upload content-signature validation;
- production throttling;
- AI simulation fail-closed by default;
- same-origin API routing;
- HttpOnly/JWT authentication architecture;
- HMAC-based identity derivation with a production secret pepper;
- dependency audit gates;
- removal/ignore of generated browser test credentials/session state;
- query-string-safe request and exception logging.

Targeted repository scans did not find live-looking Google, GitHub, Stripe, or Supabase server secrets on the default branch. Placeholder environment variable names and test-only generated credentials are expected in tests/examples.

This report does not claim the application is "100% secure" or legally certified.

## AI Status

**Production real CV inference: NOT IMPLEMENTED.**

The pilot should keep it disabled unless an explicitly labeled simulation/demo is intentionally required. A real provider should only be introduced behind the existing/provider abstraction with credentials, cost controls, structured output validation, privacy review, rate limits, failure handling, and regression tests.

## DevOps Status

Implemented and now exercised:

- GitHub production build/test gates;
- Vercel production deployment;
- Vercel Services routing;
- containerized Nest backend;
- live liveness probe;
- live readiness failure behavior;
- environment fail-closed behavior for the unavailable database;
- rollback-capable Vercel deployment history;
- backup/restore scripts in repository.

Still required:

- production database connection and migrations;
- live authenticated smoke test after DB activation;
- centralized alerting/uptime monitoring;
- scheduled offsite backups;
- timed restore drill;
- Vault server secret if the pilot uses file uploads.

## Observability Status

Implemented:

- correlation/request IDs;
- structured HTTP request logs;
- structured exception logs;
- query strings excluded from application path logging;
- live liveness/readiness probes;
- Vercel runtime/build observability.

Fresh verification on 2026-10-11 found no runtime error groups in the latest one-hour window and no `error`/`fatal` log entries in the latest 30-minute window after a successful cold start and liveness request.

A wider 24-hour Vercel aggregate previously showed six `/container` events labeled `Application exited with code 1`. The Hobby-plan detailed-log retention window no longer contains the underlying records, so this report does not invent a root cause. The current deployment starts and serves liveness successfully. Treat recurrence of that aggregate as an operational signal to investigate once centralized retention/alerting is connected.

Remaining condition:

- connect an external centralized error/uptime/alerting system and verify alert delivery with a synthetic failure.

## Backup / Restore Status

Repository tooling is implemented and validated syntactically, but a repository script is not the same as a proven production recovery process.

Remaining conditions before real agency data is admitted:

1. connect the production database;
2. choose the production backup mechanism/schedule;
3. store copies off the primary host in encrypted/private storage;
4. configure backup-failure alerting;
5. restore into an isolated target;
6. start the restored application and verify key counts/relationships/auth workflows;
7. record measured RPO/RTO.

## Performance Status

No new claim of production-scale throughput is made here. CI/runtime checks prove correctness and basic operability, not capacity at real fleet/network scale. Pilot monitoring should establish p50/p95/p99 latency, database pool behavior, container CPU/memory and PDF-generation latency using real pilot-like traffic.

## Tenant Isolation Status

The live-PostgreSQL backend E2E gate covering authentication and cross-tenant access remains part of CI and has passed after the deployment changes. The production database itself contains no tenants yet, so cross-tenant testing must be repeated against controlled production pilot fixtures after database activation.

## Financial Integrity Status

Existing Decimal-based financial behavior remains protected by backend tests. Payments are currently disabled in production rather than simulated. This report does not claim accounting certification.

## External Blockers / Conditions

### DB-01 — Production database connection

**Current state:** Supabase project healthy; database not connected to Vercel; public schema empty.  
**Need:** exact supported production Postgres connection URL/credential.  
**Next action:** configure `DATABASE_URL`, run canonical Prisma migrations, verify `/api/ready = 200`, then execute controlled authenticated smoke tests.

### VAULT-01 — Private file storage (required if pilot uses vault uploads)

**Current state:** adapter implemented; Supabase URL configured; private `vault-files` bucket configured; server secret absent.  
**Need:** server-only `SUPABASE_SECRET_KEY` (preferred modern key; legacy service-role fallback remains supported).  
**Next action:** configure the secret, then test allowed uploads, spoofed MIME rejection, tenant isolation, signed URLs, expiry and unauthorized download behavior.

### MON-01 — Centralized alerting

**Need:** selected monitoring/error-tracking provider and credentials/configuration.  
**Next action:** connect backend/frontend error reporting and external uptime checks; trigger a synthetic failure and verify an operator receives the alert.

### REC-02/03 — Scheduled offsite backups + restore exercise

**Need:** connected production database plus selected production backup/storage/scheduler target.  
**Next action:** schedule provider-native or repository backup tooling, configure encrypted offsite retention and alerts, then perform a timed isolated restore exercise.

### LEGAL-01 — Organizational/regulatory readiness

Technical controls may support privacy obligations but do not constitute Moroccan Law 09-08/CNDP legal certification. Organizational and legal actions must be completed separately before making compliance claims.

## Deferred Items

- real CV provider integration;
- production-scale performance baselines;
- automated malware-scanning provider;
- expanded endpoint-by-endpoint authorization matrix;
- non-core feature expansion driven by actual pilot feedback.

## Evidence

Primary repository/live evidence includes:

- `.github/workflows/ci.yml`
- `vercel.json`
- `backend/Dockerfile.vercel`
- `frontend/src/lib/api.ts`
- `backend/src/app.controller.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/common/middleware/request-id.middleware.ts`
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/ai-vision/ai-vision.service.ts`
- `backend/src/vault/vault-storage.service.ts`
- `backend/src/pdf-engine/pdf-engine.service.ts`
- `scripts/db-backup.sh`
- `scripts/db-restore.sh`
- `docs/devops/BACKUP_RESTORE.md`
- `docs/security/DEPENDENCY_AUDIT.md`
- live Vercel `/api/health` response
- live Vercel `/api/ready` response
- fresh Vercel runtime error/log checks
- Supabase project/table/storage inspection
- GitHub Actions clean-runner CI results

## Final Verdict

# LIVE SHELL — NOT YET READY FOR REAL AGENCY DATA

The application is deployed and its production liveness path is verified. Core code and release gates are materially stronger than the earlier repository-only state.

The next release gate is objective: **connect the production database, apply migrations through Prisma, obtain `/api/ready = 200`, and pass controlled authenticated smoke tests.** If the pilot uses Vault uploads, also configure the server-only Supabase secret and pass live Vault authorization/storage tests. Until those gates pass, do not onboard a real agency or store real renter/customer data.
