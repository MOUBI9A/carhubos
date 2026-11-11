import fs from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { fixtureAccount, fixtureDatabase, loginAsRole } from './fixtures';

async function clickAction(page: Page, label: string, endpoint: string, method = 'POST') {
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith(endpoint) && response.request().method() === method);
  await page.getByRole('button', { name: label, exact: true }).click();
  const response = await responsePromise;
  expect(response.ok(), `${label} returned ${response.status()}`).toBeTruthy();
  return response.json();
}

test('real diagnostic workflow preserves provenance, Decimal totals and authenticated reports on all screen sizes', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/dashboard/diagnostics');
  await expect(page.getByRole('heading', { name: 'Vehicle diagnostics', exact: true })).toBeVisible();
  await expect(page.getByText('Evidence before decisions', { exact: true })).toBeVisible();
  await page.getByText('Add diagnostic vehicle', { exact: true }).click();
  await page.getByLabel('Make', { exact: true }).fill('QA Diagnostic');
  await page.getByLabel('Model', { exact: true }).fill('Simulator vehicle');
  const vehicle = await clickAction(page, 'Save vehicle', '/diagnostics/vehicles');
  await expect(page.getByLabel('Vehicle', { exact: true })).toHaveValue(vehicle.id);
  await page.getByLabel('Reported symptoms (optional)').fill('Simulated cylinder 1 misfire for workflow validation.');
  const created = await clickAction(page, 'Create session', '/diagnostics/sessions');
  await page.getByLabel('Scenario', { exact: true }).selectOption('p0301');
  await page.getByLabel('Seed', { exact: true }).fill('17');
  const simulated = await clickAction(page, 'Run simulator', `/diagnostics/sessions/${created.id}/simulate`);
  expect(simulated.source).toBe('SIMULATOR');
  expect(simulated.events.length).toBeGreaterThan(0);
  expect(simulated.dtcs).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'P0301' })]));
  await expect(page.getByText('SIMULATED — training evidence, not live vehicle data', { exact: true })).toBeVisible();
  const measurements = page.getByRole('region', { name: 'OBD packet measurements — scroll to review' });
  const packets = measurements.getByRole('table').locator('tbody tr');
  await expect(packets).toHaveCount(20);
  await page.getByRole('button', { name: `Show all (${simulated.events.length})`, exact: true }).click();
  await expect(packets).toHaveCount(simulated.events.length);
  await page.getByRole('button', { name: 'Show latest 20', exact: true }).click();
  await expect(packets).toHaveCount(20);
  const evidenceDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download evidence JSON', exact: true }).click();
  const evidenceDownload = await evidenceDownloadPromise;
  expect(await evidenceDownload.failure()).toBeNull();
  const evidencePath = await evidenceDownload.path();
  expect(evidencePath).toBeTruthy();
  const evidence = JSON.parse(await fs.readFile(evidencePath!, 'utf8'));
  expect(evidence.artifact).toBe('DIAGNOSTIC_SESSION_EVIDENCE');
  expect(evidence.source).toBe('SIMULATOR');
  expect(evidence.provenance).toContain('SIMULATED');
  expect(evidence.revision).toBe(simulated.revision);
  expect(evidence.events).toEqual(simulated.events);
  expect(evidence.dtcs).toEqual(simulated.dtcs);
  expect(evidence.aiProvider).toEqual(expect.objectContaining({ configured: expect.any(Boolean), name: expect.any(String) }));
  const analyzed = await clickAction(page, 'Analyze evidence', `/diagnostics/sessions/${created.id}/analyze`);
  expect(analyzed.analysis.provider).toBe('DETERMINISTIC');
  const finding = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Cylinder 1 misfire recorded' }) });
  await finding.getByLabel('Test result', { exact: true }).selectOption('FAIL');
  await finding.getByLabel('Observations and test method').fill('Simulation only: cylinder 1 response differed in the reproducible scenario; no physical vehicle was tested.');
  await clickAction(page, 'Record test result', `/diagnostics/sessions/${created.id}/tests`);
  await page.getByLabel('Cylinder 1 misfire recorded', { exact: true }).check();
  await page.getByLabel('Technician conclusions and remaining uncertainty').fill('Simulation-only finding reviewed against recorded evidence. Root cause and vehicle roadworthiness remain unconfirmed.');
  await page.getByLabel(/^I reviewed the evidence/).check();
  const confirmed = await clickAction(page, 'Confirm findings', `/diagnostics/sessions/${created.id}/confirm`);
  const me = await page.request.get(`${API_URL}/auth/me`);
  expect(me.ok()).toBeTruthy();
  const actorId = (await me.json()).user.id;
  expect(confirmed.confirmation.actorId).toBe(actorId);

  await page.getByLabel('Description', { exact: true }).fill('Manual simulated diagnostic labor');
  await page.getByLabel('Quantity / hours', { exact: true }).fill('2');
  await page.getByLabel('Unit price excluding VAT (MAD)', { exact: true }).fill('150.50');
  const estimated = await clickAction(page, 'Save manual estimate', `/diagnostics/sessions/${created.id}/estimate`, 'PUT');
  expect(String(estimated.estimate.subtotal)).toBe('301.00');
  expect(String(estimated.estimate.tax)).toBe('60.20');
  expect(String(estimated.estimate.total)).toBe('361.20');
  expect(estimated.estimate.source).toBe('MANUAL');
  expect(estimated.estimate.fitmentVerified).toBe(false);

  const reported = await clickAction(page, 'Generate report', `/diagnostics/sessions/${created.id}/report`);
  expect(reported.status).toBe('REPORTED');
  expect(reported.report.source).toBe('SIMULATOR');
  expect(reported.report.provenance).toContain('SIMULATED');
  expect(reported.report.contentHash).toMatch(/^[a-f0-9]{64}$/);
  await expect(page.getByText('Report ready — evidence snapshot preserved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze evidence', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save manual estimate', exact: true })).toBeDisabled();
  for (const extension of ['JSON', 'PDF']) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: `Download ${extension}`, exact: true }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    const localPath = await download.path();
    expect(localPath).toBeTruthy();
    const content = await fs.readFile(localPath!);
    if (extension === 'JSON') expect(JSON.parse(content.toString()).reportId).toBe(reported.report.reportId);
    else expect(content.subarray(0, 5).toString()).toBe('%PDF-');
  }
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    expect((await anonymous.request.get(`${API_URL}/diagnostics/sessions/${created.id}/report`)).status()).toBe(401);
    expect((await anonymous.request.get(`${API_URL}/diagnostics/sessions/${created.id}/report.pdf`)).status()).toBe(401);
  } finally { await anonymous.close(); }

  // Capture the saved workspace after transient notifications have dismissed.
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole('heading', { name: 'Vehicle diagnostics', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`diagnostics-${name}.png`), fullPage: true });
  }
});

test('an agent needs explicit grants and cannot confirm or generate a report with only view/perform', async ({ page }) => {
  await page.context().clearCookies();
  await loginAsRole(page, 'AGENT', '/agent');
  await page.goto('/agent/diagnostics');
  await expect(page.getByRole('heading', { name: 'Diagnostic access required', exact: true })).toBeVisible();
  expect((await page.request.get(`${API_URL}/diagnostics/vehicles`)).status()).toBe(403);
  const { prisma } = fixtureDatabase();
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: fixtureAccount('AGENT').email } });
    const membership = await prisma.agencyMembership.findUniqueOrThrow({ where: { userId_agencyId: { userId: user.id, agencyId: user.agencyId } } });
    await prisma.agencyMembership.update({ where: { id: membership.id }, data: {
      capabilities: [...membership.capabilities, 'diagnostics.view', 'diagnostics.perform'],
    } });
  } finally { await prisma.$disconnect(); }
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByLabel('Vehicle', { exact: true })).toBeVisible();
  await page.getByText('Add diagnostic vehicle', { exact: true }).click();
  await page.getByLabel('Make', { exact: true }).fill('QA Technician');
  await page.getByLabel('Model', { exact: true }).fill('Permissions vehicle');
  const vehicle = await clickAction(page, 'Save vehicle', '/diagnostics/vehicles');
  await expect(page.getByLabel('Vehicle', { exact: true })).toHaveValue(vehicle.id);
  const created = await clickAction(page, 'Create session', '/diagnostics/sessions');
  await page.getByLabel('Scenario', { exact: true }).selectOption('normal_idle');
  await clickAction(page, 'Run simulator', `/diagnostics/sessions/${created.id}/simulate`);
  const analyzed = await clickAction(page, 'Analyze evidence', `/diagnostics/sessions/${created.id}/analyze`);
  await expect(page.getByText('Confirmation requires the diagnostics.confirm permission.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm findings', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Generate report', exact: true })).toBeDisabled();
  const confirm = await page.request.post(`${API_URL}/diagnostics/sessions/${created.id}/confirm`, { data: {
    expectedRevision: analyzed.revision, findingIds: [analyzed.analysis.findings[0].id], notes: 'No confirm permission was granted to this fixture.',
  } });
  expect(confirm.status()).toBe(403);
  const report = await page.request.post(`${API_URL}/diagnostics/sessions/${created.id}/report`, { data: { expectedRevision: analyzed.revision } });
  expect(report.status()).toBe(403);
});
