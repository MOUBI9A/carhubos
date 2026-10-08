import { test, expect } from '@playwright/test';
import { loginAsRole, type FixtureRole } from './fixtures';

/**
 * Every user type must be able to log in and land on its own area.
 * These scoped accounts come from the trusted test-DB setup and are removed
 * after this run. No demo seed or public role escalation is required.
 */
test.describe('Role-based login routing', () => {
  // Start each test unauthenticated (override the shared owner storageState).
  test.use({ storageState: { cookies: [], origins: [] } });

  const cases = [
    { role: 'ROOT_ADMIN', landing: '/admin', marker: 'Global pulse' },
    { role: 'OWNER', landing: '/dashboard', marker: 'Command center' },
    { role: 'MANAGER', landing: '/dashboard', marker: 'Command center' },
    { role: 'AGENT', landing: '/agent', marker: 'Operations' },
    { role: 'RENTER', landing: '/portal', marker: 'My digital vault' },
  ];

  for (const c of cases) {
    test(`${c.role} logs in and lands on ${c.landing}`, async ({ page }) => {
      await loginAsRole(page, c.role as FixtureRole, c.landing);
      await expect(page.getByRole('heading', { name: c.marker, exact: true })).toBeVisible();
    });
  }

  test('a renter cannot reach the owner dashboard (role gate)', async ({ page }) => {
    // Log in as renter, then try to open /dashboard directly.
    await loginAsRole(page, 'RENTER', '/portal');

    await page.goto('/dashboard');
    // The gate bounces a renter back to their portal.
    await page.waitForURL('**/portal');
  });
});
