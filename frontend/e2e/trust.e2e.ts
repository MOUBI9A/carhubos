import { test, expect } from '@playwright/test';
import messages from '../messages/en.json';

/**
 * Pillar 6 — Client Risk Assessment in the booking flow.
 * The setup seeds a clean customer ("Test Renter") and a CRITICAL-flagged one
 * ("Flagged Renter") on the Trust Network.
 */
test.describe('Client Risk Assessment (booking flow)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: messages.commandCentre.newBooking })).toBeVisible();
    await page.getByRole('button', { name: messages.commandCentre.newBooking }).click();
  });

  async function pickCustomer(page: any, name: string) {
    await page.locator('button[aria-haspopup="listbox"]').first().click();
    await page.getByPlaceholder(messages.common.filterOptions).fill(name);
    await page.locator('[role="listbox"] [role="option"]').filter({ hasText: name }).first().click();
  }

  test('shows the risk panel with a NEW state for an unknown renter', async ({ page }) => {
    await pickCustomer(page, 'Test Renter');
    await expect(page.getByText(messages.riskAssessment.title)).toBeVisible();
    await expect(page.getByText('No network history', { exact: true })).toBeVisible();
  });

  test('hard-locks the booking for a blacklisted renter until overridden', async ({ page }) => {
    await pickCustomer(page, 'Flagged Renter');

    // Panel reflects the cross-agency flag.
    await expect(page.getByText(messages.riskAssessment.title)).toBeVisible();
    await expect(page.getByText(messages.riskAssessment.FRAUDULENT_DOCUMENTS, { exact: false })).toBeVisible();

    // Submit is locked.
    const locked = page.getByRole('button', { name: /Booking Locked/i });
    await expect(locked).toBeVisible();

    // Fill the remaining fields and try to submit — it must be blocked.
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    await page.locator('input[name="startDate"]').fill(start);
    await page.locator('input[name="endDate"]').fill(end);
    // Select the first available car.
    await page.locator('button[aria-haspopup="listbox"]').nth(1).click();
    await page.locator('[role="listbox"] [role="option"]').first().click();

    await locked.click();
    await expect(page.getByText(messages.commandCentre.renterBlocked)).toBeVisible();
    // Modal stays open (booking refused).
    await expect(page.getByRole('heading', { name: /New booking/i })).toBeVisible();

    // Provide an override reason — the button flips to allow the booking.
    await page
      .getByPlaceholder(messages.riskAssessment.overridePlaceholder)
      .fill('Owner vouches personally; double cash deposit taken.');
    await expect(page.getByRole('button', { name: /Override & confirm/i })).toBeVisible();
  });
});
