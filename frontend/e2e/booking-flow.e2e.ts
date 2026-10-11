import { test, expect } from '@playwright/test';

/**
 * The daily-driver flow and the whole point of the UX pass: the searchable
 * Combobox selects and the optimistic booking creation.
 */
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
    await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Test Renter' }).first().click();

    // Trigger now reflects the selected customer.
    await expect(triggers.first()).toContainText('Test Renter');

    // --- Car combobox ---
    await triggers.nth(1).click();
    const carOptions = page.locator('[role="listbox"] [role="option"]');
    await expect(carOptions.first()).toBeVisible();
    await carOptions.first().click();
    await expect(triggers.nth(1)).toContainText('MAD/day');

    // --- Dates ---
    const now = new Date();
    const startStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
    const endStr = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10);
    await page.locator('input[name="startDate"]').fill(startStr);
    await page.locator('input[name="endDate"]').fill(endStr);

    // --- Submit: modal closes immediately (optimistic), success toast follows ---
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.getByRole('heading', { name: 'New booking' })).toBeHidden();
    await expect(page.getByText('Booking Confirmed')).toBeVisible();
  });

  test('combobox shows an empty state when the query matches nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).first().click();
    await page.locator('button[aria-haspopup="listbox"]').first().click();

    await page.getByPlaceholder('Type to filter...').fill('zzz-no-such-customer');
    await expect(page.getByText('No matching customers')).toBeVisible();
    await expect(page.locator('[role="listbox"] [role="option"]')).toHaveCount(0);
  });

  test('blocks submission when the car/customer comboboxes are empty', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).first().click();

    // Fill the native-required dates so browser validation passes; leave the
    // comboboxes (which aren't native form fields) empty so the JS guard runs.
    const now = new Date();
    const startStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
    const endStr = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10);
    await page.locator('input[name="startDate"]').fill(startStr);
    await page.locator('input[name="endDate"]').fill(endStr);
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    // Client-side validation fires a toast and the modal stays open.
    await expect(page.getByText('Missing Fields')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();
  });
});
