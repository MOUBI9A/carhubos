# Fider Production Hardening Execution Board

**Date:** 2026-10-11  
**Objective:** prepare Fider / CarHub OS for a controlled real-agency pilot.

| ID | Owner discipline | Severity | Objective | Status | Verification |
| --- | --- | --- | --- | --- | --- |
| OPS-01 | DevOps/SRE | P1 | Add application liveness + DB-backed readiness | DONE | controller tests + CI + live probes |
| OPS-02 | DevOps/SRE | P1 | Gate Docker startup on DB health and Prisma migrations | DONE | compose configuration reviewed; builds covered by CI |
| OPS-03 | DevOps/SRE | P1 | Fix frontend public API URL build-time configuration | DONE | frontend production build passes |
| OPS-04 | DevOps/SRE | P1 | Add request IDs and structured HTTP/error logs | DONE | backend typecheck/tests/build pass; live logs use pathname only |
| REC-01 | Database/SRE | P1 | Provide guarded backup/restore scripts and runbook | DONE | shell syntax gated in CI |
| REC-02 | Database/SRE | P1 | Schedule encrypted offsite production backups | BLOCKED | requires connected production DB plus selected backup/storage/scheduler target |
| REC-03 | Database/SRE | P1 | Execute timed production-like restore drill | BLOCKED | requires connected production DB and isolated restore target |
| AI-01 | AI/Security | P1 | Prevent simulated CV from being presented as real inference | DONE | server fail-closed in production + tests + UI labels |
| SEC-01 | Security | P1 | Validate uploaded file bytes, not only claimed MIME | DONE | spoofed-content regression test |
| SEC-02 | Security | P1 | Remove high/critical production dependency findings | DONE | `npm audit --omit=dev` = 0 backend/frontend at verification time |
| SEC-03 | Security/CI | P1 | Prevent future high/critical runtime dependency advisories from silently shipping | DONE | CI release gate added |
| QA-01 | QA/Frontend | P1 | Repair stale Playwright selectors for custom comboboxes | DONE | full Playwright gate passes |
| QA-02 | QA/Frontend | P1 | Remove hard-coded past booking dates from E2E | DONE | relative future dates + full Playwright gate passes |
| QA-03 | QA/Security | P1 | Keep strict production throttles while avoiding CI self-throttling | DONE | environment-specific CI override; production defaults unchanged |
| PDF-01 | Backend | P1 | Keep patched ESM-only Puppeteer compatible with Jest/Nest loading | DONE | lazy dynamic import + backend E2E pass |
| PDF-02 | Backend/QA | P2 | Correct contract PDF grid CSS property | DONE | `grid-template-columns` corrected |
| DEPLOY-01 | DevOps | P1 | Verify linked hosting context | DONE | repository linked to Vercel project `carhubos` |
| DEPLOY-02 | DevOps | P1 | Deploy controlled production target | DONE | Vercel production deployment `dpl_CbjjT31p6rWs4C7nzrRXdp8wRyjQ` is READY at commit `ecc257c7e4991e063c007d3bb90b2eb5e2b2bf2d`; production aliases attached |
| DB-01 | Database/DevOps | P1 | Connect production PostgreSQL and apply canonical Prisma migrations | BLOCKED | `DATABASE_URL` is not configured; `/api/ready` correctly returns 503 |
| VAULT-01 | Backend/Security | P1 | Activate private Supabase Vault storage | BLOCKED | private bucket and URL are configured; server-only `SUPABASE_SECRET_KEY` is still missing |
| MON-01 | SRE | P1 | Connect centralized error monitoring and external alerting | BLOCKED | external monitoring account/credentials/config not selected |
| LEGAL-01 | Privacy/Operations | External | Complete Moroccan regulatory/legal operational requirements | BLOCKED | organizational/legal action outside repository code |

## Live verification note

On 2026-10-11 the current production deployment was probed again:

- `GET /api/health` returned **200 OK** and the Nest application cold-started successfully.
- `GET /api/ready` returned **503 Service Unavailable** with database state `unreachable`, which is the expected fail-closed result while `DATABASE_URL` is absent.
- Vercel reported no runtime error groups in the fresh one-hour window and no `error`/`fatal` runtime logs in the fresh 30-minute window.
- An older 24-hour aggregate contained six `/container` “Application exited with code 1” events. Detailed logs for those older events are outside the current Hobby-plan retention window, so no unsupported root cause is assigned. Fresh cold-start/liveness verification is healthy; recurrence should be monitored.

## Status definitions

- **DONE** — implementation exists and has repository/CI/live evidence where applicable.
- **BLOCKED** — repository work is complete enough to proceed, but the remaining action requires an external account, environment value, credential, production data target, or organizational/legal decision.

No known technically resolvable P0 issue is open in this board. The application is live, but real agency data must not be admitted until DB-01 is completed and the production authenticated smoke-test gate passes.
