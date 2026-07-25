import { test, expect, Page, Route } from '@playwright/test';

/**
 * Guardian Vault — car document upload UI (/dashboard/fleet/[id], Guardian
 * tab). Every network call the page would make (car detail, document
 * create/renew, vault upload/download-url) is intercepted at the browser
 * layer and answered with canned JSON, so this spec never touches the real
 * backend DB or the real Supabase project — same fully-mocked approach as
 * vault-files.e2e.ts, and for the same reason (environment flakiness +
 * no live Supabase dependency in CI).
 */

const CAR_ID = 'car-e2e-1';

interface MockDocument {
  id: string;
  type: string;
  status: string;
  expiryDate: string;
  issueDate: string | null;
  fileUrl: string | null;
  vaultFileId: string | null;
  isMandatory: boolean;
}

interface MockCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  pricePerDay: number;
  fuelType: string;
  gearbox: string;
  status: string;
  mileage: number;
  nextServiceKm: number;
  currentRoi: number;
  createdAt: string;
  documents: MockDocument[];
  maintenance: unknown[];
  bookings: unknown[];
  hubListing: null;
  financials: { totalRevenue: number; totalMaintenanceCost: number; netProfit: number };
}

function baseCar(overrides: Partial<MockCar> = {}): MockCar {
  return {
    id: CAR_ID,
    brand: 'Dacia',
    model: 'Duster',
    year: 2023,
    licensePlate: 'E2E-DOC-1',
    pricePerDay: 450,
    fuelType: 'DIESEL',
    gearbox: 'MANUAL',
    status: 'AVAILABLE',
    mileage: 12000,
    nextServiceKm: 20000,
    currentRoi: 12.5,
    createdAt: '2026-01-01T00:00:00.000Z',
    documents: [],
    maintenance: [],
    bookings: [],
    hubListing: null,
    financials: { totalRevenue: 0, totalMaintenanceCost: 0, netProfit: 0 },
    ...overrides,
  };
}

async function mockCarAndDocumentsApi(
  page: Page,
  initialCar: ReturnType<typeof baseCar>,
) {
  let car = { ...initialCar };
  const calls = { documentsPost: 0, documentsPatch: 0, vaultPost: 0, downloadUrl: 0 };

  await page.route(`**/api/cars/${CAR_ID}`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(car) });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/documents**', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      calls.documentsPost++;
      const body = request.postDataJSON();
      car = {
        ...car,
        documents: [
          ...car.documents,
          {
            id: 'doc-new',
            type: body.type,
            status: 'VALID',
            expiryDate: body.expiryDate,
            issueDate: body.issueDate ?? null,
            fileUrl: null,
            vaultFileId: body.vaultFileId ?? null,
            isMandatory: true,
          },
        ],
      };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(car.documents.at(-1)) });
      return;
    }
    if (request.method() === 'PATCH') {
      calls.documentsPatch++;
      const body = request.postDataJSON();
      const url = new URL(request.url());
      const docId = url.pathname.split('/').filter(Boolean).pop();
      car = {
        ...car,
        documents: car.documents.map((d: any) =>
          d.id === docId
            ? { ...d, expiryDate: body.expiryDate, ...(body.vaultFileId !== undefined ? { vaultFileId: body.vaultFileId } : {}) }
            : d,
        ),
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(car.documents.find((d: any) => d.id === docId)) });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/vault/files**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET' && url.pathname.endsWith('/download-url')) {
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

    if (request.method() === 'POST') {
      calls.vaultPost++;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'vault-file-1',
          filename: 'insurance-scan.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 245_760,
          createdAt: '2026-07-25T10:00:00.000Z',
        }),
      });
      return;
    }

    await route.fallback();
  });

  return { calls, setCar: (next: ReturnType<typeof baseCar>) => { car = next; } };
}

test.describe('Guardian Vault — car document upload', () => {
  test('drag-and-drop of a disallowed file type is rejected client-side inside the Register modal', async ({ page }) => {
    const { calls } = await mockCarAndDocumentsApi(page, baseCar());

    await page.goto(`/dashboard/fleet/${CAR_ID}`);
    await page.getByRole('button', { name: 'Guardian' }).click();
    await page.getByRole('button', { name: 'Register document' }).first().click();
    await expect(page.getByRole('heading', { name: 'Register document' })).toBeVisible();

    const dropzone = page.getByText('Drag & drop a file, or click to browse');
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['just some text'], 'notes.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    });
    await dropzone.dispatchEvent('drop', { dataTransfer });

    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
    expect(calls.vaultPost).toBe(0);
  });

  test('an oversized file is rejected client-side inside the Register modal', async ({ page }) => {
    const { calls } = await mockCarAndDocumentsApi(page, baseCar());

    await page.goto(`/dashboard/fleet/${CAR_ID}`);
    await page.getByRole('button', { name: 'Guardian' }).click();
    await page.getByRole('button', { name: 'Register document' }).first().click();
    await expect(page.getByRole('heading', { name: 'Register document' })).toBeVisible();

    const oversized = Buffer.alloc(9 * 1024 * 1024, 1);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'big-scan.pdf',
      mimeType: 'application/pdf',
      buffer: oversized,
    });

    await expect(page.getByText(/exceeds the 8MB limit/)).toBeVisible();
    expect(calls.vaultPost).toBe(0);
  });

  test('attaching a valid file then submitting links vaultFileId on the create call', async ({ page }) => {
    const { calls } = await mockCarAndDocumentsApi(page, baseCar());

    await page.goto(`/dashboard/fleet/${CAR_ID}`);
    await page.getByRole('button', { name: 'Guardian' }).click();
    await page.getByRole('button', { name: 'Register document' }).first().click();
    await expect(page.getByRole('heading', { name: 'Register document' })).toBeVisible();

    const postDataPromise = page.waitForRequest(
      (req) => req.url().includes('/api/documents') && req.method() === 'POST',
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'insurance-scan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    });
    expect(calls.vaultPost).toBe(1);
    await expect(page.getByText('insurance-scan.pdf', { exact: true })).toBeVisible();

    await page.locator('input[name="expiryDate"]').fill('2027-01-01');
    await page.getByRole('button', { name: 'Activate tracking' }).click();

    const req = await postDataPromise;
    expect(req.postDataJSON().vaultFileId).toBe('vault-file-1');
    await expect(page.getByText('Document Registered')).toBeVisible();
  });

  test('a 503 from the vault upload surfaces inline without ever calling the documents endpoint', async ({ page }) => {
    const { calls } = await mockCarAndDocumentsApi(page, baseCar());

    await page.goto(`/dashboard/fleet/${CAR_ID}`);
    await page.getByRole('button', { name: 'Guardian' }).click();
    await page.getByRole('button', { name: 'Register document' }).first().click();
    await expect(page.getByRole('heading', { name: 'Register document' })).toBeVisible();

    await page.route('**/api/vault/files', async (route) => {
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

    await page.locator('input[type="file"]').setInputFiles({
      name: 'insurance-scan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    });

    await expect(page.getByText(/isn.t configured yet/)).toBeVisible();
    expect(calls.documentsPost).toBe(0);
  });

  test('a linked document shows a "View file" action that opens the signed URL', async ({ page }) => {
    const { calls } = await mockCarAndDocumentsApi(
      page,
      baseCar({
        documents: [
          {
            id: 'doc-linked',
            type: 'INSURANCE',
            status: 'VALID',
            expiryDate: '2027-01-01T00:00:00.000Z',
            issueDate: null,
            fileUrl: null,
            vaultFileId: 'vault-file-1',
            isMandatory: true,
          },
        ],
      }),
    );

    // The signed URL points at a fake host — window.open() triggers a real
    // top-level navigation to it (unlike the XHR calls above, which
    // page.route already intercepts), so without a context-wide route it'd
    // hit real DNS and fail. Fulfill it directly so the popup resolves.
    await page.context().route('https://mock-project.supabase.co/**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'mock signed file content' });
    });

    await page.goto(`/dashboard/fleet/${CAR_ID}`);
    await page.getByRole('button', { name: 'Guardian' }).click();
    await expect(page.getByText('INSURANCE')).toBeVisible();

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /View INSURANCE file/i }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    expect(popup.url()).toContain('mock-project.supabase.co');
    expect(calls.downloadUrl).toBe(1);
  });
});
