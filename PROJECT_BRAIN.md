# CarHub project brain

## Product and scope

CarHub OS retains its Fider rental-agency ERP and adds an automotive diagnostics pilot. Rental agencies remain the tenant boundary. Owners/managers and explicitly authorized technicians can register diagnostic vehicles, collect simulated or imported OBD-II evidence, analyze deterministic rules, record test results, confirm findings, produce priced estimates, and issue a versioned report. Diagnostics do not replace existing bookings, trust, consent, or billing workflows.

The pilot must distinguish measured/imported evidence, simulation, rule conclusions, and technician decisions. It must never present a canned response as AI analysis or claim OEM repair procedures, vehicle-specific fitment, labor times, or validated accuracy without an actual source. Generic OBD-II decoding is not an OEM diagnostic system. A hardware connection and licensed automotive data remain separate integration work.

## Architecture and invariants

- Backend: NestJS 11, Prisma 5, PostgreSQL. Frontend: Next.js 16, React 19, Tailwind 4. Node 22.23.3; npm 10/11. Backend port 5406, frontend development port 3002.
- Scope every business operation by authenticated agency membership and capability. Return 404 for another agency's resource. Never trust a body-supplied agency ID.
- Diagnostic sessions preserve revisions; mutations require the expected revision. Replay handling and event size/count bounds protect telemetry ingestion. Re-analysis or evidence changes must invalidate subsequent decisions and artifacts where required.
- Decimal calculations govern estimates and rental money. Estimates use technician-entered prices and explicit tax assumptions; no invented parts catalog or repair prices.
- PostgreSQL exclusion constraints, rather than preflight queries alone, enforce inclusive booking date overlap. A migration preflight refuses conflicting existing data; operators resolve conflicts with the business owner.
- Public SaaS/rental roles remain unchanged; diagnostic permissions are additive capabilities. Capability presets must be applied to existing tenants intentionally.
- Production defaults to disabled online payments. Mock payments are development-only. AI vision remains unavailable until a genuine provider is implemented and validated.
- Production rejects missing/weak secrets or invalid origins. `/api/health` is liveness; `/api/ready` checks the database with bounded timeouts. Runtime API forwarding preserves same-origin cookies through the frontend.

## Sources of truth

Use this file with AGENTS.md, PROJECT_IMPROVEMENTS.md, docs/DECISIONS.md, DEPLOYMENT.md, and COORDINATION.md. Historical Phase 12 presentation-only restrictions describe the earlier rental restyle; the user-authorized diagnostics/security work is additive application development. Existing rental invariants still apply.

## Delivery status

Implementation is on `feat/production-diagnostics`; `carhub-infinity` remains a reference checkout. Development runs in Codex cloud and does not require the laptop. The cloud contains the repositories and current Git history; laptop-only uncommitted files cannot be inferred or copied without an uploaded archive or a Git push from that machine.

Azure staging/production are not verified deployed. No production domain, DNS, TLS, backup policy, monitoring subscription, live payment processor, AI account, or hardware connection is claimed active merely because a template or configuration exists. Final validation evidence and remaining blockers belong in PROJECT_IMPROVEMENTS.md and the pull request.
