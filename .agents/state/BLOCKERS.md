# Operational Blockers

**Last updated:** 2026-11-17

## Active now

### B-001 — Continuity setup not yet canonical on `main`

- **Blocks:** completion of `P0-00` and clean handoff to `P0-01`.
- **State:** PR #28 contains the setup; acceptance and merge remain.
- **Owner needed:** founder/repository maintainer for merge authorization.
- **Do not bypass by:** starting an alternate roadmap or copying the files directly into another checkout.

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

These blockers do not prevent `P0-01` through the other unblocked Phase 0 documentation/governance tasks once `P0-00` is accepted.
