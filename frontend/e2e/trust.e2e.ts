import { test, expect } from '@playwright/test';

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Pillar 6 — Client Risk Assessment in the booking flow.
 * The setup seeds a clean customer ("Test Renter") and a CRITICAL-flagged one
 * ("Flagged Renter") on the Trust Network.
 */
test.describe('Client Risk Assessment (booking flow)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'New Booking' })).toBeVisible();
    await page.getByRole('button', { name: 'New Booking' }).click();
  });

  async function pickCustomer(page: any, name: string) {
    await page.locator('button[aria-haspopup="listbox"]').first().click();
    await page.getByPlaceholder('Type to filter...').fill(name);
    await page
      .getByRole('listbox')
      .getByRole('option')
      .filter({ hasText: name })
      .first()
      .click();
  }

  test('shows the risk panel with a NEW state for an unknown renter', async ({ page }) => {
    await pickCustomer(page, 'Test Renter');
    await expect(page.getByText('Client Risk Assessment')).toBeVisible();
    await expect(page.getByText('No network history', { exact: true })).toBeVisible();
  });

  test('hard-locks the booking for a blacklisted renter until overridden', async ({ page }) => {
    await pickCustomer(page, 'Flagged Renter');

    await expect(page.getByText('Client Risk Assessment')).toBeVisible();
    await expect(page.getByText('Fraudulent Documents', { exact: false })).toBeVisible();

    const locked = page.getByRole('button', { name: /Booking Locked/i });
    await expect(locked).toBeVisible();

    await page.locator('input[name="startDate"]').fill(dateFromToday(50));
    await page.locator('input[name="endDate"]').fill(dateFromToday(53));
    await page.locator('button[aria-haspopup="listbox"]').nth(1).click();
    await page.getByRole('listbox').getByRole('option').first().click();

    await locked.click();
    await expect(page.getByText('Renter blocked', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();

    await page
      .getByPlaceholder(/Audit Trail/i)
      .fill('Owner vouches personally; double cash deposit taken.');
    await expect(page.getByRole('button', { name: /Override & confirm/i })).toBeVisible();
  });
});
