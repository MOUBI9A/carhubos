import { test, expect } from '@playwright/test';
import { API_URL } from '../playwright.config';

test.describe('Owner Verification & Mandatory Onboarding Journey (P0-2 & P0-3)', () => {
  test('unverified owner is restricted to /verify-email and blocked from /dashboard', async ({
    page,
    request,
  }) => {
    const stamp = Date.now();
    const email = `unverified+${stamp}@test.ma`;
    const password = 'Password123!';

    // Register via API
    const regRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email,
        password,
        name: 'Unverified Owner',
        role: 'OWNER',
        agencyName: `Agency ${stamp}`,
      },
    });
    expect(regRes.ok()).toBeTruthy();

    // Log in on UI
    await page.goto('/login');
    await page.getByPlaceholder('name@agency.com').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();

    // Must be redirected to /verify-email
    await page.waitForURL('**/verify-email**', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Verify Your Email' })).toBeVisible();

    // Trying to manually browse to /dashboard must redirect back to /verify-email
    await page.goto('/dashboard');
    await page.waitForURL('**/verify-email**', { timeout: 10_000 });
  });

  test('full end-to-end owner journey: signup -> verify -> onboarding wizard -> dashboard', async ({
    page,
    request,
  }) => {
    const stamp = Date.now();
    const email = `flow+${stamp}@test.ma`;
    const password = 'Password123!';
    const agencyName = `Atlas Rentals ${stamp}`;

    // 1) Register via API to get token
    const regRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email,
        password,
        name: 'Flow Owner',
        role: 'OWNER',
        agencyName,
      },
    });
    expect(regRes.ok()).toBeTruthy();
    const regData = await regRes.json();
    const token = regData.debugVerificationToken;
    expect(token).toBeTruthy();

    // 2) Visit verification URL with token
    await page.goto(`/verify-email?token=${token}`);
    await expect(
      page.getByRole('heading', { name: /Email (Verified Successfully|Already Verified)!?/i }),
    ).toBeVisible({ timeout: 10_000 });

    // 3) Lands on Onboarding Wizard
    await page.waitForURL('**/onboarding**', { timeout: 15_000 });
    await expect(page.getByText('Agency Profile & Contact')).toBeVisible();

    // 4) Fill Step 1
    await page.getByPlaceholder('e.g. +212 522 987654').fill('+212522123456');
    await page.getByRole('button', { name: /Continue/i }).click();

    // 5) Step 2: Rental Policies
    await expect(page.getByText('Rental & Business Policies')).toBeVisible();
    await page.getByRole('button', { name: /Continue/i }).click();

    // 6) Step 3: Fleet Setup
    await expect(page.getByText('Fleet Setup')).toBeVisible();
    await expect(page.getByText(/At least 1 vehicle is required/i)).toBeVisible();

    // Add Vehicle via form
    await page.getByRole('button', { name: /Add Vehicle/i }).click();
    await page.getByPlaceholder('e.g. 54321-A-6').fill(`1234-A-${String(stamp).slice(-2)}`);
    await page.getByRole('button', { name: /Save Vehicle/i }).click();

    // Verify requirement badge is satisfied
    await expect(page.getByText(/Fleet requirement met/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Continue/i }).click();

    // 7) Step 4: Review & Launch
    await expect(page.getByText('Review & Launch Workspace')).toBeVisible();
    await expect(page.getByText(agencyName)).toBeVisible();

    // Complete setup
    await page.getByRole('button', { name: /Complete Setup & Launch/i }).click();

    // 8) Lands on Dashboard with first-run welcome banner!
    await page.waitForURL('**/dashboard**', { timeout: 15_000 });
    await expect(page.getByText(/Workspace Live/i)).toBeVisible();
    await expect(page.getByText(/Create First Booking/i)).toBeVisible();
  });
});
