import { test, expect } from '@playwright/test';

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The daily-driver flow and the whole point of the UX pass: the searchable
 * Combobox selects and the optimistic booking creation.
 */
test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'New Booking' })).toBeVisible();
  });

  test('creates a booking through the comboboxes and closes optimistically', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).click();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();

    const triggers = page.locator('button[aria-haspopup="listbox"]');

    await triggers.first().click();
    await expect(page.getByPlaceholder('Type to filter...')).toBeVisible();
    await page.getByPlaceholder('Type to filter...').fill('Test Renter');
    await page
      .getByRole('listbox')
      .getByRole('option')
      .filter({ hasText: 'Test Renter' })
      .first()
      .click();

    await expect(triggers.first()).toContainText('Test Renter');

    await triggers.nth(1).click();
    const carOptions = page.getByRole('listbox').getByRole('option');
    await expect(carOptions.first()).toBeVisible();
    await carOptions.first().click();
    await expect(triggers.nth(1)).toContainText('MAD/day');

    await page.locator('input[name="startDate"]').fill(dateFromToday(30));
    await page.locator('input[name="endDate"]').fill(dateFromToday(34));

    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.getByRole('heading', { name: 'New booking' })).toBeHidden();
    await expect(page.getByText('Booking confirmed', { exact: false })).toBeVisible();
  });

  test('combobox shows an empty state when the query matches nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).click();
    await page.locator('button[aria-haspopup="listbox"]').first().click();

    await page.getByPlaceholder('Type to filter...').fill('zzz-no-such-customer');
    await expect(page.getByText('No matching customers')).toBeVisible();
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(0);
  });

  test('blocks submission when the car/customer comboboxes are empty', async ({ page }) => {
    await page.getByRole('button', { name: 'New Booking' }).click();

    // Dates must be valid and in the future so browser-native min validation
    // does not prevent the form submit handler from exercising the JS guard.
    await page.locator('input[name="startDate"]').fill(dateFromToday(40));
    await page.locator('input[name="endDate"]').fill(dateFromToday(44));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.getByText(/Missing fields/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();
  });
});
