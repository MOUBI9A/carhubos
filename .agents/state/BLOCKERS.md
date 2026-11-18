# Operational Blockers

**Last updated:** 2026-11-18

## Active now

### B-007 — No patched release for new `picomatch` high-severity advisory

- **Blocks:** green acceptance/merge evidence for `P0-01` and `P0-04`, and therefore `P0-02` branch-protection setup.
- **Evidence:** draft PR #29 produces one non-duplicated five-job CI set, but the unchanged frontend `npm audit --omit=dev --audit-level=high` gate fails on `GHSA-fc5q-39xc-vjpf`; the other four application CI jobs and Vercel preview pass.
- **Current package fact:** npm reports `picomatch@4.0.7` as latest, while the advisory marks all versions through `4.0.7` affected. `next-intl@4.15.1`, also the latest, still depends on `@parcel/watcher`, so upgrading that parent does not remove the path.
- **Safe resolution:** consume a published patched release or a reviewed upstream dependency change, then rerun the exact audit and all five CI jobs.
- **Human alternative:** a founder/security owner may approve a documented, time-bounded exception with exposure analysis, compensating controls and expiry; no such exception currently exists.
- **Do not bypass by:** suppressing the advisory, lowering the audit threshold, removing the production audit, or marking a red PR ready.

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
