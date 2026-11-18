# Operational Blockers

**Last updated:** 2026-11-18

## Active now

### B-007 — No patched release for new `picomatch` high-severity advisory

- **Blocks:** permanent resolution of dependency risk; previously blocked green acceptance evidence for `P0-01`.
- **Status:** Mitigated under approved 14-day time-bounded security exception (`docs/security/DEPENDENCY_EXCEPTION_GHSA_FC5Q_39XC_VJPF.md`) expiring `2026-12-02T23:59:59Z`.
- **Compensating controls:** Fail-closed wrapper in `frontend/scripts/audit-production.mjs` verifying exact advisory/version match, hard UTC expiry, disabled extractor check, and audit artifact retention; covered by 8 unit tests in `frontend/scripts/audit-production.test.mjs`.
- **Evidence:** manual CI run `44230394964` failed on `GHSA-fc5q-39xc-vjpf`; draft PR #29 reproduces one non-duplicated CI set; approved compensating controls allow exact-head CI to complete.
- **Current package fact:** npm reports `picomatch@4.0.7` as latest, while the advisory marks all versions through `4.0.7` affected.
- **Reachability evidence:** the project does not enable `next-intl` experimental extraction; the vulnerable watcher subscription and glob compilation are therefore not started by the current configuration, and no application/user input supplies glob patterns through this path.
- **Permanent resolution:** consume a published patched release or a reviewed upstream dependency change, remove the exception wrapper, then rerun the direct audit and all five CI jobs before `2026-12-02T23:59:59Z`.

## Resolved

### B-001 — Continuity setup not yet canonical on `main`

- **Resolved:** 2026-11-18.
- **Evidence:** PR #28 merged into `main` as `e010505e5f5ad53cc3bf9535e506668e2ed913ef` after exact-head CI and Vercel preview checks passed.

## Later phase gates

### B-002 — Production topology and database provenance unverified

- **Blocks:** production migration planning, staging equivalence and release claims.
- **Owned by task:** `P0-05`, then `P1-01`.

### B-003 — Managed PostgreSQL/staging/PITR decision not accepted

- **Blocks:** restore rehearsal, production-shaped migration evidence and pilot data.
- **Owned by task:** `P1-02`.
- **Human input:** service, region, access and budget decision.

### B-004 — Legal/business operator inputs incomplete

- **Blocks:** real-user handling of affected personal data, public legal claims, AI/GPS processing and general availability.
- **Human input:** business identity/contact, Moroccan counsel review, retention, subprocessors and approved operator process.

### B-005 — Provider contracts and production identities not selected

- **Blocks:** real online payment, outbound email/SMS/WhatsApp, AI processing and telemetry ingestion for the corresponding feature.
- **Rule:** unavailable providers remain disabled and must not report success.

### B-006 — Pilot agencies and support ownership not selected

- **Blocks:** `P3-05` and later pilot expansion.
- **Human input:** named agencies, onboarding owner, support/on-call owner and signed pilot terms.

These blockers do not prevent dependency-satisfied Phase 0 documentation/governance tasks such as `P0-04` from proceeding on separate scoped branches.
