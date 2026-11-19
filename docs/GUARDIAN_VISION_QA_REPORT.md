# Guardian Vision — Engineering QA and Release Review

**2026-11-12:** New local resumable-video candidate and its separate exact validation are recorded in [GUARDIAN_RESUMABLE_UPLOAD_QA.md](GUARDIAN_RESUMABLE_UPLOAD_QA.md). Results below describe the previous November 11 milestone and do not prove TUS or the new intent migration.
**Review date:** 2026-11-11
**Codebase:** `~/Desktop/carhubos` (Mac)
**Branch:** `feat/guardian-vision-mutual-approval`
**Deployment:** none. **Decision:** not approved for public production rollout.

## Tested behavior
- Creates per-rental OUT/IN condition-report drafts with agency/booking/car linkage.
- Requires OVERVIEW, ODOMETER and FUEL evidence; FULL mode also requires MP4 VIDEO.
- Each defect and repair requires an individually linked photograph (one original photo or repair photo cannot be reused for a second finding, guaranteed by Prisma uniqueness + service checks).
- Customer can view their linked report, submit their own photographed missing defect, and dispute.
- Agency can review/accept/dispute the customer finding and republish updated report revision.
- Both customer and agency must approve the same revision; stale approvals are rejected.
- Approved findings persist in per-car active damage history until authorized repair with photographic evidence; original finding remains accepted in historical report.
- Legacy inspection no longer records imaginary VERIFIED payment or invoice income.

## Automated verification

| Layer | Outcome | Details |
|---|---|---|
| Prisma schema validation | PASS with pre-existing SetNull warnings | Guardian model relations and constraints valid |
| Prisma migrations | PASS | Applied migrations to dedicated disposable PostgreSQL instance on 127.0.0.1:55432; all 20 migrations in sync |
| Backend TypeScript | PASS | `npx tsc --noEmit` |
| Frontend TypeScript | PASS | `npx tsc --noEmit` |
| Backend Jest | PASS | 656 passed and 16 skipped in latest local run (DB-dependent tests skip without isolated DB variables); full DB-enabled run passed 667 with 5 skipped |
| Frontend Vitest | PASS | 50 passed in 11 files |
| Guardian-specific Playwright | PASS | 3/3 including test setup, real browser: staff draft/evidence gate, customer correction → agency acceptance → mutual approval, no payment created |
| Entire existing Playwright suite | FAIL | 36 passed, 7 failed out of 43; failures in separate legacy flows listed below |
| Targeted Guardian lint | PASS | Both backend and frontend targeted ESLint checks |
| Nest backend production build | PASS | `npm run build` |
| Next frontend production build | PASS | `npm run build` |

The broad Playwright suite failed these tests. Some may be test setup, rate-limiter or environment issues. No untouched-branch comparison was performed, so **they cannot be called proven pre-existing regressions**:
1. Authentication gate — unauthenticated root redirect test.
2. Customer Vault access — active grant View action.
3. Diagnostics — scoped agent confirm/report permissions.
4. Fleet-car-document Vault — attached document View file.
5. Renter portal document upload — expected HTTP 503 state handling.
6. Renter portal document upload — document View action.
7. Role-based login routing — renter dashboard gate.

## Additional verified completion milestone (November 11, 2026)
- Latest standard local backend Jest: **656 passed, 16 skipped** (DB-dependent suites skipped without isolated DB variables); latest isolated DB-enabled backend Jest: **667 passed, 5 skipped**. Focused final PDF/storage Jest: **26 passed and 1 skipped**. Photo embedding TypeScript and targeted ESLint pass.
- Frontend Vitest: **50 passed in 11 files**. Frontend and backend production builds passed after the PDF media changes.
- Guardian-specific Playwright on isolated local Postgres + local API/UI: **3/3 PASS** (staff evidence capture gate, customer correction and agency acceptance, matching-revision mutual approval, PDF export, authorization). Anonymous PDF check explicitly clears browser authentication.
- Real PostgreSQL Guardian state integration passed **6/6**. Notification API tests against real Postgres passed previously.
- Private Supabase storage upload -> signed read -> identical-byte verification -> deletion **PASS** for unique temporary QA object; no persistent QA object created. Local backend credential repaired from matching root config.
- PDF rendering now supports inline private original photos for findings and other picture evidence, checks bytes/signature/SHA256, and warns when unavailable. The actual photo-embedding path has focused unit tests with mocked storage; a real full Guardian photo+video upload -> PDF embedding E2E remains pending.
- Full unrelated legacy Playwright suite still had **7 failures out of 43** on the previous broad run, without an untouched baseline. Whole-frontend lint reports many existing errors; Guardian-scoped lint is clean. **Do not deploy to production yet.**

## Critical / significant limitations
1. **No real AI CV or automatic before/after comparison**. Existing AI Vision is simulation-only when enabled; human review is mandatory. Vision model, localization, false-positive validation and matching algorithms are future work.
2. **Actual Guardian media-upload API E2E is not yet complete**: private Supabase Storage itself passed upload, signed read, exact byte comparison and deletion with a temporary test object after a LOCAL credential correction. Browser tests still seed media metadata rather than uploading a full video end to end.
3. **Upload architecture is a bounded pilot**: Nest FileInterceptor buffers up to 32MB MP4/8MB photo in memory. Real 60–120 second phone videos may exceed these limits, require direct resumable private storage and async media validation.
4. **PDF reports and explicit agency-confirmed WhatsApp report notification actions are implemented**. The PDF embeds hash-verified original photos if private storage is accessible, otherwise marks them unavailable, and references video through the portal. WhatsApp distinguishes unavailable, simulated, and provider-accepted states; a real recipient message and delivery callback were not E2E verified.
5. **Customer must be authenticated and linked to their booking**. No one-time login-free evidence review link yet; no automatic identity verification or correction window.
6. **No offline capture, automatic media-quality screening, i18n of Guardian screens, full privacy/lifecycle policy or legal review**.
7. **Storage operation inside a SQL row-lock transaction** needs asynchronous/object-first workflow with cleanup/retry/outbox for production resilience.
8. **Approval is not liability or financial settlement**. Claims and real payments must go through a separate human-controlled process.

## Security review observations
- Agency IDs come from authenticated user context rather than customer inputs.
- Customer reads/writes are scoped to their linked booking; foreign tenants and foreign renters receive a not-found response.
- Findings require a verified media attachment belonging to the report and authorized uploader.
- Private file URLs are generated per authorized read and expire after five minutes.
- Evidence originals are hashed with SHA-256; events keep actor, revision and action. This is not legally certified timestamping or forensic chain-of-custody attestation.
- Staff with `inspection.perform` may publish and decide corrections; before commercial release, define separate approval roles/policies for agencies that need manager-only review.
- Repairs require `fleet.manage` and a separate after-repair photograph. No automatic charges or deposit claims occur.

## Recommended production gates
1. Verify actual video/photo upload, storage retrieval, performance, redaction, retention, antivirus scanning, permissions and rate limits; switch to direct resumable upload/worker.
2. Expand isolated Playwright coverage: customer dispute → agency reopen, failed storage, repair with real media, unauthorized customer access, concurrent revision updates, no accidental payments.
3. Fix the seven existing suite failures or explicitly establish baseline and document waivers.
4. Add real AI/video frame extraction as a **separate** model-reviewed feature after measurement of false negatives and false positives. Never auto-assign fault.
5. Verify PDF image rendering against real authorized customer inspection media, live provider WhatsApp template approval/delivery callbacks, consent, legal copy, French/Arabic/English localization, mobile guided capture and accessible non-account review.
6. Review privacy law, financial charge policy, tenant/role escalation, observability and backups before migration to production. Do not release merely because unit tests pass.
