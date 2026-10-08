# E2E tests (Playwright)

The suite drives Chromium → Next.js (:3002) → NestJS (:5406) → PostgreSQL.
Run against a migrated development/test database, never a production database.

```bash
cd frontend
npm run e2e
npm run e2e:ui
npm run e2e:report
```

The configuration reuses existing dev servers or starts the repository scripts.
The backend environment must contain `DATABASE_URL`, `JWT_SECRET` and
`IDENTITY_PEPPER`. Setup reads the backend `.env` through dotenv without logging
secret values. A remote dedicated test database needs the explicit
`E2E_ALLOW_REMOTE_TEST_DB=1` opt-in; `NODE_ENV=production` is rejected.

For cloud hosts with a trusted system Chromium and no Playwright ffmpeg:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium E2E_VIDEO=off npm run e2e
```

`E2E_FRONTEND_URL` and `E2E_API_URL` can override the local URLs. The browser must
reach the same API as the backend database used for fixtures.

`auth.setup.ts` registers a unique owner agency, creates two cars and two
customers through the API, and signs in through the UI. Role fixtures are created
in that same test database; elevated roles are never requested through public
signup. The run-scoped password is random independently of account names and
stays in worker environment memory. Only the
owner's browser session is saved to ignored `playwright/.auth/owner-session.json`.
`fixtures.teardown.ts` deletes this run's exact fixture records and browser
session, including network flags; it does not wipe or reseed the database or
remove other browser states. The session file uses owner-only permissions.
An interrupted process can leave that run's test agency behind.

The booking tests verify a pending form, real API persistence, and rejection
recovery. Auth and role tests use the real login and redirect flow. Vault,
document, and consent screen tests deliberately mock storage APIs to cover
configured/unconfigured UI behavior without requiring Supabase credentials;
they are UI contract checks, not proof that cloud storage is live.

The diagnostic workflow runs against the real backend and database. It verifies
simulated provenance, bounded telemetry with access to the complete evidence
export, recorded tests, authenticated confirmation, exact Decimal totals,
immutable reports, authenticated JSON/PDF downloads, and permission denials.
Desktop, tablet, and mobile screenshots are saved in ignored test results.

`*.e2e.ts` names keep these specs separate from the Vitest unit runner.
Browser authentication, reports, traces, videos, and screenshots are ignored.
