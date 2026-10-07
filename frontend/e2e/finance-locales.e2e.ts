import { test, expect, type Page } from '@playwright/test';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';
import { formatMoney } from '../src/lib/format';

const catalogs = { en, fr, ar };
const locales = ['en', 'fr', 'ar'] as const;

test.use({ storageState: { cookies: [], origins: [] } });

async function mockFinance(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const customer = { firstName: 'Sara', lastName: 'Test' };
  const car = { brand: 'Renault', model: 'Clio' };
  const responses: Record<string, unknown> = {
    '/auth/me': { user: { id: 'locale-owner', name: 'Test Owner', email: 'locale@example.test', role: 'OWNER', agencyId: 'locale-agency' } },
    '/expenses': [{ id: 'expense-1', category: 'RENT', description: 'Office rent', amount: 1500.25, status: 'PAID', date: '2026-10-06T00:00:00Z' }],
    '/expenses/summary': { total: 1500.25, byCategory: { RENT: 1500.25 }, count: 1 },
    '/payments/recent': [],
    '/payments/pending': [{ id: 'payment-1', amount: 250, method: 'CASH', type: 'INCOME', invoice: { booking: { customer, car } } }],
    '/bookings': [{ id: 'booking-1', customer, car, invoices: [{ id: 'invoice-paid', status: 'PAID', amount: 1500.25 }] }],
  };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const method = route.request().method();
    if (method === 'POST' && ['/expenses', '/payments'].includes(path)) {
      await route.fulfill({ json: { id: 'created', ...route.request().postDataJSON() } });
      return;
    }
    if (method === 'GET' && Object.hasOwn(responses, path)) {
      await route.fulfill({ json: responses[path] });
      return;
    }
    errors.push(`Unexpected API request: ${method} ${path}`);
    await route.fulfill({ status: 500, json: { message: 'Unexpected request' } });
  });
  return errors;
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

for (const locale of locales) {
  for (const mobile of [false, true]) {
    test(`finance ${locale} ${mobile ? 'mobile' : 'desktop'}: translated forms and RTL`, async ({ page, context, baseURL }, testInfo) => {
      const copy = catalogs[locale];
      const errors = await mockFinance(page);
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
      await page.goto('/dashboard/finance');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.getByRole('heading', { name: copy.ownerPages.financialBrain })).toBeVisible();
      await expect(page.getByText('Office rent', { exact: true })).toBeVisible();
      await expect(page.locator('bdi').filter({ hasText: formatMoney(1500.25, locale) }).first()).toBeVisible();
      await expect(page.locator('main [style="width: 100%;"]')).toHaveCount(1);
      await expectNoOverflow(page);

      if (mobile) await page.getByRole('button', { name: copy.common.openMenu }).click();
      const sidebar = page.locator('aside');
      await expect.poll(async () => {
        const bounds = await sidebar.boundingBox();
        return Math.round(bounds?.x ?? -999);
      }).toBe(locale === 'ar' ? (mobile ? 390 : 1440) - 256 : 0);
      if (mobile) await page.getByRole('button', { name: copy.common.closeMenu }).click();
      await page.screenshot({ path: testInfo.outputPath('finance.png'), fullPage: true, animations: 'disabled' });

      await page.getByRole('button', { name: copy.finance.pending, exact: true }).click();
      await expect(page.getByText(copy.finance.methods.CASH, { exact: true })).toBeVisible();
      await expectNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('pending.png'), fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: copy.finance.addExpense }).click();
      const expenseDialog = page.getByRole('dialog', { name: copy.finance.expenseTitle });
      await expect(expenseDialog).toBeVisible();
      await expenseDialog.getByLabel(copy.finance.category, { exact: true }).selectOption('RENT');
      await expenseDialog.getByLabel(copy.finance.amountMad).fill('1500.25');
      await expectNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('expense.png'), fullPage: true, animations: 'disabled' });
      const expenseRequest = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/expenses'));
      await expenseDialog.getByRole('button', { name: copy.finance.confirmExpense }).click();
      expect((await expenseRequest).postDataJSON()).toMatchObject({ category: 'RENT', amount: 1500.25 });
      await expect(page.getByText(copy.finance.expenseSavedTitle, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: copy.common.close, exact: true }).click();

      await page.getByRole('button', { name: copy.finance.recordPayment }).click();
      const paymentDialog = page.getByRole('dialog', { name: copy.finance.paymentTitle });
      await paymentDialog.getByLabel(copy.finance.invoice, { exact: true }).selectOption('invoice-paid');
      await paymentDialog.getByLabel(copy.finance.type, { exact: true }).selectOption('REFUND');
      await paymentDialog.getByLabel(copy.finance.method, { exact: true }).selectOption('TRANSFER');
      await paymentDialog.getByLabel(copy.finance.amountMad).fill('100.50');
      await expectNoOverflow(page);
      const paymentRequest = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/payments'));
      await paymentDialog.getByRole('button', { name: copy.finance.confirmPayment }).click();
      expect((await paymentRequest).postDataJSON()).toMatchObject({ invoiceId: 'invoice-paid', type: 'REFUND', method: 'TRANSFER', amount: 100.5 });
      await expect(page.getByText(copy.finance.refundSavedTitle, { exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test.describe(`initial language negotiation: ${locale}`, () => {
    test.use({ locale: `${locale}-MA`, extraHTTPHeaders: { 'Accept-Language': `${locale}-MA,fr;q=0.5` } });
    test('uses the browser language on first visit', async ({ page, context }) => {
      const errors = await mockFinance(page);
      await page.goto('/dashboard/finance');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { name: catalogs[locale].ownerPages.financialBrain })).toBeVisible();
      expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')?.value).toBe(locale);
      expect(errors).toEqual([]);
    });
  });

  test(`theme and role labels in ${locale}`, async ({ page, context, baseURL }) => {
    const errors = await mockFinance(page);
    const copy = catalogs[locale];
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard/finance');
    await expect(page.locator('aside').getByText(copy.roles.OWNER, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: copy.theme.current.replace('{name}', 'Fider Lux') }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'titan');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'titan');
    await page.getByRole('button', { name: copy.theme.current.replace('{name}', 'Titan Cyber') }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'fider');
    expect(errors).toEqual([]);
  });
}

test('language switching refreshes forms and persists after reload', async ({ page, context, baseURL }) => {
  const errors = await mockFinance(page);
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: baseURL! }]);
  await page.goto('/dashboard/finance');
  let previousLocale: keyof typeof catalogs = 'en';
  for (const locale of ['ar', 'fr', 'en'] as const) {
    await page.getByRole('combobox', { name: catalogs[previousLocale].common.language }).selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await page.getByRole('button', { name: catalogs[locale].finance.addExpense }).click();
    await expect(page.getByRole('dialog', { name: catalogs[locale].finance.expenseTitle })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: catalogs[locale].common.close, exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    previousLocale = locale;
  }
  expect(errors).toEqual([]);
});
