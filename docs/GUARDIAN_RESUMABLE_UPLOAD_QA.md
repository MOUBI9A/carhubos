# Guardian signed resumable video — release candidate

Date: 2026-11-12. Base: production `f950d923966621d3b060f975a4c9b2c0121faf6f`.
Branch: `feat/guardian-resumable-video-upload`. Release candidate only; no production migration, deployment or merge.

## Behavior and authorization

Staff draft reports accept MP4 videos up to **45 MiB (47185920 bytes)**. Videos from **6 MiB** use direct TUS; smaller videos keep the existing multipart route. Photographs retain their existing API, 8 MiB limit and review permissions. The renter portal still permits damage photos only; this change does not grant renters baseline-video authority.

The new staff API prefix is `/api/guardian/staff/reports/:reportId/upload-intents`:

| Method | Suffix | Request / result |
| --- | --- | --- |
| POST | empty | `{revision,kind:"VIDEO",filename,mimeType:"video/mp4",expectedSizeBytes}`; creates an actor-bound pending intent and returns a path-specific upload token |
| GET | empty | Same actor's pending intents, including stale/expired entries for cancellation; no token |
| POST | `/:intentId/resume` | Reauthorize same actor/report/revision/phase/booking and return a fresh token for the same path; original intent expiry remains fixed |
| POST | `/:intentId/finalize` | Verify actual stored bytes; atomically return evidence ID, actual SHA-256, actual size and committed revision |
| POST | `/:intentId/cancel` | Mark pending intent terminal, then best-effort delete only its exact uncommitted path |

Every route uses real `AuthGuard` and `inspection.perform` capability enforcement. Actor and agency come from the JWT. UUID parameters are validated. A foreign tenant, actor or report receives 404. Body whitelist rejects supplied storage paths, bucket names, agency IDs and actor IDs. Token responses and lists use `Cache-Control: no-store`.

`GuardianService.videoMutation` scopes the SQL report row lock by agency, then rereads the report's agency/car/booking/customer association. `initiateVideoUpload` accepts only the current draft revision, generates its own random UUID path and limits each actor/report to one unexpired pending intent. Intent snapshots include phase and booking. `resumeVideoUpload` cannot extend the persisted two-hour lifetime. Existing report mutations use the same report row lock.

`finalizeVideoUpload` first authorizes under that scoped lock, verifies the object **outside** the SQL transaction, then locks again and rechecks every precondition. `VaultStorageService.verifyGuardianVideo` checks the private bucket, a trusted signed private GET, actual response MIME, MP4 `ftyp` box/major brand, exact streamed byte count and actual SHA-256. It holds only a 4 KiB header plus the current transport chunk; no full video Buffer/Blob. It aborts oversize or timed-out streams (45 MiB cap; 120-second signed GET/body timeout). Provider SDK bucket/signing calls rely on their own SDK/network timeouts; this is not a hard 120-second whole-request deadline. Incomplete/missing/transient reads remain pending for retry. Invalid objects cannot attach and require cancellation/restart; no client hash or size metadata is accepted as proof.

Evidence, approval invalidation, one revision increment, the original `EVIDENCE_UPLOADED` event and intent completion commit in one transaction. Unique storage/evidence keys and the report lock prevent duplicate attachment. A completed intent replays its **original** evidence/revision without rehashing or incrementing, even if the report later changes. Cancellation cannot delete completed evidence. Failure during finalization never blindly removes an object that another concurrent finalizer may have committed.

## Supabase and browser implementation evidence

Checked current official documentation and installed SDK source, rather than assuming an S3 or bearer-token protocol:

- [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads): direct storage hostname, POST creation/PATCH chunks, `x-signature`, metadata `bucketName`, `objectName`, `contentType`, fixed 6 MiB chunks; no upsert.
- [createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl): signed upload tokens last two hours.
- Installed `backend/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts`, `createSignedUploadUrl(path, options?: {upsert:boolean})`: returns `{signedUrl,token,path}`; `upsert:false` omits the upsert header.

The server calls `.storage.from(privateBucket).createSignedUploadUrl(randomPath,{upsert:false})`. It returns the scoped token, never the server key. The browser sends that token only in `x-signature`; no Authorization or upsert header and no app cookie forwarding to storage. `tus-js-client@4.3.1` is pinned exactly in the frontend package and lockfile. The UI provides progress, bounded automatic retries, pause/resume, explicit cancellation, original-file reselection after reload, verification retry and report refresh after a stale-revision error or successful attachment.

Only a TUS location, byte size, creation time and a sampled-file fingerprint may persist locally. The custom URL store drops headers, tokens and metadata; cached locations must match the exact storage origin and resumable path with no query/fragment. Sampled file identity prevents accidental reselection, **not** forensic identity proof. The server's complete-byte digest is authoritative. Browser storage denial is reported honestly: same-tab resume can work, reload may restart. Authenticated report access is required again after reload. No token goes into browser persistent state, URLs, events or logs.

## Verification results

| Command / check | Exact result |
| --- | --- |
| `npx prisma validate` | PASS; 3 existing required-field `SetNull` warnings |
| `npx prisma generate` | PASS; Prisma client 5.11.0 |
| All final migration files from an empty isolated DB; `prisma migrate status` | PASS; 22 applied, up to date; no production database connection |
| Intent SQL constraints, RLS and client grants | PASS; RLS enabled, no PUBLIC/anon/authenticated access, NULL-completion bypass rejected |
| Backend `npx tsc --noEmit` | PASS |
| Backend `npx eslint src` | PASS; zero errors/warnings |
| `GUARDIAN_TEST_DATABASE_URL=<isolated> NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand` | PASS; 77 suites passed, 1 skipped; **742 tests passed, 5 skipped**, 747 total |
| New Guardian video PostgreSQL suite | **16/16 PASS**, included above; actual concurrent DB locks/transactions, mocked storage |
| Frontend `npx tsc --noEmit` | PASS |
| Frontend `npx eslint src` | PASS; zero errors, 3 warnings in unchanged `src/lib/api.ts` |
| Frontend `npx vitest run` | **64/64 PASS**, 13 files; 28 Guardian tests |
| Backend `npm run build` | PASS |
| Frontend `npm run build -- --webpack` | PASS; default Turbopack attempt hit sandbox CSS-worker port denial; Webpack build succeeded with local sandbox escalation |
| Scoped Playwright: `guardian.e2e.ts` + `guardian-video.e2e.ts`, Chromium | **4/4 PASS**, including setup; isolated local API/DB, real browser, fake TUS/storage validation explicitly below |
| `git diff --check` and independent adversarial review | PASS; cancellation/preparation, revision/signing recovery and exact-filename regressions corrected and tested |
| Real Supabase upload smoke | **NOT RUN**: configured production Supabase excluded by task; real staged-storage acceptance remains open |

The real PostgreSQL fixture is a newly initialized local **PostgreSQL 17** cluster at loopback port 55432, database `guardian_e2e`, user `guardian_test`. The test URL is explicit and fail-closed; no test falls back to a production database. Production PostgreSQL version compatibility still needs the normal deployment rehearsal (project guidance lists version 15). Fresh final-migration replay used another disposable verification database, then removed that database only.

The new browser test transfers a **40 MiB synthetic fixture** using the real `tus-js-client@4.3.1` against Playwright-mocked TUS POST/HEAD/PATCH responses. It checks 6 MiB chunks, path metadata, `x-signature`, absent Authorization/upsert/cookies, accepted-offset continuation after interruption and full navigation, original-file reselection, progress, finalize and cancellation; no signature appears in local storage. This proves browser protocol behavior, **not real Supabase CORS, object acceptance, playability or remote hash verification**. Existing Guardian E2E verifies report creation/evidence gates and customer correction → agency acceptance → matching revision approval/PDF/authorization/no payment; its media metadata is seeded on the isolated DB.

Reproducibility notes: plain Jest initially failed the unchanged Work Orders real-Puppeteer PDF test because dynamic imports require `NODE_OPTIONS=--experimental-vm-modules`; the full final run with that setting passed. The first existing browser outsider-auth check used a fixture JWT key different from the synthetic isolated API; rerun explicitly supplied the matching test-only key. A 40 MiB browser assertion reached 36 MiB within its former 10-second limit while other checks were running; the assertion now allows 30 seconds and the complete scoped run passed. These environment/timing failures are recorded rather than hidden.

Security audits were actually run against npm's registry. **Backend: 29 findings (5 low, 24 moderate, 0 high/critical). Frontend: 31 (2 low, 16 moderate, 12 high, 1 critical).** An independent temporary audit of the original `f950d92` frontend package/lockfile produced the **identical 31 findings, with no added package/severity findings**. The critical finding is the development `shadcn` dependency chain's `proxy-addr`; no `tus-js-client` advisory was listed. Backend dependency files are unchanged. No broad `npm audit fix` or unrelated upgrade was applied. Audit remediation remains a release gate; these are not clean-audit claims.

Raw outputs are temporary local QA artifacts: `/tmp/carhubos-backend-jest-final.log`, `/tmp/carhubos-frontend-eslint-final.log`, `/tmp/carhubos-backend-build-final.log`, `/tmp/carhubos-frontend-build-webpack.log`, `/tmp/carhubos-guardian-playwright-verified.log`, `/tmp/carhubos-{backend,frontend,frontend-baseline}-audit.json`. They contain test diagnostics; no production secrets were committed.

## Confirmed storage-plan compatibility (2026-11-12)

The connected CarHub Supabase organization is on the **Free plan**, where the maximum individual object upload is 50 MB. Therefore the app-enforced resumable MP4 limit is **45 MiB** (47,185,920 bytes), safely beneath the provider cap; 150 MiB is **not available** on the current plan. The database migration enforces that same 45 MiB cap. Videos from 6 MiB use resumable TUS, and those under 6 MiB use existing multipart upload. Any future increase beyond 45 MiB must first verify an upgraded Supabase plan/global upload limit, update the database constraint and both app limits together, and rerun storage E2E. Production was not modified by this release candidate.

## Final Free-plan cap regression verification

After reducing all limits to 45 MiB, the revised migration was applied from scratch to a **fresh isolated PostgreSQL 17 database** (not the production database). Prisma migrate deploy and migrate status both passed with **22 applied migrations and no pending migrations**. The previous isolated test database was retained under a separate archival name. The complete database-enabled backend test suite passed **742/742 tests**, with **5 skipped**. Frontend tests passed **64/64**, frontend/backend TypeScript and ESLint passed (three existing frontend navigation warnings), and both production builds succeeded. A previously completed Playwright run passed **4/4** using a 40 MiB synthetic video with mocked TUS storage (which is within the new 45 MiB limit); full Playwright was not rerun again after the cap-only change. The actual remote Supabase TUS transfer remains **unverified**.

## Deployment and migration instructions — not executed

1. Review this candidate and dependency findings. Back up and rehearse against a disposable database before scheduling a production change. Keep the old application available for rollback.
2. Verify the intended private bucket independently. Its file-size policy and the project's global upload limit must allow 47185920 bytes and `video/mp4`; do not silently raise limits for every vault type. Browser TUS CORS must allow POST/PATCH/HEAD/OPTIONS and `x-signature`, `Tus-Resumable`, `Upload-Length`, `Upload-Offset`, `Upload-Metadata`, `Content-Type`; expose Location and Upload-Offset as required by TUS. Supabase server-key access stays backend-only.
3. Apply additive migration `20261112100000_guardian_resumable_upload_intents` with the **approved target environment** using `npx prisma migrate deploy`, then generate the Prisma client during the build. Do not use `db push`, `migrate reset`, or destructive seeds. The migration enables RLS and revokes PUBLIC/anon/authenticated table grants; the privileged application database role must retain server access. Validate the enum/table constraints and that client grants remain absent.
4. Deploy the compatible backend before the frontend. Confirm runtime outbound HTTPS and the finalization request timeout support streaming verification (up to 120 seconds plus overhead). HTTP/API platform timeout must be longer than verification; the browser allows 150 seconds. If the deployment cannot support that duration, do not enable the new uploader until a durable verification worker exists.
5. On a dedicated **nonproduction** storage project and disposable test DB, verify a real >32 MiB MP4 using signed TUS, interrupt after one chunk, resume after reload with the original file, finish, compare SHA-256, verify scoped private playback and delete only the unique QA object. Test CORS/bucket caps, expired tokens and an actual phone MP4. Do not substitute seeded media metadata or mocked TUS for this gate.
6. Exercise staff/renter cross-tenant access, stale revision, publish during transfer, cancellation and replay against the staged application. No automatic payment, deposit claim, approval, liability or AI inference is introduced.

Rollback: roll back frontend then backend; leave this additive migration and completed evidence intact. Do not drop intent metadata or evidence during rollback. In-flight tokens remain usable only on their preassigned private object path; old backend cannot finalize the new intents.

## Local TUS wire-protocol regression test (non-Supabase)

The new `frontend/e2e/guardian-video-wire.e2e.ts` runs a **real browser-to-HTTP transfer**, not a `page.route()` substitute for the TUS endpoint. It listens only on ephemeral `127.0.0.1`, verifies path-scoped signed headers, bucket/object/content-type metadata and the required 6 MiB chunk size, fails a PATCH deliberately, then resumes via TUS HEAD on a subsequent page load. It verifies that the complete 12 MiB binary payload matches the original SHA-256 hash, only one POST and one finalize occur, and no signed token enters browser local storage. The entire service is temporary and stores **no** production evidence. This exercises actual HTTP POST/HEAD/PATCH handling with `tus-js-client` and browser CORS, but **does not prove compatibility with hosted Supabase Storage**.

Local first attempt was blocked by an unrelated older pre-existing backend at port 5406, whose onboarding endpoint did not match this worktree. The test is included in the full-stack GitHub CI runner, which provisions the matching isolated backend and Postgres. Its passing status must be verified on the updated PR HEAD before promotion.

## Privileged orphan cleanup implementation — review candidate, not yet active

A standalone maintenance runner has now been implemented on this draft branch:
- `backend/src/guardian/guardian-video-cleanup.service.ts` serializes each cleanup claim against its GuardianReport row lock, revalidates PENDING/CANCELED state, age, expiry, tenant association and **no matching immutable GuardianEvidence**, then terminally marks PENDING as CANCELED before storage deletion. COMPLETED intents and evidence paths are never eligible.
- `VaultStorageService.removeGuardianAbandonedVideo` enforces the generated Guardian UUID MP4 path pattern and a **private** bucket, deletes exactly one object, and exposes only sanitized retryable errors.
- The original creation must be at least **48 hours old**, accounting for late signed TUS uploads. `lastSweptAt` in the **unapplied** migration records claim attempts, and a cooldown enables subsequent sweeps after another 20 hours if a late object appears or storage is unavailable.
- `guardian-video-cleanup.cli.ts` defaults to **dry-run**. It requires an explicit `GUARDIAN_ORPHAN_SWEEP_ENABLED=true` flag, valid database/private-storage configuration, and a separate `--apply` argument to delete.
- `.github/workflows/guardian-video-orphan-sweep.yml` schedules one daily privileged invocation, **but its job is disabled by default** unless the repository variable `GUARDIAN_ORPHAN_SWEEP_ENABLED` is set. Its protected `guardian-sweep` environment and dedicated `GUARDIAN_SWEEP_DATABASE_URL`, `GUARDIAN_SWEEP_SUPABASE_URL`, `GUARDIAN_SWEEP_SUPABASE_SECRET_KEY` secrets plus `GUARDIAN_SWEEP_BUCKET` variable must be configured before enabling it. This workflow is NOT live until the PR is merged, environment approvals completed, and opt-in enabled.
- Unit tests cover dry-run, exact-path deletion, report-lock racing, immutable-evidence protection, 48-hour safety window, repeat runs and sanitized failures. Targeted sweeper/storage suite: **54/54 passed** on 2026-11-12. Fresh CI will validate the new migration against isolated Postgres.

No production credentials, schemas, evidence, storage objects, schedules or account records are touched by this change. The actual signed-upload TUS storage acceptance against a dedicated staging project remains a separate **blocking gate**. A new project in the existing CarHub Free organization was quoted at **$0/month**, but the connected provider requires a specific cost-confirmation ID and no such approval has been provided; no new staging project was created. Do not substitute the live production storage project for this QA.

## Orphans and remaining release gates

Supabase does not support revoking individual signed upload tokens. Resume can mint a token whose own two-hour storage lifetime extends beyond the **unchanged** intent deadline. Finalization remains blocked after the original deadline. Cancel marks the intent CANCELED before removing the object, but an already issued token/TUS session can still write a late orphan. No UI claim says cancellation revokes storage authority.

The scheduled, privileged cleanup worker now exists in this draft PR but **remains disabled** pending staging verification, secrets, protected environment and explicit activation. Use only exact paths from CANCELED or expired PENDING intents, recheck under the report lock that no GuardianEvidence references the path, and mark PENDING terminal before deletion. Retain intent records for audit/replay. Sweep again after storage session expiry; a conservative initial cleanup window is **48 hours after intent creation**, covering documented 24-hour TUS sessions and late token issuance, with deployment-specific verification. Never delete objects by a guessed prefix or bucket listing, and never delete COMPLETED intent paths. No automatic production cleanup job was installed or executed by this change.

This is a synchronous bounded verification candidate. It does **not** implement antivirus scanning, video decoding/codec validation, duration/quality checks, async workers, real AI inference, legal chain-of-custody certification, tenant storage quotas, a full retention policy or production observability. Magic bytes are a container check, not proof that arbitrary content is safe or playable. Large upload permissions and global/per-bucket caps need a deployment review. Real Supabase end-to-end validation remains a release gate because this task explicitly forbids touching production Supabase.
