# Guardian Vision — Mutual Inspection MVP (November 11, 2026)

**2026-11-12 local follow-up:** The resumable-video release candidate supersedes the 32 MiB video architecture described in this historical MVP snapshot. Staff draft MP4 videos from 6–45 MiB now use signed direct private TUS, durable actor/report/revision intents and bounded streaming verification. Photos retain their original route. See [current implementation/QA and pending release gates](GUARDIAN_RESUMABLE_UPLOAD_QA.md). No production rollout of this candidate has occurred.

## Status
**Branch:** `feat/guardian-vision-mutual-approval` on the local `carhubos` repository. **Not deployed**. This is a usable initial pilot, not a production-ready automated AI damage detection product. The existing `/ai-vision` module is still simulated when enabled and is **not** used to assert liability here.

## Workflow
1. Staff use `/agent/guardian` or `/dashboard/guardian`, select an agency-owned booking, create one departure (OUT) and/or one return (IN) report, record odometer/fuel and choose QUICK (photos) or FULL (photos + MP4).
2. Staff upload an overview, odometer image, fuel image, and in FULL mode a video. Each individual defect requires a different linked close-up DAMAGE photo (enforced with a database uniqueness constraint); verified repair evidence also has its own unique after-repair photo; optional video file + second offset are supported.
3. Staff publish and approve a specific numbered revision. Only users whose linked booking has `renterId` or linked `Customer.userId` can use `/portal/inspections`; portal login is required.
4. Customer views evidence, submits an individual proposed defect with their own uploaded DAMAGE photo, or disputes the whole report with a reason. Customer-added evidence and findings force new version; previous approval is invalidated.
5. Agency accepts the proposed finding (or disputes with reason). If disputed, it may reopen for corrections. Both sides must approve the **same** republished report revision. No approval is inferred from silence, and report approval does not imply liability or consent to payment.
6. Confirmed damage appears in staff vehicle condition history across bookings. Only `fleet.manage` can verify repair with evidence on mutually approved reports; the original accepted finding is preserved, repair metadata/event are appended, and the repaired defect disappears from active damage.
7. Inspectors creating a legacy POST_RENTAL inspection now generate a review-only audit record, **not** any `VERIFIED` income Payment, invoice adjustment, or deposit claim.

## Code integration
- `backend/prisma/schema.prisma` / `backend/prisma/migrations/20261111140000_guardian_mutual_inspections/migration.sql` and `backend/prisma/migrations/20261111170000_guardian_one_photo_per_finding/migration.sql`: GuardianReport, GuardianEvidence, GuardianFinding, GuardianEvent.
- `backend/src/guardian/`: NestJS module, scoped staff/renter controllers and DTO validation, row-lock-based review state transitions, evidence hashes, storage integration, active defect registry, tests.
- `backend/src/vault/vault-storage.service.ts`: reuses existing Supabase **private** vault API; signed read URLs are short-lived, access is checked against agency/booking before issuing.
- `frontend/src/components/guardian` and routes `/agent/guardian`, `/dashboard/guardian`, `/portal/inspections`: staff/renter workflows and media viewers; Sidebar and renter navigation link to new pages.
- `frontend/playwright.config.ts`: optional isolated E2E URLs `PW_FRONTEND_URL`, `PW_API_URL`. `frontend/next.config.ts`: local loopback dev origin for browser tests.

## Report export and communications
- Staff and authorized renters can download a PDF with inspection report phase, revision, both approval states, audit events, fuel/odometer, individual defects, and a SHA256 evidence manifest. If private original photos are retrievable and hash-verified they are embedded next to the finding and in the evidence manifest; unavailable images are explicitly marked. Video remains accessible only through the authenticated portal. This is not a digitally signed or independently time-attested report.
- Agencies can explicitly notify the booking's registered customer via WhatsApp using a template-aware integration. The preview checks the linked customer, a staff member confirms the request, and response state never implies provider acceptance equals delivery. Real WhatsApp delivery callbacks were not tested here.
- Private Supabase storage connection passed a temporary-object upload/signed-download/byte-match/delete smoke test after the LOCAL backend credential was repaired. Full real Guardian video capture/upload E2E is not yet established.

## Current boundaries and essential next phases

**Not implemented yet:** Real AI scratch/dent model, video frame extraction, optical before/after matching, reliable image-quality and coverage checks, verified estimates, login-free secure renter links, no-account customer access, offline capture, automatic maintenance/work-order creation, insurance claims, i18n localization of the new Guardian UI, and evidence retention/deletion policy. Do not market these as working.

**Media limitations:** An image must be <=8 MiB; an MP4 <=32 MiB. Uploads currently use in-memory multipart buffers via NestJS and an existing private Supabase bucket. This is suitable only for bounded pilot video. Before production use, replace with short-lived signed direct-to-object-storage uploads with resumable/chunked transport, background workers, FFmpeg media validation, antivirus/media scanning, moderation/privacy redaction, upload quotas, storage lifecycle, retry handling and operational observability. The default vault storage service needs configured `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, a working **private bucket** and applicable access controls; test suite does not verify full real Supabase upload/download.

**Trust and security:** Events contain a reported actor and revision; SHA-256 hashes are computed from actual media bytes. This provides basic integrity checking but not cryptographic signing, independent timestamp attestation, or absolute proof of capture place/time. Review states are serialized in the DB; the uploaded object storage operation happens inside a DB transaction and needs a resilient outbox/two-phase approach before production scale. A formal threat model, penetration testing, access-control E2E, audit retention, deletion/export policies, and regulation-specific legal review are not complete. Reports do not establish liability.

**Financial boundary:** Damage detection and customer/agency approval MUST NEVER create a `VERIFIED` Payment, collect money, auto-claim a deposit, or determine fault. The original legacy auto-payment path is intentionally disabled. A separate manager-approved claims and actual collection workflow is future work.

**Booking linkage limitation:** At present the portal requires an authenticated renter associated with the relevant booking. Renters not yet linked to an account will not see inspections, and staff must ensure proper identity association. Customer login-free magic links and strong one-time identity verification remain future work.

**Vehicle history:** Individual accepted/confirmed damage appears across rental bookings until repair is verified; it is not deduplicated automatically by computer vision. Avoid double-recording manually by checking existing damage history during handover. Repair records contain before/after photos but approval and repair are separate events.

## Reproducible local verification
- `cd backend && npx prisma validate && npx tsc --noEmit && npx jest --runInBand`
- `cd frontend && npx tsc --noEmit && npx vitest run && npx eslint src/components/guardian src/app/(agent)/agent/guardian ...`
- `cd frontend && npm run build` (ensure no concurrent `next dev` uses the same build output).
- Browser E2E: Use a **dedicated disposable local database**, apply Prisma migrations to that DB only, start an isolated backend and frontend, then `PW_FRONTEND_URL=http://127.0.0.1:5302 PW_API_URL=http://127.0.0.1:55406/api DATABASE_URL=<local-test-db-url> npx playwright test e2e/guardian.e2e.ts --project=chromium`.
- Do NOT run destructive seed scripts against a production or user database. Existing Playwright auth.setup creates and onboards a fresh dummy agency. Tests that seed media metadata are **not** proof of actual storage upload.

## Release gate
Do not merge/deploy until media infrastructure, tenant and renter isolation tests with real Postgres, full staff+renter E2E across approval/dispute/repair, automated storage tests, operations/backup/retention controls, no false payment regressions, and feature flagging are verified. Production domain `www.carhub.codes` currently points to an older Vercel commit than the current local branch; do not assume parity.
