import { test, expect, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { futureBookingDates } from './fixtures';

async function completeBookingForm(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'New booking' });
  const triggers = dialog.locator('button[aria-haspopup="listbox"]');
  await triggers.first().click();
  await dialog.getByPlaceholder('Type to filter...').fill('Test Renter');
  await dialog.getByRole('listbox').getByRole('option').filter({ hasText: 'Test Renter' }).click();
  await expect(triggers.first()).toContainText('Test Renter');
  await triggers.nth(1).click();
  const carOptions = dialog.getByRole('listbox').getByRole('option');
  await expect(carOptions.first()).toBeVisible();
  await carOptions.first().click();
  await expect(triggers.nth(1)).toContainText('MAD/day');
  const dates = futureBookingDates();
  await dialog.locator('input[name="startDate"]').fill(dates.start);
  await dialog.locator('input[name="endDate"]').fill(dates.end);
  return { dialog, dates };
}

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'New Booking' })).toBeVisible();
    await page.getByRole('button', { name: 'New Booking' }).click();
    await expect(page.getByRole('dialog', { name: 'New booking' })).toBeVisible();
  });

  test('keeps the form open while saving and closes only after the booking persists', async ({ page }) => {
    const { dialog, dates } = await completeBookingForm(page);
    let releaseRequest: (() => void) | undefined;
    let signalIntercepted: (() => void) | undefined;
    const intercepted = new Promise<void>((resolve) => { signalIntercepted = resolve; });
    await page.route('**/api/bookings', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
        signalIntercepted?.();
      });
      await route.continue();
    });
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/api/bookings') && response.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Confirm booking' }).click();
    await intercepted;
    try {
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.getByText('Booking Confirmed')).toHaveCount(0);
    } finally {
      releaseRequest?.();
    }
    const response = await responsePromise;
    expect(response.ok(), `Booking API returned ${response.status()}`).toBeTruthy();
    const booking = await response.json();
    expect(booking.id).toBeTruthy();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Booking Confirmed')).toBeVisible();

    // A toast alone cannot prove that data was saved in the real database.
    const persisted = await page.request.get(`${API_URL}/bookings/${booking.id}`);
    expect(persisted.ok()).toBeTruthy();
    const savedBooking = await persisted.json();
    expect(savedBooking.customerId).toBe(booking.customerId);
    expect(savedBooking.carId).toBe(booking.carId);
    expect(savedBooking.startDate.slice(0, 10)).toBe(dates.start);
    expect(savedBooking.endDate.slice(0, 10)).toBe(dates.end);
  });

  test('retains entered fields after a server rejects the booking', async ({ page }) => {
    const { dialog, dates } = await completeBookingForm(page);
    let submissions = 0;
    await page.route('**/api/bookings', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      submissions++;
      await route.fulfill({ status: 409, contentType: 'application/json',
        body: JSON.stringify({ message: 'The vehicle is no longer available for these dates.' }) });
    });
    await dialog.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page.getByText('Booking Failed')).toBeVisible();
    await expect(page.getByText('The vehicle is no longer available for these dates.')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="startDate"]')).toHaveValue(dates.start);
    await expect(dialog.locator('input[name="endDate"]')).toHaveValue(dates.end);
    await expect(dialog.locator('button[aria-haspopup="listbox"]').first()).toContainText('Test Renter');
    await expect(page.getByText('Booking Confirmed')).toHaveCount(0);
    expect(submissions).toBe(1);
  });

  test('combobox shows an empty state when the query matches nothing', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'New booking' });
    await dialog.locator('button[aria-haspopup="listbox"]').first().click();
    await dialog.getByPlaceholder('Type to filter...').fill('zzz-no-such-customer');
    await expect(dialog.getByText('No matching customers')).toBeVisible();
    await expect(dialog.getByRole('listbox').getByRole('option')).toHaveCount(0);
  });

  test('blocks submission when the car/customer comboboxes are empty', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'New booking' });
    const dates = futureBookingDates();
    await dialog.locator('input[name="startDate"]').fill(dates.start);
    await dialog.locator('input[name="endDate"]').fill(dates.end);
    await dialog.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page.getByText('Missing Fields')).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
