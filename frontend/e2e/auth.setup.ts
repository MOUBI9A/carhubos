import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { API_URL, STORAGE_STATE } from '../playwright.config';

/**
 * Registers a fresh, isolated agency for this run, seeds it with a couple of
 * cars and a customer via the API, then logs in through the real UI and saves
 * the browser storageState. Running a brand-new agency each time keeps tests
 * independent of whatever data already lives in the dev database.
 */
setup('authenticate and seed a fresh agency', async ({ page, request }) => {
  const stamp = Date.now();
  const account = {
    email: `e2e+${stamp}@carhub.test`,
    password: 'E2ePass2026!',
    agencyName: `E2E Agency ${stamp}`,
  };

  // 1) Register the agency owner. If the backend is down this throws with a
  //    clear connection error, which is exactly the signal we want.
  const reg = await request.post(`${API_URL}/auth/register`, {
    data: {
      email: account.email,
      password: account.password,
      name: 'E2E Owner',
      role: 'OWNER',
      agencyName: account.agencyName,
    },
  });
  expect(
    reg.ok(),
    `register failed (${reg.status()}): ${await reg.text()}`,
  ).toBeTruthy();

  // 2) Log in on the API request context so subsequent seed calls carry the
  //    auth cookie (the request context persists Set-Cookie between calls).
  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email: account.email, password: account.password },
  });
  expect(login.ok(), `api login failed (${login.status()})`).toBeTruthy();

  // 3) Seed two available cars and one customer.
  const cars = [
    { brand: 'Dacia', model: 'Logan', year: 2023, licensePlate: `E2E-${stamp}-1`, pricePerDay: 400 },
    { brand: 'Renault', model: 'Clio 5', year: 2024, licensePlate: `E2E-${stamp}-2`, pricePerDay: 550 },
  ];
  for (const car of cars) {
    const res = await request.post(`${API_URL}/cars`, { data: car });
    expect(res.ok(), `seed car failed (${res.status()}): ${await res.text()}`).toBeTruthy();
  }
  const customer = await request.post(`${API_URL}/customers`, {
    data: {
      firstName: 'Test',
      lastName: 'Renter',
      phone: `+2126${String(stamp).slice(-8)}`,
      identityType: 'CIN',
      identityNumber: `E2E${stamp}`,
    },
  });
  expect(customer.ok(), `seed customer failed (${customer.status()})`).toBeTruthy();

  // 3b) A second customer, flagged CRITICAL on the Trust Network, so the risk
  //     panel / booking hard-lock can be exercised end-to-end.
  const flagged = await request.post(`${API_URL}/customers`, {
    data: {
      firstName: 'Flagged',
      lastName: 'Renter',
      phone: `+2127${String(stamp).slice(-8)}`,
      identityType: 'PASSPORT',
      identityNumber: `E2EBL${stamp}`,
    },
  });
  expect(flagged.ok(), `seed flagged customer failed (${flagged.status()})`).toBeTruthy();
  const flaggedId = (await flagged.json()).id;
  const bl = await request.post(`${API_URL}/trust/blacklist`, {
    data: {
      customerId: flaggedId,
      reason: 'FRAUDULENT_DOCUMENTS',
      severity: 'CRITICAL',
      details: 'E2E seed: falsified documents.',
    },
  });
  expect(bl.ok(), `seed blacklist failed (${bl.status()})`).toBeTruthy();

  // 4) Log in through the actual UI and capture the authenticated state.
  await page.goto('/login');
  await page.getByPlaceholder('name@agency.com').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.getByRole('button', { name: /secure login/i }).click();

  await page.waitForURL('**/dashboard**');
  await expect(page.getByRole('button', { name: 'New Booking' })).toBeVisible();

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
  fs.writeFileSync(
    path.join(path.dirname(STORAGE_STATE), 'account.json'),
    JSON.stringify(account, null, 2),
  );
});
