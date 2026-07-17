"use client";

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type RiskStatus = 'TRUSTED' | 'CAUTION' | 'BLACKLISTED' | 'NEW';

export interface RiskTag {
  tag: string;
  count: number;
  sentiment: 'pos' | 'neg';
}

export interface RiskFlag {
  id: string;
  reason: string;
  severity: string;
  details: string;
  agencyName: string;
  agencyCity: string;
  createdAt: string;
  evidenceCount: number;
}

export interface RiskAssessment {
  identity: { masked: string; type: string };
  status: RiskStatus;
  riskLevel: string;
  blocked: boolean;
  globalScore: number;
  reviewCount: number;
  agencyCount: number;
  activeFlagCount: number;
  depositMultiplier: number | null;
  recommendation: string;
  tags: RiskTag[];
  history: Array<'good' | 'warn' | 'bad'>;
  flags: RiskFlag[];
  latestReview: {
    rating: number;
    comment: string | null;
    agencyName: string;
    agencyCity: string;
    createdAt: string;
  } | null;
}

/**
 * Fetches the cross-agency Trust Network assessment for a customer. POST (not
 * GET) so the customer id never lands in a URL. Runs only when a customer is
 * selected in the booking flow.
 */
export function useCustomerRisk(customerId: string | null) {
  return useQuery<RiskAssessment>({
    queryKey: ['customer-risk', customerId],
    enabled: !!customerId,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.post('/trust/assess', { customerId });
      return res.data;
    },
  });
}
