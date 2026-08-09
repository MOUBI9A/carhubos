import { test, expect, Page, Route } from '@playwright/test';

/**
 * Vault file manager (/dashboard/vault-files). Per the founder's ask, every
 * request that would otherwise reach the real Supabase-backed backend
 * endpoints (GET/POST/DELETE /vault/files, GET .../download-url) is
 * intercepted at the browser network layer and answered with canned JSON —
 * neither the real backend nor real Supabase is ever touched by this file.
 * Covers: the empty state, drag-and-drop validation, client-side rejections
 * (mime type + size, both checked BEFORE any network call), and the delete
 * confirmation modal.
 */

interface MockFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Registers one route handler covering every /vault/files* shape and wires
 * it to a mutable in-memory list so DELETE actually affects the next GET —
 * realistic enough to prove the UI refetches correctly, without a real DB.
 */
async function mockVaultApi(
  page: Page,
  initialFiles: MockFile[],
  calls: { post: number; delete: number; downloadUrl: number } = {
    post: 0,
    delete: 0,
    downloadUrl: 0,
  },
) {
  let files = [...initialFiles];

  await page.route('**/api/vault/files**', async (route: Route) => {
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
          filename: 'signed-file.pdf',
          expiresInSeconds: 300,
        }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(files),
      });
      return;
    }

    if (method === 'POST') {
      calls.post++;
      // The real endpoint would 503 without Supabase configured, or 201 with
      // a persisted row — tests that reach this branch set up their own
      // fulfillment via a one-off route override, so this default just
      // guards against an unexpected real upload attempt slipping through.
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
      return;
    }

    if (method === 'DELETE') {
      calls.delete++;
      const id = url.pathname.split('/').filter(Boolean).pop();
      files = files.filter((f) => f.id !== id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id, deleted: true }),
      });
      return;
    }

    await route.fallback();
  });

  return { calls, setFiles: (next: MockFile[]) => { files = next; } };
}

const SAMPLE_FILE: MockFile = {
  id: 'file-1',
  filename: 'insurance-policy.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 245_760, // 240 KB
  createdAt: '2026-07-20T10:00:00.000Z',
};

test.describe('Vault file manager', () => {
  test('shows the empty state when there are no files', async ({ page }) => {
    await mockVaultApi(page, []);

    await page.goto('/dashboard/vault-files');

    await expect(page.getByText('No files yet')).toBeVisible();
    await expect(
      page.getByText('Upload your first file to start building your vault.'),
    ).toBeVisible();
  });

  test('lists a seeded file with its formatted type, size, and date', async ({ page }) => {
    await mockVaultApi(page, [SAMPLE_FILE]);

    await page.goto('/dashboard/vault-files');

    await expect(page.getByText('insurance-policy.pdf', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'PDF', exact: true })).toBeVisible();
    await expect(page.getByText('240.0 KB')).toBeVisible();
  });

  test('drag-and-drop of a disallowed file type is rejected client-side, no upload request fires', async ({ page }) => {
    const { calls } = await mockVaultApi(page, []);

    await page.goto('/dashboard/vault-files');
    await expect(page.getByText('No files yet')).toBeVisible();

    const dropzone = page.getByText('Drag & drop a file, or click to browse');

    // Synthetic HTML5 drop with a DataTransfer carrying a disallowed mime
    // type (text/plain) — exercises the real onDrop handler, not just the
    // file input.
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['just some text'], 'notes.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    });
    await dropzone.dispatchEvent('drop', { dataTransfer });

    await expect(page.getByText('Invalid file')).toBeVisible();
    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
    expect(calls.post).toBe(0);
  });

  test('a file over the 8MB cap is rejected client-side, no upload request fires', async ({ page }) => {
    const { calls } = await mockVaultApi(page, []);

    await page.goto('/dashboard/vault-files');
    await expect(page.getByText('No files yet')).toBeVisible();

    // setInputFiles handles a real oversized buffer efficiently (unlike
    // serializing a 9MB byte array through page.evaluate for a synthetic
    // drop) — same validateFile() code path either way, since drop and the
    // hidden <input> both funnel into handleFileSelected.
    const oversized = Buffer.alloc(9 * 1024 * 1024, 1);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'big-scan.pdf',
      mimeType: 'application/pdf',
      buffer: oversized,
    });

    await expect(page.getByText('Invalid file')).toBeVisible();
    await expect(page.getByText(/exceeds the 8MB limit/)).toBeVisible();
    expect(calls.post).toBe(0);
  });

  test('a valid file upload calls the API and the list refetches', async ({ page }) => {
    const { calls, setFiles } = await mockVaultApi(page, []);

    await page.goto('/dashboard/vault-files');
    await expect(page.getByText('No files yet')).toBeVisible();

    // Override the default POST fulfillment for this test only: succeed,
    // and make the mock "database" reflect the new file for the refetch.
    // This handler is registered AFTER mockVaultApi's, so it shadows it for
    // POST — meaning it must count the call itself; the outer handler's own
    // POST branch never runs for this test.
    await page.route('**/api/vault/files', async (route) => {
      if (route.request().method() === 'POST') {
        calls.post++;
        setFiles([SAMPLE_FILE]);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(SAMPLE_FILE),
        });
        return;
      }
      await route.fallback();
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'insurance-policy.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    });

    await expect(page.getByText('File uploaded')).toBeVisible();
    await expect(page.getByText('insurance-policy.pdf', { exact: true })).toBeVisible();
    expect(calls.post).toBe(1);
  });

  test('surfaces the 503 "not configured" state distinctly, without losing the user\'s file', async ({ page }) => {
    await mockVaultApi(page, []);
    await page.goto('/dashboard/vault-files');
    await expect(page.getByText('No files yet')).toBeVisible();

    await page.route('**/api/vault/files', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Vault storage is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
            statusCode: 503,
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    });

    await expect(page.getByText('Vault storage not configured')).toBeVisible();
    // The persistent banner (not just the toast) — still there after the
    // toast's 5s auto-dismiss window, so it can't be missed.
    await expect(
      page.getByText(/isn't configured yet.*uploads and downloads will fail/i),
    ).toBeVisible();
    await expect(page.getByText(/nothing was lost/i)).toBeVisible();
  });

  test('delete: cancel leaves the file, confirm calls DELETE and removes it from the list', async ({ page }) => {
    const { calls, setFiles } = await mockVaultApi(page, [SAMPLE_FILE]);

    await page.goto('/dashboard/vault-files');
    await expect(page.getByText('insurance-policy.pdf', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Delete insurance-policy.pdf/i }).click();
    await expect(page.getByRole('heading', { name: 'Delete file' })).toBeVisible();
    await expect(page.getByText('This cannot be undone')).toBeVisible();

    // Cancel: modal closes, nothing deleted, no DELETE request sent.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Delete file' })).not.toBeVisible();
    await expect(page.getByText('insurance-policy.pdf', { exact: true })).toBeVisible();
    expect(calls.delete).toBe(0);

    // Confirm: real delete flow.
    setFiles([SAMPLE_FILE]); // (no-op, still there — the DELETE handler itself mutates the list)
    await page.getByRole('button', { name: /Delete insurance-policy.pdf/i }).click();
    // The confirm button is labelled "Delete file" (matching the dialog
    // heading), not a bare "Delete" — `exact` on the old label matched nothing.
    await page.getByRole('button', { name: 'Delete file', exact: true }).click();

    await expect(page.getByText('File removed')).toBeVisible();
    await expect(page.getByText('No files yet')).toBeVisible();
    expect(calls.delete).toBe(1);
  });
});
