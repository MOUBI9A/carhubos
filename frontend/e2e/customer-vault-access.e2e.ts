import { test, expect, Page, Route } from '@playwright/test';

/**
 * Customer detail page's new "Digital vault access" panel
 * (/dashboard/customers/[id]) — the consent-gated viewer for a renter's
 * RenterDocument vault. Every relevant network call (customer detail,
 * agency/consent/request, agency/consent/documents/**) is intercepted so
 * this never touches the real backend or Supabase, same approach as
 * vault-files.e2e.ts / fleet-car-documents.e2e.ts.
 *
 * Each test clears its own localStorage key first — the panel persists the
 * resolved renterUserId there (see VaultAccessPanel.tsx's storageKey()), so
 * a prior test's link must never leak into the next one.
 */

const CUSTOMER_ID = 'customer-e2e-1';
const RENTER_USER_ID = 'renter-user-e2e-1';

function baseCustomer() {
  return {
    id: CUSTOMER_ID,
    firstName: 'Yasmine',
    lastName: 'Bennani',
    email: null,
    phone: '+212600000001',
    identityType: 'CIN',
    identityNumber: 'E2E12345',
    nationality: 'Moroccan',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    bookings: [],
    documents: [],
    lifetimeSpend: 0,
  };
}

async function mockCustomerApi(page: Page) {
  await page.route(`**/api/customers/${CUSTOMER_ID}`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(baseCustomer()) });
      return;
    }
    await route.fallback();
  });
}

async function clearVaultLocalStorage(page: Page) {
  await page.addInitScript((customerId) => {
    window.localStorage.removeItem(`fider:vault-consent-renter:${customerId}`);
  }, CUSTOMER_ID);
}

test.describe('Customer detail — Digital vault access panel', () => {
  test('requesting access validates the code and scope client-side before calling the API', async ({ page }) => {
    await clearVaultLocalStorage(page);
    await mockCustomerApi(page);
    let requestCalls = 0;
    await page.route('**/api/agency/consent/request', async (route: Route) => {
      requestCalls++;
      await route.fallback();
    });

    await page.goto(`/dashboard/customers/${CUSTOMER_ID}`);
    await expect(page.getByText('Digital vault access')).toBeVisible();

    await page.getByRole('button', { name: 'Request access' }).click();
    await expect(page.getByText("Enter the renter's Trust Vault code.")).toBeVisible();
    expect(requestCalls).toBe(0);

    await page.getByPlaceholder('Scan or paste the code').fill('renter-qr-code-1');
    await page.getByRole('button', { name: 'Request access' }).click();
    await expect(page.getByText('Select at least one document type.')).toBeVisible();
    expect(requestCalls).toBe(0);
  });

  test('a successful request links the renter and shows the "no active consent" state', async ({ page }) => {
    await clearVaultLocalStorage(page);
    await mockCustomerApi(page);

    await page.route('**/api/agency/consent/request', async (route: Route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'grant-1',
          grantorUserId: RENTER_USER_ID,
          agencyId: 'agency-1',
          scope: ['DRIVING_LICENSE'],
          status: 'PENDING',
        }),
      });
    });
    await page.route(`**/api/agency/consent/documents/${RENTER_USER_ID}`, async (route: Route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'No active consent grant', statusCode: 403 }),
      });
    });

    await page.goto(`/dashboard/customers/${CUSTOMER_ID}`);
    await page.getByPlaceholder('Scan or paste the code').fill('renter-qr-code-1');
    await page.getByText('Driving License', { exact: true }).click();
    await page.getByRole('button', { name: 'Request access' }).click();

    await expect(page.getByText('Request Sent')).toBeVisible();
    await expect(page.getByText('No active consent')).toBeVisible();
    await expect(
      page.getByText(/hasn.t approved this request yet, or it expired/),
    ).toBeVisible();
  });

  test('an active grant lists the consented documents with a working "View" action', async ({ page }) => {
    await clearVaultLocalStorage(page);
    await mockCustomerApi(page);

    await page.addInitScript(
      ({ customerId, renterUserId }) => {
        window.localStorage.setItem(`fider:vault-consent-renter:${customerId}`, renterUserId);
      },
      { customerId: CUSTOMER_ID, renterUserId: RENTER_USER_ID },
    );

    let downloadUrlCalls = 0;
    await page.route(`**/api/agency/consent/documents/${RENTER_USER_ID}`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          grantId: 'grant-1',
          scope: ['DRIVING_LICENSE'],
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          documents: [
            {
              id: 'doc-1',
              type: 'DRIVING_LICENSE',
              label: null,
              storagePath: 'renter-documents/renter-user-e2e-1/license.jpg',
              verified: true,
            },
          ],
        }),
      });
    });
    await page.route(`**/api/agency/consent/documents/${RENTER_USER_ID}/doc-1/download-url`, async (route: Route) => {
      downloadUrlCalls++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://mock-project.supabase.co/storage/v1/object/sign/vault-files/fake?token=abc',
          expiresInSeconds: 300,
        }),
      });
    });
    await page.context().route('https://mock-project.supabase.co/**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'mock signed file content' });
    });

    await page.goto(`/dashboard/customers/${CUSTOMER_ID}`);
    await expect(page.getByText('Expires in 3 days')).toBeVisible();
    await expect(page.getByText('Driving License', { exact: true }).first()).toBeVisible();

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /View .*file/i }).click(),
    ]);
    await expect(popup).toHaveURL(/mock-project\.supabase\.co/);
    await popup.waitForLoadState('domcontentloaded');
    expect(downloadUrlCalls).toBe(1);
  });

  test('unlinking clears the renter and returns to the request form', async ({ page }) => {
    await clearVaultLocalStorage(page);
    await mockCustomerApi(page);
    await page.addInitScript(
      ({ customerId, renterUserId }) => {
        window.localStorage.setItem(`fider:vault-consent-renter:${customerId}`, renterUserId);
      },
      { customerId: CUSTOMER_ID, renterUserId: RENTER_USER_ID },
    );
    await page.route(`**/api/agency/consent/documents/${RENTER_USER_ID}`, async (route: Route) => {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'No active consent grant' }) });
    });

    await page.goto(`/dashboard/customers/${CUSTOMER_ID}`);
    await expect(page.getByText('No active consent')).toBeVisible();

    await page.getByRole('button', { name: 'Unlink renter' }).click();
    await expect(page.getByPlaceholder('Scan or paste the code')).toBeVisible();

    const stored = await page.evaluate(
      (customerId) => window.localStorage.getItem(`fider:vault-consent-renter:${customerId}`),
      CUSTOMER_ID,
    );
    expect(stored).toBeNull();
  });
});
