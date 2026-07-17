import { test, expect } from '@playwright/test';

/**
 * Every user type must be able to log in and land on its own area.
 * These accounts come from `node prisma/seed-roles.js` (password admin123).
 */
test.describe('Role-based login routing', () => {
  // Start each test unauthenticated (override the shared owner storageState).
  test.use({ storageState: { cookies: [], origins: [] } });

  const cases = [
    { role: 'ROOT_ADMIN', email: 'root@carhub.os', landing: '/admin', marker: 'Global Pulse' },
    { role: 'OWNER', email: 'owner@carhub.os', landing: '/dashboard', marker: 'Infinity Control' },
    { role: 'MANAGER', email: 'manager@carhub.os', landing: '/dashboard', marker: 'Infinity Control' },
    { role: 'AGENT', email: 'agent@carhub.os', landing: '/agent', marker: 'Operations' },
    { role: 'RENTER', email: 'renter@carhub.os', landing: '/portal', marker: 'My Vault' },
  ];

  for (const c of cases) {
    test(`${c.role} logs in and lands on ${c.landing}`, async ({ page }) => {
      await page.goto('/login');
      await page.getByPlaceholder('name@agency.com').fill(c.email);
      await page.locator('input[type="password"]').fill('admin123');
      await page.getByRole('button', { name: /secure login/i }).click();

      await page.waitForURL(`**${c.landing}`);
      await expect(page.getByText(c.marker, { exact: false }).first()).toBeVisible();
    });
  }

  test('a renter cannot reach the owner dashboard (role gate)', async ({ page }) => {
    // Log in as renter, then try to open /dashboard directly.
    await page.goto('/login');
    await page.getByPlaceholder('name@agency.com').fill('renter@carhub.os');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /secure login/i }).click();
    await page.waitForURL('**/portal');

    await page.goto('/dashboard');
    // The gate bounces a renter back to their portal.
    await page.waitForURL('**/portal');
  });
});
