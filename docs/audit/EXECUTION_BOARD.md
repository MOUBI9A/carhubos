# Fider Production Hardening Execution Board

**Date:** 2026-10-10  
**Objective:** prepare Fider / CarHub OS for a controlled real-agency pilot.

| ID | Owner discipline | Severity | Objective | Status | Verification |
| --- | --- | --- | --- | --- | --- |
| OPS-01 | DevOps/SRE | P1 | Add application liveness + DB-backed readiness | DONE | controller tests + CI |
| OPS-02 | DevOps/SRE | P1 | Gate Docker startup on DB health and Prisma migrations | DONE | compose configuration reviewed; builds covered by CI |
| OPS-03 | DevOps/SRE | P1 | Fix frontend public API URL build-time configuration | DONE | frontend production build passes |
| OPS-04 | DevOps/SRE | P1 | Add request IDs and structured HTTP/error logs | DONE | backend typecheck/tests/build pass |
| REC-01 | Database/SRE | P1 | Provide guarded backup/restore scripts and runbook | DONE | shell syntax gated in CI |
| REC-02 | Database/SRE | P1 | Schedule encrypted offsite production backups | BLOCKED | requires selected production DB/storage/scheduler account |
| REC-03 | Database/SRE | P1 | Execute timed production-like restore drill | BLOCKED | requires production-like target and deployed environment |
| AI-01 | AI/Security | P1 | Prevent simulated CV from being presented as real inference | DONE | server fail-closed in production + tests + UI labels |
| SEC-01 | Security | P1 | Validate uploaded file bytes, not only claimed MIME | DONE | spoofed-content regression test |
| SEC-02 | Security | P1 | Remove high/critical production dependency findings | DONE | `npm audit --omit=dev` = 0 backend/frontend at verification time |
| SEC-03 | Security/CI | P1 | Prevent future high/critical runtime dependency advisories from silently shipping | DONE | CI release gate added |
| QA-01 | QA/Frontend | P1 | Repair stale Playwright selectors for custom comboboxes | DONE | full Playwright gate passes |
| QA-02 | QA/Frontend | P1 | Remove hard-coded past booking dates from E2E | DONE | relative future dates + full Playwright gate passes |
| QA-03 | QA/Security | P1 | Keep strict production throttles while avoiding CI self-throttling | DONE | environment-specific CI override; production defaults unchanged |
| PDF-01 | Backend | P1 | Keep patched ESM-only Puppeteer compatible with Jest/Nest loading | DONE | lazy dynamic import + backend E2E pass |
| PDF-02 | Backend/QA | P2 | Correct contract PDF grid CSS property | DONE | `grid-template-columns` corrected |
| MON-01 | SRE | P1 | Connect centralized error monitoring and external alerting | BLOCKED | external monitoring account/credentials/config not selected |
| DEPLOY-01 | DevOps | P1 | Verify linked hosting context | DONE | repository linked to Vercel project `carhubos` |
| DEPLOY-02 | DevOps | P1 | Deploy controlled production/staging target | BLOCKED | live deployment requires explicit authorization and production environment values |
| LEGAL-01 | Privacy/Operations | External | Complete Moroccan regulatory/legal operational requirements | BLOCKED | organizational/legal action outside repository code |

## Status definitions

- **DONE** — implementation exists and has repository/CI evidence.
- **BLOCKED** — repository work is complete enough to proceed, but the remaining action requires an external account, environment, credential, destructive/live action, or organizational/legal decision.

No known technically resolvable P0 issue is open in this board. External production operations remain release conditions and are not being represented as completed.
