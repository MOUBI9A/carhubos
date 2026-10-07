import { test, expect, Page, Route } from '@playwright/test';

/**
 * Renter portal — document upload UI (/portal, "My documents" card). Logs in
 * as the seeded demo renter (same real-login pattern as roles.e2e.ts) so
 * /portal/me, /portal/consent and /portal/notifications load real seed data
 * — only /portal/documents** is intercepted and answered with canned JSON,
 * so uploads/downloads never touch the real backend or Supabase.
 */

interface MockDoc {
  id: string;
  type: string;
  label: string | null;
  fileUrl: string | null;
  storagePath: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

async function loginAsRenter(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByPlaceholder('name@agency.com').fill('renter@carhub.os');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL('**/portal');
}

async function mockPortalDocumentsApi(page: Page, initialDocs: MockDoc[]) {
  let docs = [...initialDocs];
  const calls = { post: 0, downloadUrl: 0 };

  await page.route('**/api/portal/documents**', async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET' && url.pathname.endsWith('/download-url')) {
      calls.downloadUrl++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://mock-project.supabase.co/storage/v1/object/sign/vault-files/fake?token=abc',
          expiresInSeconds: 300,
        }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docs) });
      return;
    }

    if (method === 'POST') {
      calls.post++;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
      return;
    }

    await route.fallback();
  });

  return { calls, setDocs: (next: MockDoc[]) => { docs = next; } };
}

test.describe('Renter portal — document upload', () => {
  test('drag-and-drop of a disallowed file type is rejected client-side, no upload request fires', async ({ page }) => {
    const { calls } = await mockPortalDocumentsApi(page, []);
    await loginAsRenter(page);

    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('heading', { name: 'Upload document' })).toBeVisible();

    const dropzone = page.getByText('Drag & drop, or click to browse');
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['just some text'], 'notes.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    });
    await dropzone.dispatchEvent('drop', { dataTransfer });

    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
    expect(calls.post).toBe(0);
  });

  test('an oversized file is rejected client-side, no upload request fires', async ({ page }) => {
    const { calls } = await mockPortalDocumentsApi(page, []);
    await loginAsRenter(page);

    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('heading', { name: 'Upload document' })).toBeVisible();

    const oversized = Buffer.alloc(9 * 1024 * 1024, 1);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'big-scan.pdf',
      mimeType: 'application/pdf',
      buffer: oversized,
    });

    await expect(page.getByText(/exceeds the 8MB limit/)).toBeVisible();
    expect(calls.post).toBe(0);
  });

  test('a valid upload submits type + file and the list refetches', async ({ page }) => {
    const { calls, setDocs } = await mockPortalDocumentsApi(page, []);
    await loginAsRenter(page);

    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('heading', { name: 'Upload document' })).toBeVisible();

    await page.locator('select').selectOption('DRIVING_LICENSE');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'license.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-bytes'),
    });

    setDocs([
      {
        id: 'doc-1',
        type: 'DRIVING_LICENSE',
        label: null,
        fileUrl: null,
        storagePath: 'renter-documents/renter-1/license.jpg',
        verified: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
    ]);
    await page.getByRole('dialog').getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(page.getByText('Document Uploaded')).toBeVisible();
    expect(calls.post).toBe(1);
    await expect(page.getByRole('heading', { name: 'Upload document' })).not.toBeVisible();
    await expect(page.getByText('Driving License', { exact: true }).first()).toBeVisible();
  });

  test('a 503 from the upload endpoint surfaces inline, modal stays open with the file kept', async ({ page }) => {
    await mockPortalDocumentsApi(page, []);
    await loginAsRenter(page);

    await page.route('**/api/portal/documents', async (route: Route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Vault storage is not configured.', statusCode: 503 }),
        });
        return;
      }
      await route.fallback();
    });

    await page.getByRole('button', { name: 'Upload' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'passport.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-png-bytes'),
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(page.getByText(/isn.t configured yet/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload document' })).toBeVisible();
    await expect(page.getByText('passport.png')).toBeVisible();
  });

  test('a document with a real file shows a working "View" action', async ({ page }) => {
    const { calls } = await mockPortalDocumentsApi(page, [
      {
        id: 'doc-1',
        type: 'CIN_FRONT',
        label: null,
        fileUrl: null,
        storagePath: 'renter-documents/renter-1/cin.jpg',
        verified: true,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
    ]);
    await page.context().route('https://mock-project.supabase.co/**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'mock signed file content' });
    });

    await loginAsRenter(page);
    await expect(page.getByText('National ID — Front', { exact: true }).first()).toBeVisible();

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /View .*file/i }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    expect(popup.url()).toContain('mock-project.supabase.co');
    expect(calls.downloadUrl).toBe(1);
  });
});
