import { test, expect } from '@playwright/test';

test.describe('Authentication gate', () => {
  // Run this spec with a clean, unauthenticated browser (override the shared
  // storageState) to prove the dashboard is protected.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects an unauthenticated visitor from the dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });
});
