import { test, expect, type Page } from '@playwright/test';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';
import { formatNumber } from '../src/lib/format';

const catalogs = { en, fr, ar };
const locales = ['en', 'fr', 'ar'] as const;
const statuses = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE', 'FUTURE_STATUS', 'AVAILABLE', 'AVAILABLE'];

test.use({ storageState: { cookies: [], origins: [] } });

async function mockOperations(page: Page, options: { empty?: boolean; fail?: boolean } = {}) {
  const errors: string[] = [];
  const state = { fail: options.fail ?? false, taskRequests: 0 };
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text());
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') {
      await route.fulfill({ json: { user: { id: 'locale-agent', name: 'Test Agent', role: 'AGENT', agencyId: 'locale-agency' } } });
    } else if (path === '/tasks') {
      state.taskRequests += 1;
      await route.fulfill(state.fail ? { status: 503, json: { message: 'Internal server failure' } } : {
        json: options.empty ? [] : Array.from({ length: 7 }, (_, index) => ({
          id: `task-${index}`, title: `Customer task ${index}`, description: 'Customer-entered details',
          priority: index === 0 ? 'LOW' : index === 1 ? 'URGENT' : 'HIGH',
        })),
      });
    } else if (path === '/cars') {
      await route.fulfill({ json: options.empty ? [] : statuses.map((status, index) => ({
        id: `car-${index}`, brand: 'Renault', model: `Clio ${index}`, licensePlate: `1234-A-${index + 1}`, status,
      })) });
    } else {
      errors.push(`Unexpected API request: ${path}`);
      await route.fulfill({ status: 500, json: {} });
    }
  });
  return { errors, state };
}

for (const locale of locales) {
  const copy = catalogs[locale];
  for (const mobile of [false, true]) {
    test(`agent ${locale} ${mobile ? 'mobile' : 'desktop'}: truthful statuses and localized summary`, async ({ page, context, baseURL }, testInfo) => {
      const { errors } = await mockOperations(page);
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
      await page.goto('/agent');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      const main = page.locator('main');
      await expect(main.getByText(copy.agentOps.summaryScope, { exact: true })).toBeVisible();
      for (const label of [copy.agentOps.maintenance, copy.agentOps.outOfService, copy.agentOps.statusUnknown, copy.agentTasks.urgent]) {
        await expect(main.getByText(label, { exact: true })).toBeVisible();
      }
      await expect(main.getByText(copy.agentTasks.high, { exact: true })).toHaveCount(4);
      await expect(main.getByText(copy.agentOps.cleaning, { exact: true })).toHaveCount(0);
      await expect(main.getByText(/^(URGENT|HIGH|FUTURE_STATUS)$/)).toHaveCount(0);
      await expect(main.getByText('Customer task 0', { exact: true })).toHaveCount(0);
      await expect(main.getByText('Customer task 6', { exact: true })).toHaveCount(0);
      await expect(main.getByText('Clio 6', { exact: false })).toHaveCount(0);
      for (const [label, count] of [[copy.agentOps.priorityTasks, 5], [copy.agentOps.available, 2], [copy.agentOps.rented, 1], [copy.agentOps.unavailable, 3]] as const) {
        await expect(main.getByText(label, { exact: true }).first().locator('../..').getByText(formatNumber(count, locale), { exact: true })).toBeVisible();
      }
      await expect(main.locator('bdi[dir="ltr"]')).toHaveCount(6);
      await expect(main.locator('bdi[dir="ltr"]').first()).toHaveText('1234-A-1');
      await expect(main.getByRole('button', { name: copy.agentOps.scanQr })).toBeDisabled();
      expect(await main.locator('.eyebrow').evaluateAll((labels) => labels.every((label) => label.scrollWidth <= label.clientWidth + 1))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath('agent.png'), fullPage: true, animations: 'disabled' });
      expect(errors).toEqual([]);
    });
  }

  test(`agent ${locale}: localized failure and retry without false empty data`, async ({ page, context, baseURL }) => {
    const { errors, state } = await mockOperations(page, { fail: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/agent');
    await expect(page.getByText(copy.agentOps.loadFailedTitle, { exact: true })).toBeVisible();
    await expect(page.locator('main').getByRole('alert')).toContainText(copy.agentOps.loadFailed);
    await expect(page.getByText(copy.agentOps.noTasks, { exact: true })).toHaveCount(0);
    await expect(page.getByText(copy.agentOps.summaryScope, { exact: true })).toHaveCount(0);
    await expect(page.getByText('Internal server failure', { exact: true })).toHaveCount(0);
    const requestsBeforeRetry = state.taskRequests;
    state.fail = false;
    await page.getByRole('button', { name: copy.agentOps.retry, exact: true }).click();
    await expect(page.getByText(copy.agentOps.summaryScope, { exact: true })).toBeVisible();
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
    expect(state.taskRequests).toBeGreaterThan(requestsBeforeRetry);
    expect(errors).toEqual([]);
  });

  test(`agent ${locale}: genuine empty agency feedback`, async ({ page, context, baseURL }) => {
    const { errors } = await mockOperations(page, { empty: true });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/agent');
    await expect(page.getByText(copy.agentOps.noTasks, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.agentOps.noVehicles, { exact: true })).toBeVisible();
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
