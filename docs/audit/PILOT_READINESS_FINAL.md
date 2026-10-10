# Fider / CarHub OS — Pilot Readiness Final Report

**Repository:** `MOUBI9A/carhubos`  
**Verification date:** 2026-10-10  
**Release target:** controlled real-agency production pilot

## Executive Summary

The repository was independently inspected against the production-hardening goal instead of relying on earlier completion narratives. Several claims from earlier reports were not present on the actual `main` branch or were not supported by current evidence, so the repository itself was treated as the source of truth.

The hardening pass fixed concrete production issues across deployment, observability, AI transparency, file validation, browser tests, PDF generation compatibility, and runtime dependency security. The full application gate has passed with backend/frontend production builds, unit tests, live-PostgreSQL E2E, and the complete Playwright browser suite.

The repository is not being declared fully operational in live production because three material environment-level tasks remain outside code: centralized external alerting, scheduled/offsite production backups with a timed restore drill, and an explicitly authorized production/pilot deployment with real environment configuration.

## Work Completed

### Application operations

- Added `/api/health` liveness probe.
- Added `/api/ready` readiness probe that verifies PostgreSQL connectivity.
- Added request correlation IDs and structured HTTP request/error logging.
- Added backend and frontend container health checks.
- Added a one-shot Prisma migration gate to Docker Compose before backend startup.
- Corrected `NEXT_PUBLIC_API_URL` handling so browser configuration is embedded at Next.js build time.

### AI transparency

- AI Vision is explicitly a simulation preview while no real CV provider exists.
- Simulation responses include `isSimulation: true`, `model: "Preview Simulation"`, and a user-facing notice.
- Production defaults to AI Vision disabled unless `AI_VISION_MODE=simulation` is intentionally set.
- The frontend clearly labels the preview and disables real repair actions for simulated detections.

### File security

- Existing tenant prefixes, signed download URLs, size limits, and allowlisted MIME types were retained.
- Upload validation now checks file signatures/magic bytes for PDF, JPEG, PNG, and WebP rather than trusting multipart MIME metadata alone.
- Added a regression test proving spoofed content is rejected before storage is touched.

### Recovery tooling

- Added `scripts/db-backup.sh` using PostgreSQL custom-format archives.
- Backup archives are verified with `pg_restore --list` before success is reported.
- Added retention support and restrictive local permissions.
- Added guarded `scripts/db-restore.sh`; destructive restore requires `ALLOW_DB_RESTORE=YES`.
- Added `docs/devops/BACKUP_RESTORE.md`.

### CI / QA

- CI now runs backend and frontend production builds in addition to typecheck/lint/tests.
- Recovery scripts are shell-syntax validated in CI.
- Live PostgreSQL migrations and backend E2E remain part of the gate.
- Full Playwright browser E2E remains part of the gate.
- Browser tests were repaired where stale selectors targeted hidden language options instead of the custom combobox.
- Hard-coded August/October 2026 booking dates were replaced by relative future dates, preventing browser-native date validation from invalidating the tests as time moves forward.
- CI-specific throttle overrides prevent the serial browser suite from self-throttling while preserving production defaults of 100 global requests/minute and 5 auth attempts/minute.

### PDF engine

- Updated Puppeteer to a patched runtime version.
- Adapted the PDF engine to Puppeteer's ESM-only package using lazy dynamic import so Jest can still load the Nest application.
- Corrected the contract grid CSS property from `grid-template-cols` to `grid-template-columns`.

### Production dependency security

The initial raw package state did contain real production dependency advisories; the earlier assertion that all findings were non-reachable was therefore rejected.

After safe remediation:

- backend `npm audit --omit=dev`: **0 production findings**
- frontend `npm audit --omit=dev`: **0 production findings**

Main CI now permanently executes:

```bash
npm audit --omit=dev --audit-level=high
```

for backend and frontend so new high/critical production advisories block release.

See `docs/security/DEPENDENCY_AUDIT.md`.

## Bugs Found and Fixed

| ID | Severity | Problem | Resolution | Status |
| --- | --- | --- | --- | --- |
| PILOT-01 | P1 | AI Vision presented deterministic mock detections too much like live inference | explicit simulation contract + production kill switch + UI labels | FIXED |
| PILOT-02 | P1 | Docker could start API without an explicit migration completion gate | dedicated migration service + dependency gating | FIXED |
| PILOT-03 | P1 | Next public API URL was supplied at runtime although public variables are compiled into browser bundle | build arg before `next build` | FIXED |
| PILOT-04 | P1 | Health endpoint did not prove DB readiness | separate DB-backed readiness endpoint | FIXED |
| PILOT-05 | P1 | Upload security trusted client-declared MIME | signature/magic-byte validation + regression test | FIXED |
| PILOT-06 | P1 | E2E combobox selectors accidentally selected hidden language options | selectors scoped to actual listboxes | FIXED |
| PILOT-07 | P1 | Date-based E2E tests became invalid after their hard-coded dates passed | relative future dates | FIXED |
| PILOT-08 | P1 | Serial browser suite exhausted real auth/global throttles | isolated CI overrides; production defaults unchanged | FIXED |
| PILOT-09 | P1 | Production dependency tree contained high/critical advisories | patched direct/transitive runtime dependencies | FIXED |
| PILOT-10 | P1 | Patched Puppeteer became ESM-only and broke Jest application loading | lazy native dynamic import | FIXED |
| PILOT-11 | P2 | Contract PDF CSS used invalid `grid-template-cols` | changed to `grid-template-columns` | FIXED |

## Product Status

Core product behavior remains intact under the automated release gate. No random feature expansion was introduced during this hardening pass.

AI Vision remains intentionally non-production for real damage recognition until a real provider is integrated; this does not block the core ERP pilot because the system now fails closed rather than fabricating production inference.

## Frontend Status

- Typecheck: gated in CI.
- Unit/component tests: gated in CI.
- ESLint: gated in CI.
- Production `next build`: gated in CI.
- Full Playwright browser suite: gated in CI.
- Simulation status is visible on the AI Vision screen.

## Backend Status

- Typecheck: gated in CI.
- Unit tests: gated in CI.
- ESLint: gated in CI.
- Production Nest build: gated in CI.
- Live-PostgreSQL migrations + E2E: gated in CI.
- Liveness/readiness endpoints are separated.
- Structured request/error logging includes correlation IDs.

## Database Status

- Fresh PostgreSQL 15 migration path passes CI.
- The backend readiness probe verifies database connectivity.
- Backup and guarded restore tooling is present.
- A scheduled offsite production backup policy and timed restore drill are still external release conditions.

## Security Status

Verified repository hardening includes:

- tenant-isolation live E2E remains green;
- upload content signature validation;
- strict production throttling retained;
- AI simulation fail-closed in production by default;
- zero known production `npm audit --omit=dev` findings at the time of dependency verification;
- CI gate for future high/critical production dependency advisories.

This report does not claim the application is "100% secure" or legally certified.

## AI Status

**Production real CV inference: NOT IMPLEMENTED.**

The feature is intentionally safe because:

- production defaults to disabled;
- simulation mode is explicit;
- simulated confidence/coordinates are not represented as live inference;
- UI prevents treating the preview as a real repair decision.

A real provider should be introduced behind a provider abstraction only when credentials, cost controls, output validation, privacy terms, and failure behavior are defined.

## DevOps Status

Implemented in repository:

- production builds in CI;
- migrations gate in Docker Compose;
- liveness/readiness checks;
- container health checks;
- backup/restore scripts;
- deployment environment fail-fast for critical secrets;
- linked Vercel project discovered for the repository.

Not executed in this hardening pass:

- real production deployment;
- production migration execution;
- production environment variable verification;
- rollback against a live release.

These actions can affect real users/infrastructure and require explicit deployment authorization.

## Observability Status

Implemented:

- correlation/request IDs;
- structured HTTP request logs;
- structured exception logs;
- health/readiness probes.

Remaining condition:

- connect an external centralized error/uptime/alerting system and verify alert delivery. No external monitoring account was selected or authorized during this pass.

## Backup / Restore Status

Repository tooling is implemented and validated syntactically. It verifies generated archives before reporting success and requires an explicit destructive restore opt-in.

Remaining conditions before live pilot:

1. schedule backups on the selected production platform;
2. store copies off the primary host in encrypted/private storage;
3. configure backup-failure alerting;
4. run and time a restore against an isolated production-like environment;
5. record measured RPO/RTO rather than relying on targets.

## Performance Status

No new claim of production-scale throughput is made in this report. The hardening pass intentionally prioritized correctness/security/release gates rather than inventing benchmark numbers. Real pilot monitoring should establish p50/p95/p99 latency and resource baselines using production-like traffic and data volume.

## Tenant Isolation Status

The live-PostgreSQL backend E2E gate covering authentication and cross-tenant access passes after the hardening/dependency changes. Existing tenant-scoped vault behavior and signed download checks remain covered by tests.

A broader endpoint-by-endpoint authorization matrix is still useful ongoing QA, but no new tenant leak was observed in the executed release gates.

## Financial Integrity Status

No financial calculation rewrite was introduced during this pass. Existing Decimal-based application behavior remains protected by the backend test/build gate. This report does not claim a new independent accounting certification.

## Test Results

The production dependency patch passed all normal release jobs before merge:

- Backend: typecheck + unit tests + lint + production build — PASS
- Backend live PostgreSQL E2E with fresh migrations — PASS
- Frontend: typecheck + unit tests + lint + production build — PASS
- Full-stack Playwright E2E — PASS

The prior hardening state on `main` had also passed the same four-job gate before the dependency upgrade.

## Clean Environment Results

GitHub Actions provides clean hosted runners and fresh PostgreSQL service containers for the release gate. Fresh dependency installation, Prisma generation/migrations, builds, and tests are therefore exercised independently of a developer workstation's local node_modules/database state.

A full Docker Compose image-stack smoke test in a disposable environment would be an additional useful gate, but it is not being represented as completed here.

## Pilot Workflow Results

The existing Playwright suite exercises the real frontend/backend stack and the repository's seeded data. The hardening pass specifically revalidated booking and trust/customer risk flows after repairing stale selectors/dates.

A controlled real-agency pilot remains necessary because automated tests cannot validate every operational/UX behavior under real staff usage.

## External Blockers / Conditions

### MON-01 — Centralized alerting

**Need:** selected monitoring/error-tracking provider and credentials/configuration.  
**Next action:** connect backend/frontend error reporting and external uptime checks; trigger a synthetic failure and verify an operator receives the alert.

### REC-02/03 — Scheduled offsite backups + restore exercise

**Need:** selected production database/storage/scheduler target.  
**Next action:** schedule `scripts/db-backup.sh` or provider-native equivalent, configure encrypted offsite retention and alerts, then restore into an isolated target and run `/api/ready` plus smoke/E2E checks.

### DEPLOY-02 — Controlled live deployment

**Need:** explicit authorization for a live deployment plus final production environment values/credentials.  
**Next action:** deploy a controlled staging/pilot target, apply migrations, verify `/api/health` + `/api/ready`, run smoke tests, then onboard only the approved pilot agency.

### LEGAL-01 — Organizational/regulatory readiness

Technical controls may support privacy obligations but do not constitute Moroccan Law 09-08/CNDP legal certification. Organizational and legal actions must be completed separately.

## Deferred Items

- real CV provider integration;
- production-scale performance baselines;
- automated malware scanning provider (current content validation and allowlisting remain in place);
- additional endpoint-by-endpoint authorization coverage beyond the current security/E2E suite;
- product feature expansion driven by actual pilot feedback.

## Evidence

Primary repository evidence includes:

- `.github/workflows/ci.yml`
- `backend/src/app.controller.ts`
- `backend/src/common/middleware/request-id.middleware.ts`
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/ai-vision/ai-vision.service.ts`
- `backend/src/vault/vault.service.ts`
- `backend/src/pdf-engine/pdf-engine.service.ts`
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `scripts/db-backup.sh`
- `scripts/db-restore.sh`
- `docs/devops/BACKUP_RESTORE.md`
- `docs/security/DEPENDENCY_AUDIT.md`
- `docs/audit/EXECUTION_BOARD.md`

## Final Verdict

# READY FOR PILOT WITH CONDITIONS

The repository-level technical blockers discovered during this hardening pass have been fixed and verified through the release gate. The remaining release conditions are operational/external rather than unresolved core-code defects: centralized alerting, scheduled/offsite backup + restore verification, explicitly authorized deployment/environment configuration, and organizational/legal readiness.

Do not represent those external conditions as complete until they have actually been executed and verified.
