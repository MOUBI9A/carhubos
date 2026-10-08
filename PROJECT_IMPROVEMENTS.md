# Implementation evidence and remaining work

Updated 2026-10-08. Primary repository: MOUBI9A/carhubos, branch feat/production-diagnostics. Reference carhub-infinity remains unchanged. These are cloud development checks, not claims of a live production service.

## Implemented

- Additive tenant-linked diagnostic vehicles/sessions, four capabilities and explicit Technician preset.
- Eleven generic mode-01 OBD PIDs, 25 reproducible scenarios, bounded batches/session evidence, late/clock-drift quality flags, idempotent replay and conflicting-replay rejection.
- Deterministic evidence/rules with limitations, technician test gates and authenticated confirmation, manual Decimal estimates, immutable JSON/PDF reports with canonical content hashes.
- Optional genuine Anthropic explanation endpoint separated from rule conclusions. Requests require real API key/model, use bounded context/response and timeouts, and reject unknown cited findings. No real provider credentials or live provider result have been demonstrated.
- Owner/authorized-agent workspaces in EN/FR/AR with permission/conflict/loading states, mobile/tablet layouts, bounded telemetry display and complete raw-evidence JSON export.
- Concurrent booking overlap/date constraints and atomic renter-identity initialization. Migration preflight refuses invalid existing data instead of rewriting it.
- Genuine production DISABLED payment state, honest AI vision unavailability, production configuration validation, bounded DB readiness and graceful shutdown.
- Node22 pin, secret-free Docker contexts, migration image target, non-root runtime, same-origin runtime API forwarding, protected manual Azure deployment workflow, security/image gates, backup/restore/smoke scripts.
- Removed committed browser credentials and generated state; per-run role fixtures use independent random credentials, private ignored state and scoped cleanup. Fixed broad selectors, stale dates and async test races without skipping assertions.
- Self-hosted licensed fonts with official source revision and integrity records, avoiding Google Fonts build-time network dependency.

## Verified evidence

- Backend full unit run: 56 suites / 472 tests passed; four DB-only integration tests are intentionally separate and passed with DIAGNOSTICS_DB_TEST=1.
- Backend full live-PostgreSQL E2E: 13 tests passed after the identity-initialization race was fixed. Concurrent authenticated requests produce one201/one409 and one booking/invoice/payment; distinct cars/tenants remain independent.
- Diagnostics-specific coverage: 52 assertions across deterministic processing, provider mocks, tenant/capability checks, optimistic writers, replay, immutable report and DB-round-trip hash integrity. Mock provider tests do not establish live AI connectivity.
- Frontend unit/proxy coverage: original9, proxy4 and diagnostics8 tests passed. Final aggregate rerun is recorded in the PR.
- Full browser run:39of40 passed; the sole failure was a diagnosed backend-watch restart502, and that test passed in the focused11-test rerun. The rerun also verified all six role logins and final diagnostics/evidence export. Actual authenticated JSON/PDF downloads, anonymous401, unauthorized403, exact361.20MAD estimate and no horizontal overflow at1440/768/390px passed. Test setup/cleanup are counted separately by Playwright; no assertions were disabled.
- Actual Chromium PDF generated and checked for %PDF; authenticated browser downloaded a real PDF.
- Backend/frontend typechecks and lint passed (frontend retains one pre-existing warning about deliberate hard401 navigation).
- npm production audits:zero findings in both projects. Backend development graph has20moderate findings. Frontend has one unpatched braces advisory propagated through five dev-only packages; scripts/security/audit-exceptions.json names it and expires2026-11-08. Runtime audits remain independently strict; no framework downgrade or blanket suppression.
- Bicep compiled, workflow YAML parsed, deployment shell scripts syntax checked.
- Real local logical backup/restoration succeeded into a dedicated empty DB:35tables and16completed migrations restored, recovery DB dropped afterward. This demonstrates local recovery, not Azure point-in-time restore or off-host backup storage.

## Release blockers requiring external access or more work

1. Azure identity/subscription/resource group, approved resource costs, immutable published images and registry pull credential. No Azure deployment was executed or externally verified. GitHub integration cannot list Actions secrets(403).
2. Scoped PostgreSQL network access/private VNet or controlled NAT, production secrets, protected staging/production environments and verified migration-before-traffic rollout.
3. Container OS/browser vulnerability gate must pass. The initial Debian12 image scan found high/critical OS/browser issues and vulnerable global npm tooling; updated-base/runtime rebuild and final scan results must be reviewed before release. Do not treat zero npm application findings as a clean container.
4. Authorized carhub.codes DNS access, verified custom-domain binding/TLS and external authenticated smoke tests. No domain change is claimed.
5. Verified production backups, restore drill, alert delivery, log-retention policy and incident/rollback rehearsal.
6. Trusted ingress/client-IP handling: the safe default sees the frontend proxy IP at the backend limiter. Design and verify platform-header trust before multi-user production; never trust arbitrary browser forwarding headers.
7. Optional licensed hardware transport, OEM procedures, parts-fitment/availability, labor-time data and supplier integrations. None are present; generic rules and manual prices remain explicit.
8. Optional real AI, storage/mail/SMS and payment credentials, consent/data-processing decisions and end-to-end provider tests. Image diagnosis is unavailable rather than fabricated; online payments remain disabled.
9. Competitor/pricing/accuracy claims need sourced research and validation. No fabricated commercial comparison or diagnostic accuracy is supplied.

## Reference project and laptop inventory

carhub-infinity was cloned and baseline-tested earlier:161backend+15frontend tests passed, typechecks/builds passed; pre-existing lint and DB teardown defects are in /workspace/onboarding/audit/REMAINING-WORK.md. No code from it was silently merged or pushed in this implementation. Laptop-only uncommitted/ignored files remain unknowable from cloud Git; provide an archive or a laptop Git push to inventory them. Secrets, DB data, caches, node_modules, generated builds and auth state do not belong in a Git push.
