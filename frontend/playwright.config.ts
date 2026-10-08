import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * E2E config for CarHub Infinity OS.
 *
 * Drives the real stack: Chromium -> Next.js (:3002) -> NestJS (:5406) -> PostgreSQL.
 * The `setup` project registers a fresh agency + seeds a car and customer via the
 * API, logs in through the UI, and saves the auth cookie as storageState; every
 * other spec reuses that state so tests start authenticated.
 *
 * Specs are named `*.e2e.ts` (not `*.spec.ts`) so the vitest unit runner, which
 * globs `**​/*.spec.ts`, never tries to execute them.
 */

export const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5406/api';
export const STORAGE_STATE = 'playwright/.auth/owner-session.json';
// Inherited by Playwright workers: credentials are unique to this invocation
// and never written to an account/password file.
process.env.E2E_RUN_ID ??= randomUUID();
process.env.E2E_FIXTURE_PASSWORD ??= randomUUID();

export default defineConfig({
  testDir: './e2e',
  // One worker: the suite creates real bookings (which flip a car to RENTED),
  // so serial execution keeps the seeded fleet predictable within a run.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: FRONTEND_URL,
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // System Chromium installations may have no Playwright ffmpeg binary.
    video: process.env.E2E_VIDEO === 'off' ? 'off' : 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'cleanup' },
    { name: 'cleanup', testMatch: /.*\.teardown\.ts/ },
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
      url: `${API_URL}/ready`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
