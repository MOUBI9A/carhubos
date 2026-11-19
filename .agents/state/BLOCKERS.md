# Operational Blockers

**Last updated:** 2026-11-19

## Active now

None.

## Resolved

### B-007 — Withdrawn `picomatch` advisory required exception retirement

- **Resolved:** 2026-11-19.
- **Withdrawal evidence:** GitHub reports `GHSA-fc5q-39xc-vjpf` withdrawn at `2026-11-18T15:38:56Z` and updated at `2026-11-18T15:38:58Z`.
- **Resolution:** PR #35 removed the exception-only wrapper, tests, monitor and artifacts and restored the direct high-threshold audit; merge commit `eba3c5c` passed all five canonical jobs in run `44442498902`.
- **Audit evidence:** the unchanged production dependency tree reports zero production vulnerabilities.

### B-008 — Stale concurrent-agent revert entered the PR #29 merge

- **Resolved:** 2026-11-18.
- **Evidence:** stale process stopped; recovery PR #31 restored the exact reviewed controls and merged as `61e30aca33d196442ec74926e0f911e63e15f4ab`; all five canonical jobs passed on `main` run `44278183559`.
- **Safety outcome:** history was preserved; no force push or direct edit to `main` was used.

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
