# CarHub OS — multi-agency AI ecosystem architecture and phased rollout

**Prepared:** 12 November 2026
**Source:** User-provided *MASTER PROJECT INSTRUCTIONS: AI-POWERED CAR RENTAL MANAGEMENT PLATFORM* (21 numbered sections, 869 lines).
**Code baseline:** `MOUBI9A/carhubos` production `origin/main` at `6a61b3c`.
**Development branch:** `feat/ai-operations-foundation` (separate from draft compliance PR #22 and Guardian video PR #20).

## Product principle

CarHub needs **one coordinated intelligence layer**, not nine unconnected chatbots. The user document calls for agency/customer/platform experiences, rules, payment protection, GPS monitoring, business advice, communication, human approvals and audit logs. Existing booking, vehicle, invoice, support and permission modules should remain the canonical source of truth.

The first implementation is intentionally **deterministic monitoring**, NOT an LLM/chat assistant. It is a safe data foundation before any model access, automations, GPS or outbound communications are enabled.

## Existing components that must be reused

| Existing CarHub component | Verified code location | Reuse / limitation |
|---|---|---|
| PostgreSQL + Prisma multi-tenant data | `backend/prisma/schema.prisma` | `Agency`, `Car`, `Booking`, `Invoice`, `Task`, `CarDocument`, `AutomationRule` already exist; do not duplicate |
| Authentication + member permissions | `backend/src/auth/`, `common/guards/capabilities.guard.ts` | JWT agency identity + AgencyMembership; platform ROOT_ADMIN bypass needs explicit agency-context denial |
| Existing agency analytics | `backend/src/analytics/` | Operational reports exist; some paths recalculate ROI with writes, so they are **not** safe for read-only AI browsing |
| Rule persistence/execution | `backend/src/automations/` | Engine dispatches selected task actions for connected triggers; other actions are deferred and cannot honestly be advertised as live |
| Vehicle diagnostics/vision | `backend/src/diagnostics/`, `ai-vision/` | Preserve domain capabilities, do not claim universal AI accuracy |
| Payment status | `backend/src/payments/`, `payment-gateway/`, `webhooks/` | Gateway-verified settlement only; open invoice status cannot prove a payment was missed |
| Customer identity/consent | `backend/src/portal/`, `consent/`, `trust/` | Need purpose-bound permission and human review; never expose unrelated agency data |
| Dashboards | `frontend/src/app/(owner)`, `(agent)`, `(renter)`, `(admin)` | Extend existing layouts and translations rather than adding duplicate portals |

**Not established in merged main:** centrally governed LLM conversations, AI usage/cost quotas, true GPS-provider ingest, human action approvals for general AI tools, evidence-grounded multi-channel response generation, or a certified device-control system. A remote branch named `feat-telematics-gps` exists, but a branch name does not prove integration or release.

## Phase 1A — built in this branch: Operations Intelligence (monitor only)

- New `GET /api/ai-operations/briefing`: agency-owned data only, authenticated and requiring **both** `reports.view` and `finance.view`. Platform root without an agency cannot query this tenant route.
- Returns typed read-only counts from `Car`, `Booking`, `Invoice`, `CarDocument`, `Task`, with a server timestamp and explicit data source.
- Signals include late returns, imminent returns, open DUE/PARTIAL invoices (not necessarily overdue), vehicles under maintenance, expiring/expired documents and urgent tasks.
- Every signal exposes a fixed predicate, source model, count and a *review* link. No customer PII, payment amount, GPS trace, model prompt, user-created SQL or unverified free-text claims.
- Explicitly reports `mode=MONITOR`, `analysisType=DETERMINISTIC_AGENCY_RECORDS`, `externalAiUsed=false`, `automatedActionsEnabled=false`.
- Owner/Manager page `/dashboard/ai-operations`, translated to English, French, Arabic. No fabricated default KPI; failed queries display unavailable/error, not zero.
- Existing automation screen no longer displays fabricated execution totals (2481/138/897), fabricated 99.9% uptime, unsubstantiated 85%/24% ROI, or vehicle hard-lock as an available action. New safe task-only rules are saved paused; execution telemetry remains unavailable.
- **No database migration** is needed for Phase 1A. The main database and customer records are untouched.
- API does not produce or send autonomous actions; the actual business operation remains in existing server services with agency permission checks.

### API data contract (implemented)

`GET /api/ai-operations/briefing`

Returns:

```ts
{
  sampledAt: string; // UTC ISO8601
  mode: 'MONITOR';
  analysisType: 'DETERMINISTIC_AGENCY_RECORDS';
  externalAiUsed: false;
  automatedActionsEnabled: false;
  hasLiveGpsData: false;
  verifiedPaymentStatusUsed: false;
  metrics: {
    vehiclesTotal: number;
    vehiclesAvailable: number;
    vehiclesMaintenance: number;
    activeRentals: number;
    returnsNext24h: number;
    overdueReturns: number;
    openInvoices: number;
    documentsExpiring7d: number;
    documentsExpired: number;
    urgentTasks: number;
  };
  signals: Array<{
    code: string; severity: 'INFO'|'WARNING'|'HIGH'; count: number;
    source: string; definition: string; reviewPath: string;
    actionMode: 'REVIEW_ONLY';
  }>;
  limitations: string[];
}
```

**Important data limitations:** No `Invoice.dueDate` is present, so `DUE/PARTIAL` is explicitly **not** labeled late. Metrics are ten-plus independent read queries, not a serializable transactional snapshot. Historical revenue figures, cost estimates, customer risk judgments and GPS abnormalities are not generated without trustworthy underlying data.

## Next phases and guarded release gates

| Phase | Features | Planned data/API additions | Human & safety gates |
|---|---|---|---|
| **1B — AI governance** | Agency opt-in, platform default deny, supported languages, model/provider allowlist, budgets/usage tracking | `AgencyAiSettings`, `AiUsageRecord`, platform policy; versioned configuration; no API keys exposed | Platform safety overrides agency preferences; off by default; audit every model call |
| **2 — customer assistant** | Multilingual text first; only the logged-in renter's bookings, invoices, vehicle instructions; support ticket drafts and human escalation | `AiConversation`, `AiMessage`, `SupportTicket`; scoped read-tool registry | Signed customer identity, customer consent and data retention, no unrestricted private documents, cannot change booking directly |
| **3 — agency copilot** | Read-only natural-language analytics over validated reporting functions and provenance | Tool allowlist `fleetOverview`, `invoiceStatus`, `rentalReturns`; `AiReport` | Each backend function enforces agency/capabilities, outputs source/time range, no model-generated SQL or account IDs |
| **4 — rules and approval** | Visual conditions, modes MONITOR / ASSIST / AUTOMATE, task/notification drafts, execution history | `AiRuleVersion`, `AiProposal`, `AiApproval`, `AiExecution` with idempotency keys | Human approval for refunds, contracts, penalties, outbound communications and recovery; no general unrestricted dispatch |
| **5 — vehicle intelligence** | Provider-independent *read-only* GPS ingest: location, speed, ignition, odometer, geofence quality | `GpsDevice`, `GpsEvent`, adapter and signed webhook verification | Consent, retention/geolocation controls, speed accuracy, data gaps; **never immobilize a moving vehicle** |
| **6 — payment protection** | Invoice links, gateway-confirmed settlement, reminder drafts, opt-in cadence & stop-on-payment | `PaymentEvent` tied to verified gateway, `ReminderAttempt` and opt-out state | Link click is not payment. No auto penalties, no vehicle shutdown, no unapproved sends or duplicate charges |
| **7 — business growth + SaaS** | Fleet utilization, net performance, grounded recommendations, usage quotas and package prices | Cost+usage meters, recommendation evidence, platform AI budgets and pilot billing | No invented profits/percentages; isolate tenant billing and language usage; explicit commercial approval |

## Security architecture

```text
Owner/Manager | Agent | Renter | Platform Admin
            |
        AuthGuard + AgencyMembership capabilities
            |
        Scoped AI Gateway (future)
            |
  [Read-only intelligence]  [Tool allowlist]
            |                    |
  Prisma agencyId queries   Validated domain APIs
            |                    |
  Provenance + timestamps  Proposed action (ASSIST)
                                 |
                         Human approval + audit
                                 |
                       Backend policy + idempotency
                                 |
                       Low-risk authorized action
```

No model gets SQL credentials, direct vehicle-control APIs, payment gateway signing keys, or authority to override the backend. Tenant identifiers come only from authenticated sessions. Platform administrators need a separate, audited impersonation/tenant-selection policy—not an implicit bypass.

## Testing and release strategy

1. Phase 1A: unit tests for all tenant filters, missing-agency denial, zero metrics, no mutations, defined sampling windows, UI errors/refresh, and no fictitious automations. Authenticated E2E only against the isolated CI database.
2. Future AI text: prompt injection attempts, tenant crossover, fabricated facts, unsupported price/fee claims, restricted tool calls, customer dispute/handoff, evaluation sets by language.
3. Payment: webhook signatures, idempotency, partial/refund state, no reminders after verified settlement; no live charges in QA.
4. GPS: provider data schema, timestamp quality, duplicate webhook replay, geofence false positives, consent and retention; no remote immobilization.
5. Security: per-agency RLS, capabilities, rate limits, default-off feature flags, private credentials, audit history and data deletion requests.
6. Pilot only with **3–5 consenting agencies** and human monitoring, independent of Guardian video PR #20 and compliance PR #22. No fake demo data in production dashboards.

**Release status:** Phase 1A is a separate draft PR for technical validation; the full 21-section product vision is *not* claimed to be implemented. Promotion to production is gated on review, tests, tenant security and explicit change approval. Later AI phases require separate funded/approved provider and legal decisions.

## Phase 1C — draft platform review, emergency gate, and read-only tools

A separate stacked engineering branch implements platform-only, versioned agency AI approval/revocation; a default-locked global AI emergency control; per-revision platform audit records; fail-closed checks for the current ROOT_ADMIN identity; and a five-entry read-only agency tool registry. A founder-only screen supports reviewing eligible requests and the emergency policy with written justifications.

Important: this implementation deliberately does **not** activate an AI model. Its `providerIntegrationReady` value remains false, the `effectiveInferenceEnabled` response remains false, and clearing the administrative emergency switch never authorizes inference by itself. Any OWNER preference/budget change automatically invalidates prior platform approval.

The next unresolved safety gate remains **atomic budget/request reservations and trusted provider-usage reconciliation**, before any paid model invocation. See `docs/AI_PLATFORM_CONTROLS_PHASE1C_20261112.md` for verified contracts, permissions, limitations, tests and production release gates.
