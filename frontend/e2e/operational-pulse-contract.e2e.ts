import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import {
  operationalMetricsSchema,
  predictiveOverviewSchema,
} from '../src/lib/api-contracts/operational-pulse';

test('live backend responses satisfy the owner dashboard contracts', async ({ page }) => {
  const [metricsResponse, predictiveResponse] = await Promise.all([
    page.request.get(`${API_URL}/work-orders/metrics/summary`),
    page.request.get(`${API_URL}/maintenance/predictive-overview`),
  ]);

  expect(
    metricsResponse.ok(),
    `metrics endpoint returned ${metricsResponse.status()}: ${await metricsResponse.text()}`,
  ).toBeTruthy();
  expect(
    predictiveResponse.ok(),
    `predictive endpoint returned ${predictiveResponse.status()}: ${await predictiveResponse.text()}`,
  ).toBeTruthy();

  const metricsResult = operationalMetricsSchema.safeParse(await metricsResponse.json());
  const predictiveResult = predictiveOverviewSchema.safeParse(await predictiveResponse.json());

  expect(
    metricsResult.success,
    metricsResult.success ? undefined : JSON.stringify(metricsResult.error.issues),
  ).toBe(true);
  expect(
    predictiveResult.success,
    predictiveResult.success ? undefined : JSON.stringify(predictiveResult.error.issues),
  ).toBe(true);
});
