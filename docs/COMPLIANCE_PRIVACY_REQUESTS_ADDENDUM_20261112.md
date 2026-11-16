# CarHub OS — Privacy-rights intake implementation addendum

**12 November 2026 — draft engineering work, not legally certified or production deployed.**

## What the new workflow does

- Logged-in users can submit one of four data-rights review requests: ACCESS, RECTIFICATION, ERASURE or OPPOSITION.
- The backend determines the user from the authenticated session; it does **not** accept another user's identifier, sensitive free text, document scans, or contact details.
- A strict database constraint allows one open request (PENDING or IN_REVIEW) per user and request type, even under simultaneous POSTs. API throttling also limits request creation.
- Users can view their own recent requests (up to 30), but cannot query other users or change a request's status.
- The new request table is protected by PostgreSQL RLS, with direct anonymous/authenticated Data API privileges revoked. Application services must use trusted database credentials.
- The UI says **request recorded for human review**, not request fulfilled. Nothing is automatically erased, exported, or emailed.
- The existing account-closure flow is separate: it scrubs account credentials, but does not guarantee deletion of all stored files, contracts, backups or audit records.

## Implementation

- Prisma model: `PrivacyRequest`, relation to `User`.
- Unapplied migration: `backend/prisma/migrations/20261112170000_privacy_requests/migration.sql`.
- API: authenticated `POST /api/auth/privacy-requests` and `GET /api/auth/privacy-requests`.
- UI: `frontend/src/app/(public)/account-deletion/PrivacyRequestPanel.tsx`.
- Tests: backend `privacy-request.spec.ts`, frontend `PrivacyRequestPanel.test.tsx`.

## Current engineering verification

Backend targeted tests **12 passed**, frontend targeted tests **3 passed**; TypeScript and scoped lint passed. The full CI and disposable-database migration rehearsal are still required on the updated branch.

## Critical operational and legal gates

1. Identify the actual legal controller and verified support/privacy contact channels; avoid relying solely on unconfirmed privacy@carhub.codes.
2. Document requester identity verification, fulfillment responsibilities, lawful retention exceptions and deadlines by jurisdiction (Morocco, EU if applicable).
3. Provide a staff-only, auditable processing interface or trusted internal runbook. The queue by itself is **not** a fulfilled data-rights service, nor a commitment to send an email or perform automatic deletion.
4. Inventory stored identity and inspection media, contracts, audit logs, replicas and backups. Implement retention and deletion/export with proper legal-hold handling only after business and counsel decisions.
5. Test tenant authorization and complete lifecycle against an isolated database, then obtain legal review before launch.
6. Do not represent this intake as a compliance certification. All legal notices remain in draft until approved.

This addendum supplements `COMPLIANCE_20_POINT_AUDIT_20261112.md`, especially checklist item 20, and must be reviewed with it.

## Verified implementation checks — 12 November 2026

- Both unapplied compliance migrations were applied to a **fresh disposable local PostgreSQL database**, not to live Supabase. The privacy table and indices were created, RLS was enabled, and SQL rejected a duplicate pending request and an invalid request category. The disposable database was then dropped.
- Backend full Jest: **670 passed, 16 skipped** (other optional suites skipped); TypeScript, scoped ESLint and Nest production build passed.
- Frontend full Vitest: **61 passed**; TypeScript, scoped ESLint and Next.js production build passed.
- The database migration includes conditional revocation of `anon`/`authenticated` to remain compatible with both Supabase roles and standalone PostgreSQL CI.
- No live user data, data-rights requests, legal contacts or production migrations were modified. All updates remain subject to PR review and GitHub CI.

## Additional end-to-end coverage

The authenticated Playwright full-stack suite now includes an isolated privacy-request test. It signs in with a generated E2E agency account, submits an ERASURE review request, repeats the submission to confirm one pending entry, and confirms **no DELETE /api/auth/me request** is sent. This test runs against the test runner's disposable database only, not production. Its result must be checked on the new GitHub CI head before release.

## Primary regulatory references to review with counsel

- Moroccan CNDP rights information (access, rectification, objection): https://www.cndp.ma/vos-droits-en-matiere-de-protection-des-donnees-a-caractere-personnel/
- Moroccan personal data Law 09-08: https://www.cndp.ma/textes-et-lois/
- Moroccan consumer law 31-08 and transparent information: https://www.mcinet.gov.ma/en/content/consumer-protection
- WCAG 2.2 accessibility: https://www.w3.org/TR/WCAG22/

These references guide the checklist but do not establish CarHub's final legal obligations without knowing the business controller, user populations, processing agreements, and jurisdiction-specific facts.

### Open-request lifecycle constraint verified

After review, the partial unique constraint was tightened to cover both `PENDING` and `IN_REVIEW`. A new request of the same category is permitted only after the previous request is `CLOSED`. An isolated PostgreSQL migration rehearsal confirmed those transitions, rejected an invalid category, confirmed RLS, and removed the disposable database afterwards. The service and 13 focused backend tests reflect the same contract.
