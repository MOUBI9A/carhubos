import { test, expect, type Page, type Locator } from '@playwright/test';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';
import { formatMoney, formatNumber } from '../src/lib/format';

const catalogs = { en, fr, ar };
const locales = ['en', 'fr', 'ar'] as const;
const statuses = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE', 'FUTURE_STATUS'];

test.use({ storageState: { cookies: [], origins: [] } });

async function mockFleet(page: Page) {
  const errors: string[] = [];
  const state = { failLoad: false, empty: false, postStatus: 201, code: '', posts: [] as Record<string, unknown>[], holdPost: false };
  let releasePost: () => void = () => {};
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource|Fleet fetch error/.test(message.text())) errors.push(message.text());
  });
  const cars = statuses.map((status, index) => ({
    id: `car-${index}`, brand: 'Renault', model: `Clio ${index}`, licensePlate: `1234-A-${index + 1}`,
    status, year: 2024, mileage: 12500, currentRoi: 12.5, pricePerDay: 350.25,
    documents: index === 0 ? [{ id: 'valid', status: 'VALID' }, { id: 'expiring', status: 'EXPIRING_SOON' }] : [],
  }));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') {
      await route.fulfill({ json: { user: { id: 'fleet-owner', name: 'Fleet Owner', role: 'OWNER', agencyId: 'fleet-agency' } } });
    } else if (path === '/cars' && route.request().method() === 'POST') {
      state.posts.push(route.request().postDataJSON());
      if (state.holdPost) await new Promise<void>((resolve) => { releasePost = resolve; });
      await route.fulfill({ status: state.postStatus, json: state.postStatus === 201 ? { id: 'created' } : { code: state.code, message: 'Untranslated backend failure' } });
    } else if (path === '/cars') {
      await route.fulfill(state.failLoad ? { status: 503, json: { message: 'Untranslated backend failure' } } : { json: state.empty ? [] : cars });
    } else {
      errors.push(`Unexpected request ${path}`);
      await route.fulfill({ status: 500, json: {} });
    }
  });
  return { errors, state, release: () => releasePost() };
}

async function fillVehicle(dialog: Locator, copy: typeof en.fleetList) {
  await dialog.getByLabel(copy.brand, { exact: true }).fill(' Dacia ');
  await dialog.getByLabel(copy.model, { exact: true }).fill(' Logan ');
  await dialog.getByLabel(copy.plate, { exact: true }).fill('9876-b-2');
  await dialog.getByLabel(copy.year, { exact: true }).fill('2024');
  await dialog.getByLabel(copy.rate, { exact: true }).fill('350.25');
  await dialog.getByLabel(copy.fuel, { exact: true }).selectOption('PETROL');
  await dialog.getByLabel(copy.gearbox, { exact: true }).selectOption('AUTOMATIC');
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
}

for (const locale of locales) {
  const copy = catalogs[locale].fleetList;
  for (const mobile of [false, true]) {
    test(`fleet ${locale} ${mobile ? 'mobile' : 'desktop'}: cards, filters and registration`, async ({ page, context, baseURL }, testInfo) => {
      const { errors, state, release } = await mockFleet(page);
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
      await page.goto('/dashboard/fleet');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      const main = page.locator('main');
      const firstCar = main.getByRole('link').filter({ hasText: 'Renault Clio 0' });
      await expect(firstCar.getByText(copy.perDay.replace('{amount}', formatMoney(350.25, locale)), { exact: true })).toBeVisible();
      await expect(firstCar.getByText(copy.distance.replace('{value}', formatNumber(12500, locale)), { exact: true })).toBeVisible();
      await expect(firstCar.getByText(formatNumber(0.75, locale, { style: 'percent' }), { exact: true })).toBeVisible();
      await expect(firstCar.locator('[style="width: 75%;"]')).toHaveCount(1);
      await expect(firstCar.locator('bdi[dir="ltr"]')).toHaveText('1234-A-1');
      await expect(main.getByText(copy.unknownStatus, { exact: true })).toBeVisible();
      await expectNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('fleet.png'), fullPage: true, animations: 'disabled' });

      const filters = main.getByRole('group', { name: copy.filterStatus });
      await filters.getByRole('button', { name: copy.statuses.RENTED, exact: true }).click();
      await expect(main.getByRole('link').filter({ hasText: 'Renault Clio' })).toHaveCount(1);
      await expect(main.getByText('Renault Clio 1', { exact: true })).toBeVisible();
      await main.getByRole('textbox', { name: copy.search }).fill('does-not-exist');
      await expect(main.getByText(copy.noResults, { exact: true })).toBeVisible();
      await main.getByRole('button', { name: copy.clearFilters }).click();
      await expect(main.getByRole('link').filter({ hasText: 'Renault Clio' })).toHaveCount(5);

      await main.getByRole('button', { name: copy.addVehicle, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: copy.registerVehicle });
      await fillVehicle(dialog, copy);
      await expect(dialog.getByLabel(copy.plate, { exact: true })).toHaveAttribute('dir', 'ltr');
      await expectNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('registration.png'), fullPage: true, animations: 'disabled' });
      await dialog.getByRole('button', { name: copy.registerVehicle, exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('registration-actions.png'), animations: 'disabled' });
      state.holdPost = true;
      await dialog.getByRole('button', { name: copy.registerVehicle, exact: true }).click();
      await expect.poll(() => state.posts.length).toBe(1);
      await expect(dialog.getByRole('button', { name: copy.registering, exact: true })).toBeDisabled();
      await expect(dialog.getByLabel(copy.brand, { exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      release();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText(copy.registeredTitle, { exact: true })).toBeVisible();
      expect(state.posts).toEqual([{ brand: 'Dacia', model: 'Logan', year: 2024, licensePlate: '9876-B-2', pricePerDay: 350.25, fuelType: 'PETROL', gearbox: 'AUTOMATIC' }]);
      expect(errors).toEqual([]);
    });
  }

  test(`fleet ${locale}: validation and localized server failures preserve inputs`, async ({ page, context, baseURL }) => {
    const { errors, state } = await mockFleet(page);
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard/fleet');
    await page.getByRole('button', { name: copy.addVehicle, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: copy.registerVehicle });
    const submit = dialog.getByRole('button', { name: copy.registerVehicle, exact: true });
    await submit.click();
    await expect(page.getByText(copy.missingFields, { exact: true })).toBeVisible();
    await fillVehicle(dialog, copy);
    await dialog.getByLabel(copy.year, { exact: true }).fill('2024.5');
    await submit.click();
    await expect(page.getByText(copy.invalidYear, { exact: true })).toBeVisible();
    await dialog.getByLabel(copy.year, { exact: true }).fill('2024');
    for (const rate of ['0', '350.001', '10000000000']) {
      await dialog.getByLabel(copy.rate, { exact: true }).fill(rate);
      await submit.click();
      await expect(page.getByText(copy.invalidRate, { exact: true }).last()).toBeVisible();
    }
    expect(state.posts).toHaveLength(0);
    await dialog.getByLabel(copy.rate, { exact: true }).fill('350.25');
    for (const [status, code, message] of [[409, '', copy.duplicatePlate], [403, '', copy.forbidden], [403, 'PLAN_LIMIT_REACHED', copy.planLimit], [429, '', copy.rateLimited], [503, '', copy.registerFailed]] as const) {
      state.postStatus = status;
      state.code = code;
      await submit.click();
      await expect(page.getByText(message, { exact: true })).toBeVisible();
      await expect(dialog.getByLabel(copy.model, { exact: true })).toHaveValue(' Logan ');
      await expect(dialog.getByLabel(copy.rate, { exact: true })).toHaveValue('350.25');
      await expect(page.getByText('Untranslated backend failure', { exact: true })).toHaveCount(0);
    }
    state.postStatus = 201;
    await submit.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(copy.registeredTitle, { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`fleet ${locale}: load failure, retry and empty state`, async ({ page, context, baseURL }) => {
    const { errors, state } = await mockFleet(page);
    state.failLoad = true;
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard/fleet');
    await expect(page.locator('main').getByRole('alert')).toHaveText(copy.loadFailed);
    await expect(page.getByText('Untranslated backend failure', { exact: true })).toHaveCount(0);
    state.failLoad = false;
    state.empty = true;
    await page.getByRole('button', { name: copy.retry }).click();
    await expect(page.getByText(copy.emptyTitle, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: copy.addFirst }).click();
    await expect(page.getByRole('dialog', { name: copy.registerVehicle })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('fleet language switching updates money, filters and form labels', async ({ page, context, baseURL }) => {
  const { errors } = await mockFleet(page);
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: baseURL! }]);
  await page.goto('/dashboard/fleet');
  let previousLocale: keyof typeof catalogs = 'en';
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const copy = catalogs[locale].fleetList;
    await page.getByRole('combobox', { name: catalogs[previousLocale].common.language }).selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('main').getByText(copy.perDay.replace('{amount}', formatMoney(350.25, locale)), { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: copy.addVehicle, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: copy.registerVehicle });
    await expect(dialog.getByLabel(copy.rate, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: copy.cancel, exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('group', { name: copy.filterStatus })).toBeVisible();
    previousLocale = locale;
  }
  expect(errors).toEqual([]);
});
