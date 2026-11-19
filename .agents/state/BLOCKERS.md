# Operational Blockers

**Last updated:** 2026-11-19

## Active now

### B-009 — `main` auto-deploys without a production migration gate

- **Verified:** 2026-11-19 by `P0-05` read-only topology inspection.
- **Blocks:** autonomous merge of runtime, dependency, environment,
  infrastructure, schema or migration changes; any such merge is a production
  deployment trigger.
- **Evidence:** Vercel maps `main` to production automatically; the production
  backend starts `node dist/main`; no Vercel or GitHub production migration
  gate runs `prisma migrate deploy`.
- **Resolution path:** `P0-06` environment rules, `P1-02` isolated staging and
  accepted backup/PITR posture, `P1-03` restore/migration rehearsal, then a
  founder-approved release/promotion procedure.
- **Human gate:** founder/release owner approval remains required for every
  production-affecting merge or deployment.

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

- **Topology portion:** `P0-05` verified the Vercel, GitHub, DNS, Supabase,
  storage, Render and Prisma-migration path read-only; acceptance remains
  pending until its protected documentation PR lands.
- **Still blocks:** production migration planning, staging equivalence and
  release claims until the deeper schema/drift/scale/backup audit completes.
- **Owned by task:** `P1-01` after `P0-05` merges.

### B-010 — Public-schema RLS is incomplete

- **Verified:** production has 41 ordinary `public` tables; RLS is disabled on
  33 and enabled on 8.
- **Current containment:** direct privilege checks found zero public tables with
  DML privileges for either `anon` or `authenticated`; direct anonymous Data
  API exposure was not proven.
- **Risk:** future grants or exposed-schema changes could bypass application
  tenant isolation on tables without row policies.
- **Resolution path:** `P1-01` records exact grants/exposed schemas and `P1-05`
  designs and tests compatible tenant-safe policies. Do not bulk-enable RLS in
  production without those policies and tests.

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
