"use client";

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  currency: string;
  maxCars: number | null;
  maxStaff: number | null;
  maxBookingsPerMonth: number | null;
  features: string[];
  sortOrder: number;
}

/** Public plan catalog (GET /platform/plans) — BETA excluded, sorted by sortOrder. */
export function usePlans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Plan[]>('/platform/plans')
      .then(({ data }) => {
        if (!cancelled) setPlans(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Could not load plans.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, isLoading, error };
}

/**
 * Starts a self-serve plan-upgrade checkout (billing.manage, OWNER-only) and
 * redirects the browser to the gateway's hosted page. successUrl/cancelUrl
 * carry our own query params so the billing page can react on return — the
 * plan itself only actually changes once the gateway's webhook settles it
 * (see PaymentsService.settleCheckout), never at this call.
 */
export async function startSubscriptionCheckout(planKey: string): Promise<void> {
  const origin = window.location.origin;
  const { data } = await api.post<{ redirectUrl: string }>('/payments/checkout/subscription', {
    planKey,
    successUrl: `${origin}/dashboard/billing?upgrade=processing&plan=${planKey}`,
    cancelUrl: `${origin}/dashboard/billing?upgrade=cancelled`,
  });
  window.location.href = data.redirectUrl;
}
