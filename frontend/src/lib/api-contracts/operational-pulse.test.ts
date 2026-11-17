import { describe, expect, it, vi } from 'vitest';
import {
  fetchOperationalPulse,
  operationalMetricsSchema,
  predictiveOverviewSchema,
} from './operational-pulse';

const validMetrics = {
  waitingVehicles: 1,
  diagnosticsNeedingReview: 2,
  activeRepairs: 3,
  blockedJobs: 4,
  readyForQc: 5,
  awaitingApproval: 6,
  completedThisMonth: 7,
  criticalIssuesCount: 8,
};

const validPredictiveOverview = {
  totalVehicles: 13,
  criticalCount: 2,
  attentionCount: 5,
  projected30DayCostMad: 12345.5,
};

describe('operational pulse API contracts', () => {
  it('accepts the current backend response shapes', () => {
    expect(operationalMetricsSchema.safeParse(validMetrics).success).toBe(true);
    expect(predictiveOverviewSchema.safeParse(validPredictiveOverview).success).toBe(true);
  });

  it.each([
    ['missing field', { ...validPredictiveOverview, projected30DayCostMad: undefined }],
    [
      'renamed field',
      {
        totalVehicles: 13,
        criticalCount: 2,
        attentionCount: 5,
        forecast30DaysMad: 12345.5,
      },
    ],
    ['wrong type', { ...validPredictiveOverview, projected30DayCostMad: '12345.5' }],
    ['NaN', { ...validPredictiveOverview, projected30DayCostMad: Number.NaN }],
    ['Infinity', { ...validPredictiveOverview, projected30DayCostMad: Number.POSITIVE_INFINITY }],
  ])('rejects a predictive response with a %s', (_caseName, payload) => {
    expect(predictiveOverviewSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects non-finite operational metrics', () => {
    expect(
      operationalMetricsSchema.safeParse({
        ...validMetrics,
        waitingVehicles: Number.NEGATIVE_INFINITY,
      }).success,
    ).toBe(false);
  });

  it('keeps the valid endpoint when the other endpoint fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes('/work-orders/metrics/summary')) {
        throw new Error('metrics unavailable');
      }

      return new Response(JSON.stringify(validPredictiveOverview), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(fetchOperationalPulse(fetchImplementation)).resolves.toEqual({
      metrics: null,
      predictive: validPredictiveOverview,
    });
  });
});
