import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for CarHub Infinity OS.
 *
 * Drives the real stack: Chromium -> Next.js (:3002) -> NestJS (configurable test port) -> PostgreSQL.
 * The `setup` project registers a fresh agency + seeds a car and customer via the
 * API, logs in through the UI, and saves the auth cookie as storageState; every
 * other spec reuses that state so tests start authenticated.
 *
 * Specs are named `*.e2e.ts` (not `*.spec.ts`) so the vitest unit runner, which
 * globs `**​/*.spec.ts`, never tries to execute them.
 */

export const FRONTEND_URL = process.env.CARHUB_E2E_FRONTEND_URL || `http://localhost:${process.env.CI ? 3002 : 3001}`;
export const API_URL = process.env.CARHUB_E2E_API_URL || 'http://localhost:5406/api';
export const STORAGE_STATE = `${process.env.CARHUB_E2E_STATE_DIR || 'playwright/.auth'}/user.json`;

export default defineConfig({
  testDir: './e2e',
  // One worker: the suite creates real bookings (which flip a car to RENTED),
  // so serial execution keeps the seeded fleet predictable within a run.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
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
  webServer: process.env.CARHUB_E2E_EXTERNAL_SERVERS === '1' ? undefined : [
    {
      command: `npm run dev -- -p ${new URL(FRONTEND_URL).port || 3001}`,
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run start:dev --prefix ../backend',
      env: { PORT: new URL(API_URL).port || '5406', ALLOWED_ORIGINS: FRONTEND_URL },
      url: API_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
