import { test, expect } from '@playwright/test';
import { API_URL } from '../playwright.config';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';

const password = process.env.CARHUB_ROLE_PASSWORD;
const catalogs = { en, fr, ar };
const roles = [
  { role: 'ROOT_ADMIN', account: 'root', landing: '/admin' },
  { role: 'OWNER', account: 'owner', landing: '/dashboard' },
  { role: 'MANAGER', account: 'manager', landing: '/dashboard' },
  { role: 'AGENT', account: 'agent', landing: '/agent' },
  { role: 'RENTER', account: 'renter', landing: '/portal' },
];

test.use({ storageState: { cookies: [], origins: [] } });
test.skip(!password, 'Set CARHUB_ROLE_PASSWORD to verify existing seeded accounts without reseeding.');

for (const locale of ['en', 'fr', 'ar'] as const) {
  for (const account of roles) {
    test(`live ${account.role} login, session and role routing in ${locale}`, async ({ page, context, baseURL }) => {
      const copy = catalogs[locale];
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL! }]);
      await page.goto('/login');
      await page.getByLabel(copy.auth.email, { exact: true }).fill(`${account.account}@carhub.os`);
      await page.getByLabel(copy.auth.password, { exact: true }).fill(password!);
      const loginResponse = page.waitForResponse((response) => response.url() === `${API_URL}/auth/login`);
      await page.getByRole('button', { name: copy.auth.signIn, exact: true }).click();
      expect((await loginResponse).status()).toBe(200);
      await expect(page).toHaveURL(new URL(account.landing, baseURL!).href);
      const heading = account.role === 'ROOT_ADMIN' ? copy.adminPages.globalPulse
        : account.role === 'AGENT' ? copy.agentOps.title
        : account.role === 'RENTER' ? copy.renterPortal.title
        : copy.ownerPages.commandCenter;
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await page.reload();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      const session = await context.request.get(`${API_URL}/auth/me`);
      expect(session.status()).toBe(200);
      expect((await session.json()).user.role).toBe(account.role);
      const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'infinity_token');
      expect(sessionCookie?.httpOnly).toBe(true);
      if (account.role === 'RENTER') {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(new URL('/portal', baseURL!).href);
      }
    });
  }
}
