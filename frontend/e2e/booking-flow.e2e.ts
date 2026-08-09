import { test, expect, type Page } from '@playwright/test';

/**
 * The daily-driver flow and the whole point of the UX pass: the searchable
 * Combobox selects and the optimistic booking creation.
 */

/**
 * Combobox options live in the popup's `<ul role="listbox">`. Scope to it —
 * a bare `page.getByRole('option')` ALSO matches the sidebar
 * LocaleSwitcher's native `<select>` (Français / العربية / English), whose
 * `<option>` children keep the `option` role but have no box while the
 * select is closed, so they resolve as permanently hidden. A single
 * `<select>` maps to the `combobox` role (not `listbox`), so scoping this
 * way excludes it cleanly.
 */
function comboboxOptions(page: Page) {
  return page.getByRole('listbox').getByRole('option');
}

/**
 * Booking date inputs carry `min={new Date().toISOString().slice(0,10)}`,
 * so any hardcoded literal silently turns invalid once real time passes it:
 * the browser then blocks form submission outright and the app's own
 * validation toast never fires. Always compute relative to today.
 */
function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the command centre to finish loading (skeleton -> real UI).
    await expect(page.getByRole('button', { name: 'New Booking' })).toBeVisible();
  });

  test('creates a booking through the comboboxes and closes optimistically', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).click();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();

    const triggers = page.locator('button[aria-haspopup="listbox"]');

    // --- Customer combobox: opens, is searchable, selects the clean renter ---
    // (explicitly, since a blacklisted "Flagged Renter" is also in the list).
    await triggers.first().click();
    await expect(page.getByPlaceholder('Type to filter...')).toBeVisible();
    await page.getByPlaceholder('Type to filter...').fill('Test Renter');
    await comboboxOptions(page).filter({ hasText: 'Test Renter' }).first().click();

    // Trigger now reflects the selected customer.
    await expect(triggers.first()).toContainText('Test Renter');

    // --- Car combobox ---
    await triggers.nth(1).click();
    const carOptions = comboboxOptions(page);
    await expect(carOptions.first()).toBeVisible();
    await carOptions.first().click();
    await expect(triggers.nth(1)).toContainText('MAD/day');

    // --- Dates ---
    await page.locator('input[name="startDate"]').fill(daysFromToday(1));
    await page.locator('input[name="endDate"]').fill(daysFromToday(5));

    // --- Submit: modal closes immediately (optimistic), success toast follows ---
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.getByRole('heading', { name: 'New booking' })).toBeHidden();
    await expect(page.getByText('Booking Confirmed')).toBeVisible();
  });

  test('combobox shows an empty state when the query matches nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).click();
    await page.locator('button[aria-haspopup="listbox"]').first().click();

    await page.getByPlaceholder('Type to filter...').fill('zzz-no-such-customer');
    await expect(page.getByText('No matching customers')).toBeVisible();
    await expect(comboboxOptions(page)).toHaveCount(0);
  });

  test('blocks submission when the car/customer comboboxes are empty', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).click();

    // Fill the native-required dates so browser validation passes; leave the
    // comboboxes (which aren't native form fields) empty so the JS guard runs.
    await page.locator('input[name="startDate"]').fill(daysFromToday(1));
    await page.locator('input[name="endDate"]').fill(daysFromToday(5));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    // Client-side validation fires a toast and the modal stays open.
    await expect(page.getByText('Missing Fields')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();
  });
});
