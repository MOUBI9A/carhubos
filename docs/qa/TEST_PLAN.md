# Fider (CarHub OS) — QA Test Plan & Verification Matrix

**Document Owner:** Agent 9 — QA Engineer  
**Status:** 100% Passing & Verified  
**Current Metrics:** 49 Test Suites Passing | 402 Tests Passing | 0 Failures

---

## 1. Testing Strategy Overview

```
                      ┌────────────────────────────────┐
                      │   End-to-End User Journeys     │
                      │  (Playwright / Vitest Portal)  │
                      └───────────────┬────────────────┘
                                      │
                      ┌───────────────▼────────────────┐
                      │   API Integration & Security   │
                      │   (Multi-tenant Boundary & DTO)│
                      └───────────────┬────────────────┘
                                      │
                      ┌───────────────▼────────────────┐
                      │    Unit & Domain Invariants    │
                      │ (Decimal Math, HMAC, AuthGuard)│
                      └────────────────────────────────┘
```

Fider employs a fail-closed test pyramid focusing on mathematical accuracy, data segregation, and security boundaries.

---

## 2. Test Verification Matrix by Module

| Module | Test File | Key Test Cases Covered |
| :--- | :--- | :--- |
| **Monetary Math** | `founder-metrics-money.spec.ts`<br>`deposit-lifecycle.spec.ts` | Verification that `Decimal(12,2)` never drifts; integer cent conversions match exact accounting values. |
| **Tenant Isolation** | `multi-tenant-boundary.spec.ts`<br>`trust.blacklist-boundary.spec.ts` | Proof that cross-tenant queries return HTTP 404; attempts to access another agency's cars, bookings, or documents are completely rejected. |
| **Trust Identity** | `trust.identity.spec.ts`<br>`trust.assess.spec.ts` | Validation of HMAC-SHA256 normalization (case-folding, whitespace trimming) and deterministic scoring across agencies. |
| **Consent Vault** | `consent.service.spec.ts`<br>`vault.service.spec.ts` | Time-boxed consent expiry; rejection of ungranted document reads; safe rollback of storage files if DB metadata write fails. |
| **PDF Dossier** | `pdf-engine.service.spec.ts` | XSS / HTML injection attacks neutralized; malicious `<script>` tags escaped; certified dossier layout rendered safely. |
| **Automations & Webhooks** | `automations.service.spec.ts`<br>`webhook-ssrf-guard.spec.ts` | Trigger evaluation on booking events; SSRF blocks on private IP ranges (`127.0.0.1`, `169.254.169.254`). |
| **Capabilities** | `capabilities.guard.spec.ts` | Preset role conversion (`OWNER`, `MANAGER`, `AGENT`); validation of 21 capabilities; ROOT_ADMIN global bypass. |
| **AI Vision Telemetry** | `ai-vision.service.spec.ts` | Tenant scoping of scanned vehicles; bounding box output structure; safe parsing of corrupted inspection damages JSON. |

---

## 3. High-Priority Edge-Case Test Scenarios

### Edge Case 1: Concurrency Race on Booking Collision
- **Scenario:** Two agents attempt to book the same vehicle for overlapping dates at the exact same millisecond.
- **Verification:** Both requests execute inside `prisma.$transaction`. The second transaction fails with an availability conflict exception; zero double bookings occur.

### Edge Case 2: Multi-Currency & Cent Rounding Invariance
- **Scenario:** Splitting payments across multiple partial payments (e.g., 333.33 MAD + 333.33 MAD + 333.34 MAD = 1000.00 MAD).
- **Verification:** Integer cent comparison confirms balance reaches zero exactly without fractional cent residue.

### Edge Case 3: Script Injection in PDF Export
- **Scenario:** User enters customer name `Karim Benali <script>alert("pwned")</script>` and description `<iframe src="evil.com">`.
- **Verification:** `PdfEngineService.buildAccidentHtml` escapes HTML entities into `&lt;script&gt;` and `&lt;iframe&gt;`, preventing remote code execution in headless Chromium.

---

## 4. Test Execution Runbook

### Backend Test Suite
```bash
cd backend
# Run all unit and integration test suites
npx jest --verbose

# Run type checking
npx tsc --noEmit
```

### Frontend Test Suite
```bash
cd frontend
# Run component and locale tests
npx vitest run

# Run type checking
npx tsc --noEmit
```
