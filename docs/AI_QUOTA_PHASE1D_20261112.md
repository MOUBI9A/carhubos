# CarHub OS — Phase 1D AI Quota Reservation and Usage Accounting

**Engineering draft, 12 November 2026.**
**Branch:** `feat/ai-quota-foundation`, stacked on draft Phase 1C PR #25.
**Production status:** NOT deployed. No changes to production data, customers, prices, GPS, vehicles or payment accounts.

## Purpose

The user’s AI ecosystem requirements include agency-private AI settings, monthly usage caps, usage attribution, provable data and platform-level safety. Phases 1A–1C added read-only operational insights, agency AI opt-in preferences, platform-only review, global emergency disable and an allowlisted read-tool preview. Those controls are **not** permission to invoke a model or charge the tenant.

Phase 1D builds a **server-internal reservation ledger** for controlled future provider usage. Crucially, it is not wired to an AI model. Existing governance still hardcodes `providerIntegrationReady=false`, and there is no public quota mutation route. It must stay inactive until providers, pricing, privacy and operational approval are independently completed.

## Added database tables

- `AiQuotaBucket`: one serialized counter row per `agencyId + UTC calendar month`. Records held and committed request counts, held and committed costs in integer USD micro-units and a row-lock version. Unique composite key prevents duplicate buckets.
- `AiQuotaReservation`: tenant-owned opaque idempotency key, status `RESERVED | COMMITTED | RELEASED | EXPIRED`, conservative estimated maximum cost, actual committed cost, five-minute expiration and settled timestamp. Keys cannot be reused, including after expiry.
- PostgreSQL constraints prevent negative counters, zero estimates, over-estimate committed cost and unsupported status values. Both tables enable row-level security, with direct anonymous/authenticated API privileges revoked (where those roles exist).

The existing `AgencyAiSettings`, `AiUsageRecord` and `AiPlatformPolicy` remain canonical. No customer information, messages, provider tokens or GPS coordinates are stored in the new tables.

## Backend behavior

| Internal operation | Behavior | Safety |
|---|---|---|
| `getSummary` | Reads scoped UTC-month caps, reservations and finalized counters | Read-only, no raw keys or customer data |
| `reserveInternal` | Requires a verified agency, opaque key, positive bounded estimate and `effectiveEnabled`; transactionally locks month, rechecks active agency/approved settings/global kill switch, expires stale holds, enforces request and cost limits, then records hold | **Real governance always denies provider use**; no HTTP route |
| `releaseInternal` | Returns a non-committed hold to the quota, once | Cannot refund or erase committed spend |
| `commitVerifiedInternal` | **Future trusted provider adapter only.** Only accepts bounded actual cost at or below reserved estimate; records exactly one `AiUsageRecord`, moves counters from held to committed atomically | No provider is integrated. Overages, conflicting receipts or late evidence are rejected for manual reconciliation |
| `GET /api/ai-operations/quota` | OWNER/MANAGER plus `reports.view` and `finance.view`, agency from authenticated session only | Read-only, never accepts agencyId from request |

All month-changing paths first update the same bucket row inside a Prisma transaction. PostgreSQL holds that lock until commit; a second caller must wait and read the updated counters. Idempotency keys protect retries, including repeated settlement. First-row insertion conflicts/deadlocks are retried within bounded limits. The month is based on UTC, not the user's browser clock.

## Frontend

The existing `/dashboard/ai-operations/settings` page now displays an optional **internal quota snapshot**: reserved/committed request counts and cost estimates. The UI explicitly distinguishes this from a billing invoice. If the quota endpoint fails, editing verified settings still works; quota data is reported unavailable, never silently invented. Labels are available in English, French and Arabic.

## Verification

- Backend unit suite covers: role/capability scope, default zero summary, provider-off denial, invalid IDs and costs, idempotent reservation, parallel request admission, monthly cost cap, live emergency/approval checks, release, five-minute expiration, bounded settlement, double-settlement, unknown keys, cross-tenant isolation and late/overage reconciliation.
- Frontend unit suite checks successful quota presentation and nonblocking error fallback.
- Isolated disposable PostgreSQL rehearsal applied the migration, verified RLS and constraint rejection, then **ran the real Prisma service with concurrent requests** against synthetic agencies. Locking admitted only the permitted requests, kept caps intact, committed exactly one event, released holds correctly, isolated tenant keys and rejected disabled-provider attempts. The disposable DB was dropped after verification.
- Isolated Playwright CI tests are included for the read-only quota route and rejection of public quota mutation. CI status must be checked on this exact pushed commit before considering release.
- No production migrations, provider calls, customer notifications, billing, penalties or vehicle commands.

## Remaining release gates (not solved by these tables)

1. **Trusted provider metering:** assess provider pricing and data contracts. Build a real adapter that authenticates usage evidence and enforces maximum tokens/output cost before a request can incur charges. Merely passing a result object to `commitVerifiedInternal` is **not** independent provider verification.
2. **Late or cross-month provider receipts:** this preview rejects receipts after hold expiry or above the estimated maximum; an operational reconciliation queue is required to account for *actual external charges* rather than hiding overages.
3. **Provider-state race:** before making a real external call, recheck global emergency lock, agency approval, quota hold, available cost and policy version. A reservation alone does not authorize execution.
4. **Month and quota changes:** changes to budget while holds exist cannot retroactively reverse already incurred vendor charges. Define business policy for lowering limits and month-end crossovers.
5. **Data handling:** retention, access, audit review, personal-data transfer, API rate limiting, provider retries, de-duplication and incident response require legal and security signoff.
6. **End-to-end pilot:** independent technical review of stacked PRs #23 → #24 → #25 → this PR, QA role isolation, CI green and explicit approval before real AI models or paid integrations.

## Source material and boundaries

This implements infrastructure requirements from the user’s **MASTER PROJECT INSTRUCTIONS: AI-POWERED CAR RENTAL MANAGEMENT PLATFORM**, especially centralized AI, agency tenant separation, safety policy, controlled tool use, AI costs and staged phases. It does not implement the multilingual customer assistant, GPS ingestion or payment reminders; those remain later project milestones. The referenced Car Check guide's evidence and human-approval rules are separate Guardian Vision work and are not changed here.

**No feature in this PR is evidence of certified provider billing protection or a live autonomous AI agent.**

### Additional guardrails

- A reaper only decrements counters if all corresponding reservation records transitioned successfully; inconsistent rows abort the transaction.
- Token fields are limited to PostgreSQL 32-bit integers.
- A settlement that crosses a UTC month boundary is explicitly rejected for manual reconciliation. The existing `AiUsageRecord.createdAt` convention cannot safely backdate or split actual provider billing events; a period-aware model must be approved before activation.

## Review tooling

A read-only Codex CLI security review was attempted but did not produce a result because the CLI account hit its usage limit. The changes have therefore **not** received independent AI review. Local tests, isolated database rehearsals and GitHub CI are verifiable; human security review remains a release requirement.

### Replaying the isolated concurrency test

After constructing the specifically named disposable database as documented, run the script from `backend/` using `AI_QUOTA_TEST_DATABASE_URL` and `node -r ts-node/register/transpile-only ../scripts/ai-quota-runtime-rehearsal.cjs`. The script refuses every DB name except `carhub_ai_phase1d_scratch_20261112`. It lives outside `backend/` because that directory’s full ESLint project-service configuration does not include standalone `.cjs` scripts. No real provider calls are involved.
