# Release evidence
**Definition:** The exact, dated proof that a specific commit, migration set and deployment satisfy the required gates.
**Why it matters:** Preview checks and HTTP 200 responses do not prove authenticated role workflows or production data safety.
## How it works
Bind CI, migration rehearsal, deployment identity, smoke tests and runtime-error inspection to the same commit. Keep reported operational facts distinct from independently rechecked facts, and record rollback compatibility before migration.
## Related
- [[Fider]] — the deployed product.
- [[integration-sequence]] — applies the evidence gate to each draft stream.
## Sources
- [Integration roadmap](../../docs/INTEGRATION_ROADMAP_20261116.md) — 2026-11-16
- [Production page-load audit](../../docs/PRODUCTION_PAGE_LOAD_AUDIT_20261112.md) — 2026-11-12
