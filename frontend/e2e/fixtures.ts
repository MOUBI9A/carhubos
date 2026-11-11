import { createRequire } from 'node:module';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

export type FixtureRole = 'ROOT_ADMIN' | 'OWNER' | 'MANAGER' | 'AGENT' | 'RENTER';

export function fixtureAccount(role: FixtureRole) {
  const runId = process.env.E2E_RUN_ID;
  const password = process.env.E2E_FIXTURE_PASSWORD;
  if (!runId || !password) throw new Error('Run E2E through the Playwright configuration.');
  return {
    email: `e2e-${role.toLowerCase()}-${runId}@carhub.test`,
    password: `E2e!${password}`,
    agencyName: `E2E Agency ${runId}`,
  };
}

export async function loginAsRole(page: Page, role: FixtureRole, landing: string) {
  test.setTimeout(100_000);
  const account = fixtureAccount(role);
  await page.goto('/login');
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByPlaceholder('name@agency.com').fill(account.email);
    await page.locator('input[type="password"]').fill(account.password);
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith('/auth/login') && response.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    const response = await responsePromise;
    if (response.status() !== 429) {
      expect(response.ok(), `Fixture login returned ${response.status()}`).toBeTruthy();
      break;
    }
    // Respect the real login limiter. Running all role/portal tests from one
    // localhost IP must not require weakening the security guard.
    const seconds = Number(response.headers()['retry-after'] ?? 60);
    if (attempt !== 0 || !Number.isFinite(seconds) || seconds < 0 || seconds > 60) {
      throw new Error('Auth rate limit exceeded the bounded E2E retry window.');
    }
    test.info().annotations.push({ type: 'auth-rate-limit', description: 'Waited for the backend login throttle window.' });
    await page.waitForTimeout((seconds + 0.2) * 1000);
  }
  await page.waitForURL(`**${landing}`);
}

/** Only localhost test databases are accepted by default; never seed production. */
export function fixtureDatabase() {
  const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
  backendRequire('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env'), quiet: true });
  if (process.env.NODE_ENV === 'production') throw new Error('E2E fixtures cannot run in production.');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('E2E role fixtures need the backend test DATABASE_URL.');
  const hostname = new URL(dbUrl).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]', 'db', 'postgres'].includes(hostname)
      && process.env.E2E_ALLOW_REMOTE_TEST_DB !== '1') {
    throw new Error('Remote fixtures require E2E_ALLOW_REMOTE_TEST_DB=1 and a dedicated test database.');
  }
  const { PrismaClient } = backendRequire('@prisma/client');
  return { prisma: new PrismaClient(), backendRequire };
}

/** Elevated roles are assigned only by trusted test-DB setup, never public signup. */
export async function createRoleFixtures(agencyId: string) {
  const { prisma, backendRequire } = fixtureDatabase();
  const { ROLE_PRESETS } = backendRequire('./prisma/capability-presets');
  const password = await backendRequire('bcryptjs').hash(fixtureAccount('OWNER').password, 10);
  try {
    for (const role of ['ROOT_ADMIN', 'MANAGER', 'AGENT', 'RENTER'] as FixtureRole[]) {
      const agencyScoped = role === 'MANAGER' || role === 'AGENT';
      await prisma.user.create({
        data: {
          email: fixtureAccount(role).email,
          password,
          name: `E2E ${role}`,
          role,
          isVerified: true,
          agencyId: agencyScoped ? agencyId : null,
          ...(agencyScoped ? {
            memberships: { create: {
              agencyId, rolePreset: role,
              // This E2E starts with no diagnostic grants before testing
              // an explicit view/perform grant. Production presets are intact.
              capabilities: role === 'AGENT'
                ? ROLE_PRESETS[role].filter((cap: string) => cap !== 'diagnostics.view' && cap !== 'diagnostics.perform')
                : ROLE_PRESETS[role],
            } },
          } : {}),
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

/** Dates remain valid when the suite is run months after a commit. */
export function futureBookingDates(offsetDays = 14) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
