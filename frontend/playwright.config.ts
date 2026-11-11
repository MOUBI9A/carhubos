import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';

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

// Override only for explicitly isolated E2E environments. Never point E2E
// fixtures at a production URL or use E2E_ALLOW_REMOTE_TEST_DB by default.
export const FRONTEND_URL = process.env.PW_FRONTEND_URL ?? 'http://localhost:3002';
export const API_URL = process.env.PW_API_URL ?? 'http://localhost:5406/api';
export const STORAGE_STATE = 'playwright/.auth/user.json';

// One test identity across setup and browser worker processes; isolated DB only.
process.env.E2E_RUN_ID ??= String(Date.now());
process.env.E2E_FIXTURE_PASSWORD ??= randomBytes(20).toString('hex');

const isCI = !!process.env.CI;
const localChannel = process.env.PW_CHANNEL || 'chrome';

export default defineConfig({
  testDir: './e2e',
  // One worker: the suite creates real bookings (which flip a car to RENTED),
  // so serial execution keeps the seeded fleet predictable within a run.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: isCI ? {} : { channel: localChannel },
    },
    {
      name: 'chromium',
      testMatch: /.*\.e2e\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
        ...(isCI ? {} : { channel: localChannel }),
      },
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
