# Decision log

## 2026-10-08 — Add diagnostics alongside rental workflows

The repository is an established rental SaaS, whereas the supplied brief requests an automotive intelligence platform. Preserve tenant/auth/consent/rental behavior and add diagnostics routes and capabilities. Avoid a destructive rewrite or implying that reference Infinity code is the production application.

## 2026-10-08 — Evidence before repair recommendations

Start with bounded OBD-II decoding, reproducible scenarios, deterministic rules and explicit technician test/confirmation steps. No simulated images, fabricated AI scores, repair prices, OEM fitment or model accuracy claims. A real provider must be distinguishable from rules and unavailable when unconfigured. Generic evidence does not justify automatic repairs.

## 2026-10-08 — Database enforces reservation safety

Use PostgreSQL btree_gist plus an inclusive-range exclusion constraint for blocking booking states. Preserve existing business interval semantics. Abort migration on invalid/conflicting existing records; never silently cancel customer bookings. Known exclusion failures become HTTP 409 while unrelated DB errors retain their failure semantics.

## 2026-10-08 — Separate production from development simulation

Add DISABLED as a genuine payment-provider state instead of permitting MOCK in production. Return explicit unavailability before creating payment side effects. Image diagnosis returns an honest unavailable response instead of the previous fixed scratch/dent output.

## 2026-10-08 — Reproducible runtime and staged delivery

Pin Node 22.23.3, exclude secrets from Docker build contexts, run images as non-root, and provide a Prisma migration image. Prefer immutable image digests. Provision infrastructure/job, verify successful migrations, then update application traffic. Keep one replica while existing scheduled jobs lack distributed locking.

Azure templates are preparation, not proof of deployment. Azure identity, scoped firewall access, secure parameters and explicit resource-cost approval are prerequisites. Do not use the managed environment ingress IP as a PostgreSQL egress firewall allowlist. Production networking should use a reviewed private network or controlled NAT egress.

## 2026-10-08 — Validate security without unsupported downgrades

Update compatible dependency versions and retain framework compatibility. Do not apply npm's suggested Next 14/Jest 25 downgrades to resolve transitive audit findings. Any unpatched build-tool advisory requires a named, time-bounded exception with evidence that production dependencies do not include the affected package; all other high/critical findings remain blocking.
