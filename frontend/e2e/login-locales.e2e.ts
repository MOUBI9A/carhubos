import { test, expect } from '@playwright/test';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';

test.use({ storageState: { cookies: [], origins: [] } });

for (const locale of ['en', 'fr', 'ar'] as const) {
  for (const status of [401, 429, 503, 0]) {
  test(`login labels and failure ${status || 'network'} feedback in ${locale}`, async ({ page, context, baseURL }) => {
    const copy = { en, fr, ar }[locale].auth;
    const payloads: unknown[] = [];
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
    await page.route('**/api/auth/login', (route) => {
      payloads.push(route.request().postDataJSON());
      return status ? route.fulfill({ status, json: { message: 'Untranslated backend credentials error' } }) : route.abort('failed');
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await page.getByLabel(copy.email, { exact: true }).fill('test@example.invalid');
    await page.getByLabel(copy.password, { exact: true }).fill('invalid-password');
    await page.getByRole('button', { name: copy.signIn, exact: true }).click();
    const expectedMessage = status === 401 ? copy.loginFailBody : status === 429 ? copy.loginRateLimited : copy.loginUnavailable;
    await expect(page.getByText(expectedMessage, { exact: true })).toBeVisible();
    await expect(page.getByText('Untranslated backend credentials error')).toHaveCount(0);
    await expect(page.getByRole('button', { name: copy.signIn, exact: true })).toBeEnabled();
    expect(payloads).toEqual([{ email: 'test@example.invalid', password: 'invalid-password' }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
  }
}
