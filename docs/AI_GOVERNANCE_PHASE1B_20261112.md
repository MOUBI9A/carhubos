# CarHub OS — AI Governance Phase 1B

**Status:** Engineering draft. Not merged, deployed, enabled or billed.
**Stack:** `feat/ai-governance-foundation` based on draft AI Operations PR #23 (`feat/ai-operations-foundation`).
**Date:** 12 November 2026.

## Why this implementation exists

The 21-section AI platform plan requests a multilingual, multi-agency assistant ecosystem with controlled usage, tools, approvals and budgets. Building live AI calls before an agency-controlled, auditable permission system would risk accidental vendor charges, unauthorized customer-data transfer and cross-tenant access. This phase adds safe, **fail-closed configuration and usage storage**. It DOES NOT implement an LLM, external provider or action engine.

## Implemented now

- `AgencyAiSettings`: an opt-in request, language (EN, FR, AR), future monthly request limit, future USD budget cap. All are **off/zero** by default. Revisioned writes prevent older browser tabs silently overwriting newer settings.
- `platformApproved`: default false, not editable by the agency API. There is intentionally **no platform-approval endpoint** or provider key/selection in this release. An environment flag alone is insufficient to activate inference.
- Runtime `effectiveEnabled` additionally requires an explicitly reviewed provider integration. That integration is **hard-disabled in this branch**, even if opt-in, platform-approved and limits are set. `actionMode=MONITOR`, `humanApprovalRequired=true`, `autonomousActionsAllowed=false`. These are policy commitments for the future; no general AI action/approval engine exists yet.
- `AiSettingsChange`: actor-attributed revision audit stored atomically in the same SQL transaction as settings changes. The agency API has **no audit deletion or edit action**.
- `AiUsageRecord`: private, tenant-scoped, idempotent future metering storage with token/cost/status metadata. **No application writer or AI provider is connected**, so it will remain empty until a future reviewed server-side recording implementation is built. No raw prompts, customer IDs, messages or secrets are stored.
- Database enforces unique agency settings, revision audit uniqueness, idempotency keys for usage and bounded language/budget/request fields.
- `GET /api/ai-operations/settings`: authenticated OWNER/MANAGER with agency `reports.view`, read-only. No cross-tenant ID parameters.
- `PATCH /api/ai-operations/settings`: authenticated OWNER only with `settings.manage`, rate-limited, full DTO validation plus service validation. Updates agency opt-in/preferences only, never platform approval or model access. If revision is stale, the API returns a conflict.
- `GET /api/ai-operations/usage`: read-only, scoped by JWT agency to current **UTC calendar month**. Aggregates only actual metering records; zero means no recorded calls, not a verified external invoice.
- Owner/Manager UI at `/dashboard/ai-operations/settings`, English/French/Arabic. Managers see read-only fields. Owners can save a request and caps. The page makes model-unavailable status explicit.
- A link to settings appears in the Phase 1A monitoring dashboard.

## Mandatory safety guarantees

1. No provider integration or API key configured by this feature; `providerIntegrationReady=false` is hardcoded until future review.
2. No external model inference, real AI calls, payment charges, contracts, notifications, vehicle commands, or customer information transfers.
3. No auto-execution or general proposal approval mechanism. Those are **future Phase 4 features**, not implied by storing a boolean.
4. Platform approval cannot be set by an agency user (and is off by default).
5. Database Data API access to settings, audit and usage tables is denied by default through RLS and role revocation; server requests must use the application's trusted connection.
6. Permission and tenant contexts come from authenticated JWT and existing capability checks, not user-provided `agencyId`.
7. Every settings write requires a matching revision and creates an audit event in a single transaction. If a write/audit step fails, both roll back.
8. Budget caps are **configuration only**. They do not implement provider-side billing or guarantee future cost containment until an atomic reservation/quota gate is added.
9. Provider credentials, prompts, output text and personal data are not recorded in governance tables.

## API examples (illustrative only)

```json
{
  "requestedEnabled": false,
  "platformApproved": false,
  "effectiveEnabled": false,
  "preferredLanguage": "EN",
  "monthlyBudgetUsdCents": 0,
  "monthlyRequestLimit": 0,
  "revision": 0,
  "humanApprovalRequired": true,
  "autonomousActionsAllowed": false,
  "providerIntegrationReady": false,
  "actionMode": "MONITOR"
}
```

Full-replacement PATCH body:

```json
{
  "expectedRevision": 0,
  "requestedEnabled": true,
  "preferredLanguage": "FR",
  "monthlyBudgetUsdCents": 1000,
  "monthlyRequestLimit": 15
}
```

The latter **does not** grant access or authorize a charge. It saves an agency request for future platform review.

## Verification

- Backend unit tests: default-deny, both platform/provider gates, role+capability metadata, tenant scoping, suspended agency, optimistic stale-write detection, atomic audit, invalid value rejection, month boundary and no usage creation.
- Frontend unit tests: state rendering, owner-only edit, manager read-only, no invented values on errors, malformed budget rejection and safe payload.
- Playwright: synthetic OWNER in isolated CI requests access; confirms no inference or autonomous action is enabled, no unrelated mutation and API returns the saved limits.
- Isolated PostgreSQL migration rehearsal: default-off values, RLS enabled, invalid-language/budget checks, audit uniqueness and idempotent usage key, different agency keys can coexist. Disposable database was deleted afterward.
- Build / CI results must be verified on the updated PR HEAD before promotion. No production migration was run.

## Gates for Phase 1C / 2

- Select a suitable authorized provider and assess pricing, residency, data processing, privacy, retention, model availability and usage rate limits.
- Build platform-only approval and revocation with a separate immutable review record and emergency kill switch; do not reuse agency PATCH.
- Require an **atomic pre-inference reservation** of budget/token allowance, trusted usage reconciliation, idempotency, timeouts and test-only provider credentials before any model invocation.
- Implement a purpose-scoped, allowlisted read-tool gateway with explicit tenant checks per tool.
- Add audited human review and consent before any proposed action or customer communication. Payment/penalty/vehicle-control requests remain unsupported.
- Resolve production privacy, legal review and test account passwords as separately tracked in draft Compliance PR #22 and Guardian PR #20.
- Never merge this stacked PR without PR #23 acceptance plus migration/testing/security signoff.
