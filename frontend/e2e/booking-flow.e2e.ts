import { test, expect } from '@playwright/test';
import messages from '../messages/en.json';

/**
 * The daily-driver flow and the whole point of the UX pass: the searchable
 * Combobox selects and the optimistic booking creation.
 */
test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the command centre to finish loading (skeleton -> real UI).
    await expect(page.getByRole('button', { name: messages.commandCentre.newBooking })).toBeVisible();
  });

  test('creates a booking through the comboboxes and closes optimistically', async ({ page }) => {
    await page.getByRole('button', { name: messages.commandCentre.newBooking }).click();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();

    const triggers = page.locator('button[aria-haspopup="listbox"]');

    // --- Customer combobox: opens, is searchable, selects the clean renter ---
    // (explicitly, since a blacklisted "Flagged Renter" is also in the list).
    await triggers.first().click();
    await expect(page.getByPlaceholder(messages.common.filterOptions)).toBeVisible();
    await page.getByPlaceholder(messages.common.filterOptions).fill('Test Renter');
    await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Test Renter' }).first().click();

    // Trigger now reflects the selected customer.
    await expect(triggers.first()).toContainText('Test Renter');

    // --- Car combobox ---
    await triggers.nth(1).click();
    const carOptions = page.locator('[role="listbox"] [role="option"]');
    await expect(carOptions.first()).toBeVisible();
    await carOptions.first().click();
    await expect(triggers.nth(1)).toContainText('/day');

    // --- Dates: dynamically tomorrow to 5 days ahead to always pass HTML5 min constraint ---
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    await page.locator('input[name="startDate"]').fill(start);
    await page.locator('input[name="endDate"]').fill(end);

    // --- Submit: modal closes immediately (optimistic), success toast follows ---
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.getByRole('heading', { name: /New booking/i })).toBeHidden();
    await expect(page.getByText(messages.commandCentre.bookingConfirmed)).toBeVisible();
  });

  test('combobox shows an empty state when the query matches nothing', async ({ page }) => {
    await page.getByRole('button', { name: /New booking/i }).click();
    await page.locator('button[aria-haspopup="listbox"]').first().click();

    await page.getByPlaceholder(messages.common.filterOptions).fill('zzz-no-such-customer');
    await expect(page.getByText('No matching customers')).toBeVisible();
    await expect(page.locator('[role="listbox"] [role="option"]')).toHaveCount(0);
  });

  test('blocks submission when the car/customer comboboxes are empty', async ({ page }) => {
    await page.getByRole('button', { name: /New booking/i }).click();

    // Fill the native-required dates so browser validation passes; leave the
    // comboboxes (which aren't native form fields) empty so the JS guard runs.
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    await page.locator('input[name="startDate"]').fill(start);
    await page.locator('input[name="endDate"]').fill(end);
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    // Client-side validation fires a toast and the modal stays open.
    await expect(page.getByText(messages.commandCentre.missingFields)).toBeVisible();
    await expect(page.getByRole('heading', { name: /New booking/i })).toBeVisible();
  });
});
