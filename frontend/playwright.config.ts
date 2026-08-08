import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for CarHub Infinity OS.
 *
 * Drives the real stack: Chromium -> Next.js (:3002) -> NestJS (:5406) -> SQLite.
 * The `setup` project registers a fresh agency + seeds a car and customer via the
 * API, logs in through the UI, and saves the auth cookie as storageState; every
 * other spec reuses that state so tests start authenticated.
 *
 * Specs are named `*.e2e.ts` (not `*.spec.ts`) so the vitest unit runner, which
 * globs `**​/*.spec.ts`, never tries to execute them.
 */

export const FRONTEND_URL = 'http://localhost:3002';
export const API_URL = 'http://localhost:5406/api';
export const STORAGE_STATE = 'playwright/.auth/user.json';

export default defineConfig({
  testDir: './e2e',
  // One worker: the suite creates real bookings (which flip a car to RENTED),
  // so serial execution keeps the seeded fleet predictable within a run.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // CI runners are slower and share CPU, and `next dev` JIT-compiles each
  // route on its first request in-run (no production build here) — the
  // first-ever hit on a given route/interaction can blow past timeouts
  // tuned for a warm local machine even though the app itself is fine.
  // Confirmed on a real run: every role but ROOT_ADMIN (whose only landing
  // route, /admin, had never been visited yet) passed its redirect check in
  // under 5s; ROOT_ADMIN alone timed out at 30s hitting that cold route.
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: process.env.CI ? 20_000 : 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.e2e\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],

  // Reuse the dev servers if they're already up; otherwise start them.
  // The backend must be reachable for the setup project to seed data.
  webServer: [
    {
      command: 'npm run dev -- -p 3002',
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run start:dev --prefix ../backend',
      url: API_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
