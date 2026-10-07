import { test, expect } from '@playwright/test';

test.describe('Command Centre dashboard', () => {
  test('renders the header and KPI cards', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Command center|Centre de commande/i })).toBeVisible();

    // The four KPI cards driven by the react-query command-centre hook.
    await expect(page.getByText('Net revenue · MTD')).toBeVisible();
    await expect(page.getByText(/Fleet utilization/i)).toBeVisible();
    await expect(page.getByText(/Guardian blocks/i)).toBeVisible();
    await expect(page.getByText(/Refusal recoverable/i)).toBeVisible();
  });

  test('shows the seeded fleet total', async ({ page }) => {
    await page.goto('/dashboard');
    // Two cars were seeded. The utilization card shows "<rented>/2"; the rented
    // count may be 0 or 1 depending on whether the booking spec has run, so we
    // assert only the total to stay order-independent.
    await expect(page.getByText(/[0-2]\/2/).first()).toBeVisible();
  });
});
