import { test, expect } from '@playwright/test';

test.describe('Authentication gate', () => {
  // Run this spec with a clean, unauthenticated browser (override the shared
  // storageState) to prove the dashboard is protected and public root stays fast.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects an unauthenticated visitor from the dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test('sends an unauthenticated root visit straight to /landing without /auth/me', async ({ page }) => {
    const authMeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/auth/me')) authMeRequests.push(request.url());
    });

    await page.goto('/');
    await page.waitForURL('**/landing');
    await expect(page).toHaveURL(/\/landing(?:$|[?#])/);
    expect(authMeRequests).toHaveLength(0);
  });
});
