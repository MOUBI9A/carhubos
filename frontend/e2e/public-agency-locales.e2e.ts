import { expect, test } from '@playwright/test';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';

const catalogs = { en, fr, ar };

test.use({ storageState: { cookies: [], origins: [] } });

for (const locale of ['en', 'fr', 'ar'] as const) {
  test(`public agency stays accessible without login in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
    await page.route('**/api/public/agency-by-subdomain/locale-test', (route) => route.fulfill({ json: { id: 'public-agency', name: 'Test Agency', city: 'Casablanca' } }));
    await page.route('**/api/public/fleet?*', (route) => route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 60 } }));
    await page.goto('/agency/locale-test');
    await expect(page.getByRole('heading', { name: 'Test Agency', exact: true })).toBeVisible();
    await expect(page.getByText(catalogs[locale].agencyPublic.noFleet, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/agency\/locale-test$/);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Test Agency', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/agency\/locale-test$/);
  });
}
