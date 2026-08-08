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
  // A first pass at this (raising these timeouts alone, theorizing `next
  // dev`'s on-demand route compilation was just slow under CI's CPU) was
  // tested on a real CI run and disproven: the same class of failure still
  // hit the new, higher ceiling exactly, and a *different* role/spec failed
  // on the next run — not the same "cold route" every time. A raw Playwright
  // script run locally against a genuine `next start` production build (no
  // JIT compilation at all) still occasionally failed to render the login
  // form within 30s, pointing at general resource-contention-sensitive
  // flakiness rather than one deterministic bug. `next dev`'s heavier
  // per-request runtime (unminified bundles, on-demand compilation, HMR)
  // was a real contributor regardless of the exact mechanism, so CI now
  // runs a production build (see .github/workflows/ci.yml's "Build frontend
  // (production)" step) instead of `next dev`. This timeout bump is kept as
  // a secondary safety margin, not the primary fix.
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
