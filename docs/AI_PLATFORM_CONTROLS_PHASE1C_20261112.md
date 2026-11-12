# CarHub OS — Phase 1C Platform AI Controls and Read-only Tool Registry

**Status:** Isolated engineering branch `feat/ai-platform-controls`, stacked on PR #24; **not** merged or deployed.
**Date:** 12 November 2026.
**User source:** `MASTER PROJECT INSTRUCTIONS: AI-POWERED CAR RENTAL MANAGEMENT PLATFORM` (21 sections, 869 lines).

## What is implemented

The project now has three consecutive, safely isolated layers:

1. Phase 1A / PR #23: deterministic agency Operations Intelligence, no external AI or actions.
2. Phase 1B / PR #24: opt-in requests, bounded budgets/request preferences, private usage ledger and audit, default off and zero provider readiness.
3. **Phase 1C / this draft PR:** platform-only agency approvals and revocations, an emergency disable policy, human review logs and a fixed read-only tool preview catalog.

### Platform controls

- `AiPlatformPolicy`: a **single global row** (`GLOBAL`) created by the migration, with `emergencyDisabled=true` and revision 1. A missing row is also interpreted as disabled.
- `PATCH /api/saas-admin/ai-control/policy`: ROOT_ADMIN only. Backend verifies that the current actor still has the ROOT_ADMIN role and is verified in the live database (not merely the JWT). Every switch change requires a 12–400 character reason and matching expected revision; records an audit event atomically. This is an administrative readiness switch, *not* permission to call a provider.
- `GET /api/saas-admin/ai-control/policy`: current lock state, revision, `effectiveInferenceEnabled=false`, `providerIntegrationReady=false`.
- `AiPlatformPolicyEvent`: append-only through this API, one audit record per policy revision.
- `GET /api/saas-admin/ai-control/requests`: ROOT_ADMIN only; up to 100 opted-in agencies, with minimal business-facing name, caps, language, status and revision; no customer or invoice data.
- `PATCH /api/saas-admin/ai-control/agencies/:agencyId/review`: ROOT_ADMIN only. Requires a valid agency, an existing opt-in request, positive request and budget caps, an explicit boolean approval/revocation, reason and version. Rechecks live ROOT_ADMIN role and stores a separate `AiPlatformReview` plus an `AiSettingsChange` in the same database transaction as the revisioned approval update.
- `AiPlatformReview`: separately versioned per-agency APPROVE / REJECT / REVOKE decisions. Rejection of an unapproved opt-in is an explicit, reasoned audit event distinct from an outstanding pending request; revocation applies to an earlier approval. The UI shows the latest reviewed status by revision. No agency-facing endpoint can set `platformApproved`.
- **Approval invalidation:** any subsequent OWNER settings update (including opt-out, re-opt-in or increased budget/request caps) resets `platformApproved=false` and records this in the same settings audit transaction. A new platform approval is required.
- `AiGovernanceService.getSettings` reads `AiPlatformPolicy.emergencyDisabled`; missing policy => fail-closed. Actual provider readiness remains hardcoded false, independent of every request, policy flag or approval.

### Read-only tool registry

- `GET /api/ai-operations/tools` and `GET /api/ai-operations/tools/:toolId/preview` require authenticated OWNER/MANAGER and **both** `reports.view` and `finance.view`.
- The five fixed, user-safe tools are `fleet_overview`, `return_attention`, `document_review`, `invoice_review` and `urgent_tasks`.
- Every preview reuses the existing deterministic agency briefing and selects only explicit aggregate fields. Session-sourced `agencyId` is mandatory, no input arguments, no customer PII, no arbitrary queries, URLs, SQL, AI model calls or writes. Unknown tools are rejected before database access.
- **The registry is available to signed-in agency staff for preview; no LLM/model tool router is implemented.**

### Admin UI

- Founder-only `/admin/ai-control` page, linked only from ROOT_ADMIN navigation, with English/French/Arabic translations.
- Displays locked/unlocked policy with revision, requires a reason before changing the global switch.
- Lists agency opt-in requests, supports reasoned approval and revocation, shows a non-negotiable reminder that **AI remains unavailable**.
- Handles HTTP errors without exposing backend details or inventing success. Browser role display checks supplement, but never replace, backend authorization.

## Isolation, money and safety

- All new private tables have PostgreSQL row-level security enabled and direct `anon`/`authenticated` access revoked when those roles exist.
- Transactions use revision compare-and-set and unique per-revision audit constraints to reject stale writes and duplicate events.
- **No external model is connected**. Platform approval and clearing emergency disable **cannot** start inference: `providerIntegrationReady=false` remains hardcoded, with explicit `effectiveInferenceEnabled=false`.
- No agency prompts, customer personal data, payment-gateway tokens, GPS positions or model output are stored by this feature.
- No vehicle lock, payment capture, penalty, refund, message, contract alteration or autonomous action.
- Existing `AiUsageRecord` is reserved for verified future usage; **no provider usage writes are implemented**. Current budget/request limits do not represent real provider cost enforcement.
- Do not claim that a general human-approval workflow, model selector, atomic quota reservation, verified expense ledger, or full regulatory compliance exists. Those are **future release gates**, not hidden features.

## Verification plan

- Unit coverage: platform authorization checked both against route role metadata and live database, missing policy default deny, revision CAS, review reason, opt-in and limits required, separate audit entries, revoked approval, settings-change invalidation; read-only tool allowlist, unknown tool rejection, tenant scoping, no writes.
- Frontend: 6 admin page unit tests for safe default display, reason-gated emergency changes, opted-in agency reviews, manager denial, sanitised HTTP errors, and invalid reasons.
- Full-stack Playwright (isolated synthetic owner): owner cannot read/update platform policy or self-approve; can preview the fixed aggregate tool registry.
- Disposable PostgreSQL migration rehearsal: single policy row, default locked state, RLS on all three private tables, malformed reason and duplicate revision rejection, safe policy version compare-and-set, tenant-review uniqueness. Scratch DB removed afterwards.
- CI must pass on the exact pushed commit, including isolated Postgres and full-stack browser tests, before review.

## Roadmap / release gates after Phase 1C

1. **Atomic quota reservations:** design `AiQuotaReservation` and monthly counters with idempotent reservation keys, expiration and signed/verified settlement. Guard against parallel requests and at-least-once provider responses. Current prefs are **not** enforceable billable limits yet.
2. **Provider assessment:** business approval of service, pricing, data handling/location, retention and model policies; do not embed provider keys in client-side code.
3. **Model tool executor:** route only through reviewed data functions and per-call tenant/capability validation; sanitize prompt injection and enforce context limits.
4. **Action approval system:** separate approval, actor, evidence, revision, expiry and execution audit; prohibit financial/customer/vehicle changes without explicit human authorization.
5. **Staged pilot:** real agency opt-in, legal/privacy review and no customer-impacting sends or charges until individually approved.
6. **Dependency order:** PR #23 before PR #24, then this PR. Keep Guardian #20 and Compliance #22 isolated. No production migration or deployment without explicit release approval.

## QA environment

Use the isolated CI database and generated synthetic roles. Do not test platform approvals by upgrading a production agency account or deleting production data. The route `/admin/ai-control` must not be interpreted as evidence of a live AI provider.

## Review feedback resolved

A focused Codex CLI security review found that an unapproved request could not be explicitly rejected because the service disallowed writing `approved=false` when approval was already false. The platform review flow now records a distinct `REJECT` decision, with justification, revision, and audit history. The E2E suite was also updated to call the isolated NestJS API origin rather than the Next.js frontend origin. Both changes are subject to the updated CI run.
