import { test, expect, type Page } from '@playwright/test';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';
import type { CommandCentreData } from '../src/app/(owner)/dashboard/useCommandCentre';
import { formatMoney } from '../src/lib/format';

const catalogs = { en, fr, ar };
const emptyData: CommandCentreData = {
  revenue: { mtd: 0, growth: 0 }, utilization: { percent: 0 },
  guardianBlocks: [], refusal: { count: 0, recoverable: 0 }, dailyIntensity: [],
  starAsset: null, liveActivity: [], availableCars: [], customers: [],
  activeRentals: 0, totalCustomers: 0,
  fleet: { total: 0, available: 0, rented: 0, maintenance: 0, outOfService: 0 },
};
const data: CommandCentreData = {
  revenue: { mtd: 12345.67, growth: 12.5 }, utilization: { percent: 50 },
  guardianBlocks: [{ id: 'document-1', car: 'Renault Clio', plate: '12345-A-6', type: 'INSURANCE', risk: 'EXPIRED', severity: 'danger', carId: 'car-1' }],
  refusal: { count: 3, recoverable: 1500 },
  dailyIntensity: [{ date: '2026-10-01', label: 'Thu 1', bookings: 2, revenue: 1200 }, { date: '2026-10-02', label: 'Fri 2', bookings: 1, revenue: 800 }],
  starAsset: { id: 'car-1', brand: 'Renault', model: 'Clio', plate: '12345-A-6', roi: 15.5, status: 'AVAILABLE', totalRevenue: 45678.9 },
  liveActivity: [{ id: 'activity-1', user: 'System', role: 'SYSTEM', action: 'Car Updated', entityType: 'CAR', entityId: 'car-1', time: '3h' }],
  availableCars: [{ id: 'car-2', label: 'Dacia Logan (789-B-6)', pricePerDay: 350.5 }],
  customers: [{ id: 'customer-1', label: 'Sara Test', phone: '0600000000' }],
  activeRentals: 1, totalCustomers: 1,
  fleet: { total: 2, available: 1, rented: 1, maintenance: 0, outOfService: 0 },
};

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function mockDashboard(page: Page, options: { failFirstTask?: boolean; failFirstBooking?: boolean; failFirstCustomer?: boolean; blocked?: boolean; forbidOverride?: boolean; data?: CommandCentreData } = {}) {
  const taskPayloads: unknown[] = [];
  const bookingPayloads: unknown[] = [];
  const customerPayloads: unknown[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/auth/me') return route.fulfill({ json: { user: { id: 'owner-1', name: 'Test Owner', role: 'OWNER', agencyId: 'agency-1' } } });
    if (pathname === '/api/analytics/command-centre') return route.fulfill({ json: options.data ?? data });
    if (pathname === '/api/trust/assess') return route.fulfill({ json: {
      identity: { masked: '**123', type: 'CIN' }, status: options.blocked ? 'BLACKLISTED' : 'NEW', riskLevel: options.blocked ? 'CRITICAL' : 'UNKNOWN', blocked: !!options.blocked,
      globalScore: 0, reviewCount: 0, agencyCount: 0, activeFlagCount: 0, depositMultiplier: null,
      recommendation: 'Untranslated backend recommendation', tags: [], history: [], flags: [], latestReview: null,
    } });
    if (pathname === '/api/tasks' && request.method() === 'POST') {
      taskPayloads.push(request.postDataJSON());
      return options.failFirstTask && taskPayloads.length === 1
        ? route.fulfill({ status: 500, json: { message: 'Task database unavailable' } })
        : route.fulfill({ json: { id: 'task-1', ...request.postDataJSON() } });
    }
    if (pathname === '/api/bookings' && request.method() === 'POST') {
      bookingPayloads.push(request.postDataJSON());
      if (options.forbidOverride) return route.fulfill({ status: 403, json: { code: 'TRUST_OVERRIDE_FORBIDDEN', message: 'Only an agency owner or manager can override a renter trust block.' } });
      if (options.failFirstBooking && bookingPayloads.length === 1) return route.fulfill({ status: 409, json: { message: 'Vehicle unavailable' } });
      return route.fulfill({ json: { id: 'booking-1' } });
    }
    if (pathname === '/api/customers' && request.method() === 'POST') {
      customerPayloads.push(request.postDataJSON());
      if (options.failFirstCustomer && customerPayloads.length === 1) return route.fulfill({ status: 500, json: { message: 'Database unavailable' } });
      return route.fulfill({ json: { id: 'walk-in-1', ...request.postDataJSON() } });
    }
    errors.push(`Unexpected API request: ${request.method()} ${pathname}`);
    return route.fulfill({ status: 500, json: {} });
  });
  return { taskPayloads, bookingPayloads, customerPayloads, errors };
}

test('dashboard amounts update when the language changes without a reload', async ({ page, context, baseURL }) => {
  await mockDashboard(page);
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: baseURL! }]);
  await page.goto('/dashboard');
  await expect(page.getByText(formatMoney(data.revenue.mtd, 'en'), { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: en.common.language }).selectOption('fr');
  await expect(page.getByText(formatMoney(data.revenue.mtd, 'fr'), { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: fr.common.language }).selectOption('ar');
  await expect(page.getByText(formatMoney(data.revenue.mtd, 'ar'), { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

for (const locale of ['en', 'fr', 'ar'] as const) {
  for (const forbidden of [false, true]) {
    test(`blocked renter override ${forbidden ? 'denial' : 'confirmation'} in ${locale}`, async ({ page, context, baseURL }, testInfo) => {
      const copy = catalogs[locale];
      const { bookingPayloads, errors } = await mockDashboard(page, {
        blocked: true, forbidOverride: forbidden,
        data: { ...data, totalCustomers: 2, customers: [...data.customers, { id: 'customer-2', label: 'Omar Test', phone: '0600000002' }] },
      });
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
      await page.setViewportSize(forbidden ? { width: 1440, height: 1000 } : { width: 390, height: 844 });
      await page.goto('/dashboard');
      await page.getByRole('button', { name: copy.commandCentre.newBooking, exact: true }).click();
      const booking = page.getByRole('dialog', { name: copy.commandCentre.newBooking });
      await booking.getByRole('button', { name: copy.commandCentre.selectCustomer }).click();
      await booking.getByRole('option', { name: /Sara Test/ }).click();
      const reason = booking.getByLabel(copy.riskAssessment.overrideRequired, { exact: true });
      await expect(reason).toBeVisible();
      await booking.getByRole('button', { name: copy.commandCentre.selectVehicle }).click();
      await booking.getByRole('option', { name: /Dacia Logan/ }).click();
      await booking.getByLabel(copy.commandCentre.startDate, { exact: true }).fill('2099-10-01');
      await booking.getByLabel(copy.commandCentre.endDate, { exact: true }).fill('2099-10-03');
      await reason.fill('   ');
      await booking.getByRole('button', { name: copy.commandCentre.bookingLocked, exact: true }).click();
      await expect(page.getByText(copy.commandCentre.renterBlockedBody, { exact: true })).toBeVisible();
      expect(bookingPayloads).toHaveLength(0);
      await reason.fill('Reason for the previous renter');
      await booking.getByRole('button', { name: /Sara Test/ }).click();
      await booking.getByRole('option', { name: /Omar Test/ }).click();
      await expect(reason).toHaveValue('');
      await booking.getByRole('button', { name: /Omar Test/ }).click();
      await booking.getByRole('option', { name: /Sara Test/ }).click();
      await expect(reason).toHaveValue('');
      await reason.fill('  Identity and deposit verified  ');
      if (!forbidden) {
        const rate = await booking.getByText(copy.commandCentre.dailyRate, { exact: true }).locator('..').boundingBox();
        const tax = await booking.getByText(copy.commandCentre.taxIncluded, { exact: true }).boundingBox();
        expect(rate).not.toBeNull();
        expect(tax!.y).toBeGreaterThan(rate!.y + rate!.height);
      }
      await page.screenshot({ path: testInfo.outputPath('blocked-booking.png'), fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await booking.getByRole('button', { name: copy.commandCentre.overrideConfirm, exact: true }).click();
      await expect(page.getByText(forbidden ? copy.commandCentre.overrideForbidden : copy.commandCentre.bookingConfirmed, { exact: true })).toBeVisible();
      expect(bookingPayloads).toEqual([{
        carId: 'car-2', customerId: 'customer-1', startDate: '2099-10-01', endDate: '2099-10-03',
        overrideReason: 'Identity and deposit verified',
      }]);
      if (forbidden) {
        await expect(booking).toBeVisible();
        await expect(reason).toHaveValue('  Identity and deposit verified  ');
        await expect(page.getByText(copy.commandCentre.bookingConfirmed, { exact: true })).toHaveCount(0);
        await expect(page.getByText('Only an agency owner or manager can override a renter trust block.')).toHaveCount(0);
      } else {
        await expect(booking).toHaveCount(0);
      }
      expect(errors).toEqual([]);
    });
  }

  test(`warning-only guardian is accurate and keyboard accessible in ${locale}`, async ({ page, context, baseURL }) => {
    const copy = catalogs[locale].commandCentre;
    const { taskPayloads, errors } = await mockDashboard(page, { data: {
      ...data, guardianBlocks: [{ ...data.guardianBlocks[0], severity: 'warning', risk: '7 DAYS LEFT' }],
    } });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard');
    const metric = page.getByRole('button').filter({ hasText: copy.guardianBlocks });
    await expect(metric).toContainText(copy.Warning);
    await expect(metric).not.toContainText(copy.Critical);
    await metric.focus();
    await page.keyboard.press('Enter');
    const guardian = page.getByRole('dialog', { name: copy.guardianTitle });
    await expect(guardian.getByText(copy.warningAction, { exact: true })).toBeVisible();
    await guardian.getByRole('button', { name: catalogs[locale].common.close, exact: true }).click();
    const alert = page.getByRole('button').filter({ hasText: copy.resolve }).filter({ hasText: 'Renault Clio' });
    await alert.focus();
    await page.keyboard.press('Space');
    await expect(guardian).toBeVisible();
    await guardian.getByRole('button', { name: copy.createRenewal }).click();
    await expect(page.getByText(copy.taskCreated, { exact: true })).toBeVisible();
    expect(taskPayloads).toEqual([expect.objectContaining({ priority: 'HIGH' })]);
    expect(errors).toEqual([]);
  });

  test(`walk-in validation and failed registration retry in ${locale}`, async ({ page, context, baseURL }) => {
    const copy = catalogs[locale].commandCentre;
    const { customerPayloads, errors } = await mockDashboard(page, { failFirstCustomer: true });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: copy.newBooking, exact: true }).click();
    const booking = page.getByRole('dialog', { name: copy.newBooking });
    await booking.getByRole('button', { name: copy.walkIn }).click();
    await booking.getByRole('button', { name: copy.registerSelect }).click();
    await expect(page.getByText(copy.registrationRequired, { exact: true })).toBeVisible();
    expect(customerPayloads).toHaveLength(0);
    await booking.getByLabel(copy.firstName, { exact: true }).fill('  Amine  ');
    await booking.getByLabel(copy.lastName, { exact: true }).fill('  Test  ');
    await booking.getByLabel(copy.phone, { exact: true }).fill('0600000001');
    await booking.getByLabel(copy.identity, { exact: true }).fill('AB12345');
    await booking.getByRole('button', { name: copy.registerSelect }).click();
    await expect(page.getByText(copy.registrationFailedBody, { exact: true })).toBeVisible();
    await expect(booking.getByLabel(copy.firstName, { exact: true })).toHaveValue('  Amine  ');
    await booking.getByRole('button', { name: copy.registerSelect }).click();
    await expect(page.getByText(copy.customerRegistered, { exact: true })).toBeVisible();
    await expect(booking.getByRole('button', { name: /Amine Test/ })).toBeVisible();
    await expect(booking.getByLabel(copy.firstName, { exact: true })).toHaveCount(0);
    expect(customerPayloads).toEqual(Array(2).fill({
      firstName: 'Amine', lastName: 'Test', phone: '0600000001', identityType: 'CIN', identityNumber: 'AB12345',
    }));
    expect(errors).toEqual([]);
  });

  test(`booking date validation and failed request preserve inputs in ${locale}`, async ({ page, context, baseURL }) => {
    const copy = catalogs[locale].commandCentre;
    const { bookingPayloads, errors } = await mockDashboard(page, { failFirstBooking: true });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: copy.newBooking, exact: true }).click();
    const booking = page.getByRole('dialog', { name: copy.newBooking });
    await booking.getByRole('button', { name: copy.selectCustomer }).click();
    await booking.getByRole('option', { name: /Sara Test/ }).click();
    await booking.getByRole('button', { name: copy.selectVehicle }).click();
    await booking.getByRole('option', { name: /Dacia Logan/ }).click();
    await booking.getByLabel(copy.startDate, { exact: true }).fill('2099-10-03');
    await booking.getByLabel(copy.endDate, { exact: true }).fill('2099-10-01');
    await booking.getByRole('button', { name: copy.confirmBooking, exact: true }).click();
    await expect(page.getByText(copy.invalidDatesBody, { exact: true })).toBeVisible();
    expect(bookingPayloads).toHaveLength(0);
    await booking.getByLabel(copy.endDate, { exact: true }).fill('2099-10-05');
    await booking.getByRole('button', { name: copy.confirmBooking, exact: true }).click();
    await expect(page.getByText(copy.bookingFailedBody, { exact: true })).toBeVisible();
    await expect(booking).toBeVisible();
    await expect(booking.getByLabel(copy.startDate, { exact: true })).toHaveValue('2099-10-03');
    await expect(booking.getByRole('button', { name: /Sara Test/ })).toBeVisible();
    await expect(booking.getByRole('button', { name: /Dacia Logan/ })).toBeVisible();
    await booking.getByRole('button', { name: copy.confirmBooking, exact: true }).click();
    await expect(page.getByText(copy.bookingConfirmed, { exact: true })).toBeVisible();
    expect(bookingPayloads).toEqual(Array(2).fill({
      carId: 'car-2', customerId: 'customer-1', startDate: '2099-10-03', endDate: '2099-10-05',
    }));
    expect(errors).toEqual([]);
  });

  test(`dashboard load failure can reconnect to an empty agency in ${locale}`, async ({ page, context, baseURL }) => {
    const copy = catalogs[locale].commandCentre;
    const { errors } = await mockDashboard(page, { data: emptyData });
    let offline = true;
    await page.route('**/api/analytics/command-centre', async (route) => offline
      ? route.fulfill({ status: 503, json: { message: 'Backend unavailable' } })
      : route.fallback());
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard');
    await expect(page.getByText(copy.loadFailed, { exact: true })).toBeVisible();
    offline = false;
    await page.getByRole('button', { name: copy.reconnect }).click();
    await expect(page.getByText(copy.noFleet, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.noActivity, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.fleetCompliant, { exact: true })).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: copy.guardianBlocks })).toContainText(copy.clear);
    expect(errors).toEqual([]);
  });

  for (const mobile of [false, true]) {
    test(`command centre ${locale} ${mobile ? 'mobile' : 'desktop'}`, async ({ page, context, baseURL }, testInfo) => {
      const copy = catalogs[locale];
      const { taskPayloads, bookingPayloads, errors } = await mockDashboard(page);
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: copy.ownerPages.commandCenter, exact: true })).toBeVisible();
      await expect(page.getByText(formatMoney(data.revenue.mtd, locale), { exact: true })).toBeVisible();
      await expect(page.getByText(copy.commandCentre.activityCarUpdated, { exact: true })).toBeVisible();
      await expect(page.getByText(copy.commandCentre.hoursAgo.replace('{count}', '3'), { exact: true })).toBeVisible();
      await expect(page.getByText(copy.commandCentre.INSURANCE, { exact: false }).first()).toBeVisible();
      const plateLabels = page.locator('bdi').filter({ hasText: /^12345-A-6$/ });
      await expect(plateLabels).toHaveCount(2);
      for (const plateLabel of await plateLabels.all()) await expect(plateLabel).toHaveAttribute('dir', 'ltr');
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth - innerWidth,
        elements: [...document.querySelectorAll('main *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 80) })).slice(-12),
      }));
      expect(overflow.width, JSON.stringify(overflow.elements)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true, animations: 'disabled' });
      expect((await page.locator('figure [style="height: 100%;"]').boundingBox())?.height).toBeGreaterThan(50);

      await page.getByText(copy.commandCentre.resolve, { exact: true }).click();
      const guardian = page.getByRole('dialog', { name: copy.commandCentre.guardianTitle });
      await guardian.getByRole('button', { name: copy.commandCentre.createRenewal }).click();
      await expect(page.getByText(copy.commandCentre.taskCreated, { exact: true })).toBeVisible();
      expect(taskPayloads).toHaveLength(1);
      expect(taskPayloads[0]).toMatchObject({ priority: 'URGENT' });
      expect(JSON.stringify(taskPayloads[0])).toContain('Renault Clio');
      expect(JSON.stringify(taskPayloads[0])).not.toContain('agencyId');
      await page.getByRole('button', { name: copy.common.close, exact: true }).click();

      await page.getByRole('button', { name: copy.commandCentre.newBooking, exact: true }).click();
      const booking = page.getByRole('dialog', { name: copy.commandCentre.newBooking });
      await booking.getByRole('button', { name: copy.commandCentre.selectCustomer }).click();
      await booking.getByRole('option', { name: /Sara Test/ }).click();
      await expect(booking.getByText(copy.riskAssessment.noHistory, { exact: true })).toBeVisible();
      await expect(booking.getByText(copy.riskAssessment.newRecommendation, { exact: true })).toBeVisible();
      await booking.getByRole('button', { name: copy.commandCentre.selectVehicle }).click();
      await booking.getByRole('option', { name: /Dacia Logan/ }).click();
      await booking.getByLabel(copy.commandCentre.startDate, { exact: true }).fill('2099-10-01');
      await booking.getByLabel(copy.commandCentre.endDate, { exact: true }).fill('2099-10-03');
      await page.screenshot({ path: testInfo.outputPath('booking.png'), fullPage: true, animations: 'disabled' });
      await booking.getByRole('button', { name: copy.commandCentre.confirmBooking, exact: true }).click();
      await expect(page.getByText(copy.commandCentre.bookingConfirmed, { exact: true })).toBeVisible();
      expect(bookingPayloads).toEqual([{ carId: 'car-2', customerId: 'customer-1', startDate: '2099-10-01', endDate: '2099-10-03' }]);
      expect(errors).toEqual([]);
    });
  }

  test(`renewal failure is honest and retryable in ${locale}`, async ({ page, context, baseURL }) => {
    const copy = catalogs[locale];
    const { taskPayloads } = await mockDashboard(page, { failFirstTask: true });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.goto('/dashboard');
    await page.getByText(copy.commandCentre.resolve, { exact: true }).click();
    const guardian = page.getByRole('dialog', { name: copy.commandCentre.guardianTitle });
    await guardian.getByRole('button', { name: copy.commandCentre.createRenewal }).click();
    await expect(page.getByText(copy.commandCentre.taskFailed, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.commandCentre.taskCreated, { exact: true })).toHaveCount(0);
    await expect(guardian).toBeVisible();
    await guardian.getByRole('button', { name: copy.commandCentre.createRenewal }).click();
    await expect(page.getByText(copy.commandCentre.taskCreated, { exact: true })).toBeVisible();
    expect(taskPayloads).toHaveLength(2);
  });
}
