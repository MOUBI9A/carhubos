import { test, expect, type Page } from '@playwright/test';

/**
 * Pillar 6 — Client Risk Assessment in the booking flow.
 * The setup seeds a clean customer ("Test Renter") and a CRITICAL-flagged one
 * ("Flagged Renter") on the Trust Network.
 */

/**
 * Combobox options live in the popup's `<ul role="listbox">`. Scope to it —
 * a bare `page.getByRole('option')` ALSO matches the sidebar
 * LocaleSwitcher's native `<select>` (Français / العربية / English), whose
 * `<option>` children keep the `option` role but are never visible while
 * the select is closed. See booking-flow.e2e.ts for the same guard.
 */
function comboboxOptions(page: Page) {
  return page.getByRole('listbox').getByRole('option');
}

/** Booking date inputs enforce `min` = today; never hardcode a literal. */
function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

test.describe('Client Risk Assessment (booking flow)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'New Booking' })).toBeVisible();
    await page.getByRole('button', { name: 'New Booking' }).click();
  });

  async function pickCustomer(page: Page, name: string) {
    await page.locator('button[aria-haspopup="listbox"]').first().click();
    await page.getByPlaceholder('Type to filter...').fill(name);
    await comboboxOptions(page).filter({ hasText: name }).first().click();
  }

  test('shows the risk panel with a NEW state for an unknown renter', async ({ page }) => {
    await pickCustomer(page, 'Test Renter');
    await expect(page.getByText('Client Risk Assessment')).toBeVisible();
    await expect(page.getByText('No network history', { exact: true })).toBeVisible();
  });

  test('hard-locks the booking for a blacklisted renter until overridden', async ({ page }) => {
    await pickCustomer(page, 'Flagged Renter');

    // Panel reflects the cross-agency flag.
    await expect(page.getByText('Client Risk Assessment')).toBeVisible();
    await expect(page.getByText('Fraudulent Documents', { exact: false })).toBeVisible();

    // Submit is locked.
    const locked = page.getByRole('button', { name: /Booking Locked/i });
    await expect(locked).toBeVisible();

    // Fill the remaining fields and try to submit — it must be blocked.
    await page.locator('input[name="startDate"]').fill(daysFromToday(30));
    await page.locator('input[name="endDate"]').fill(daysFromToday(33));
    // Select the first available car.
    await page.locator('button[aria-haspopup="listbox"]').nth(1).click();
    await comboboxOptions(page).first().click();

    await locked.click();
    await expect(page.getByText('Renter Blocked')).toBeVisible();
    // Modal stays open (booking refused).
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();

    // Provide an override reason — the button flips to allow the booking.
    await page
      .getByPlaceholder(/Audit Trail/i)
      .fill('Owner vouches personally; double cash deposit taken.');
    await expect(page.getByRole('button', { name: /Override & confirm/i })).toBeVisible();
  });
});
