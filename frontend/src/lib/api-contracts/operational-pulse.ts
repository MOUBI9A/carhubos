import { z } from 'zod';

const finiteNumber = z.number().refine(Number.isFinite, {
  message: 'Expected a finite number',
});

export const operationalMetricsSchema = z.object({
  waitingVehicles: finiteNumber,
  diagnosticsNeedingReview: finiteNumber,
  activeRepairs: finiteNumber,
  blockedJobs: finiteNumber,
  readyForQc: finiteNumber,
  awaitingApproval: finiteNumber,
  completedThisMonth: finiteNumber,
  criticalIssuesCount: finiteNumber,
});

export const predictiveOverviewSchema = z.object({
  totalVehicles: finiteNumber,
  criticalCount: finiteNumber,
  attentionCount: finiteNumber,
  projected30DayCostMad: finiteNumber,
});

export type OperationalMetrics = z.infer<typeof operationalMetricsSchema>;
export type PredictiveOverview = z.infer<typeof predictiveOverviewSchema>;

type PulseSchema<T> = z.ZodType<T>;

async function fetchValidatedContract<T>(
  path: string,
  schema: PulseSchema<T>,
  fetchImplementation: typeof fetch,
): Promise<T | null> {
  try {
    const response = await fetchImplementation(path, { credentials: 'include' });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    const parsedPayload = schema.safeParse(payload);
    return parsedPayload.success ? parsedPayload.data : null;
  } catch {
    return null;
  }
}

/**
 * Loads each dashboard contract independently so one unavailable or malformed
 * endpoint degrades only its own widget.
 */
export async function fetchOperationalPulse(
  fetchImplementation: typeof fetch = fetch,
): Promise<{
  metrics: OperationalMetrics | null;
  predictive: PredictiveOverview | null;
}> {
  const [metrics, predictive] = await Promise.all([
    fetchValidatedContract(
      '/api/work-orders/metrics/summary',
      operationalMetricsSchema,
      fetchImplementation,
    ),
    fetchValidatedContract(
      '/api/maintenance/predictive-overview',
      predictiveOverviewSchema,
      fetchImplementation,
    ),
  ]);

  return { metrics, predictive };
}
