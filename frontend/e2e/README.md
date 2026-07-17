# E2E tests (Playwright)

End-to-end tests that drive the real stack: **Chromium → Next.js (:3002) → NestJS (:5406) → SQLite**.

## Running

Both dev servers must be running (the config reuses them; it will start them if they're down):

```bash
# from frontend/
npm run e2e          # headless run
npm run e2e:ui       # interactive UI mode
npm run e2e:report   # open the HTML report from the last run
```

## How it works

- **`auth.setup.ts`** runs first. Each run it registers a brand-new agency (`e2e+<timestamp>@carhub.test`), seeds two cars and a customer via the API, logs in through the real UI, and saves the auth cookie to `playwright/.auth/user.json`. Fresh data per run keeps the tests independent of whatever is already in the dev DB.
- Every `*.e2e.ts` spec reuses that storageState, so it starts authenticated.
- Specs are named `*.e2e.ts` (not `*.spec.ts`) so the vitest unit runner never picks them up.

## Coverage

| Spec | What it proves |
|------|----------------|
| `auth.e2e.ts` | Unauthenticated visitors are redirected to `/login`. |
| `booking-flow.e2e.ts` | Searchable Combobox selects, **optimistic** booking (modal closes immediately + success toast), empty-search state, and client-side validation. |
| `dashboard.e2e.ts` | Command Centre KPIs render and reflect the seeded fleet. |

## Note

Each run leaves a new throwaway agency in `backend/dev.db`. That's harmless for local dev; reset with a fresh `dev.db` if it accumulates.
