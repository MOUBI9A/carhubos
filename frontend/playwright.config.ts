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
  // Deliberately NOT inflated for CI. The failures that made this suite red
  // looked like slowness (everything died on a timeout) but were all
  // deterministic bugs — stale locators, a rate limit, and dates that had
  // aged into the past; raising these to 60s/20s was tried on a real CI run
  // and changed nothing except how long the run took to go red. With the
  // real causes fixed the whole suite passes in ~1 minute with every
  // individual test under 3s, so 30s/10s is ~10x headroom. Longer ceilings
  // would only delay honest failures.
  timeout: 30_000,
  expect: { timeout: 10_000 },
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
  // In CI the frontend is already built (see workflow) — just start the
  // production server; locally, run the normal dev server.
  webServer: [
    {
      command: process.env.CI ? 'npm run start -- -p 3002' : 'npm run dev -- -p 3002',
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
