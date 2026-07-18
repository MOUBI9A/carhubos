"use client";

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PlatformAgency {
  id: string;
  name: string;
  tier: string;
  planName: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  fleetSize: number;
  totalBookings: number;
  seats: number;
  status: string;
  createdAt: string;
}

export interface AdminOverview {
  stats: { totalAgencies: number; liveBookings: number; platformGMV: number };
  agencies: PlatformAgency[];
}

export interface FounderMetrics {
  currency: string;
  mrr: number;
  arr: number;
  totalTenants: number;
  activeTenants: number;
  trials: number;
  paying: number;
  conversionRate: number;
  churnRate: number;
  planDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export const adminOverviewKeys = { all: ['admin-overview'] as const };
export const founderMetricsKeys = { all: ['founder-metrics'] as const };

export function useAdminOverview() {
  const query = useQuery({
    queryKey: adminOverviewKeys.all,
    queryFn: async (): Promise<AdminOverview> => {
      const res = await api.get('/saas-admin/overview');
      return res.data;
    },
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message || 'Failed to load platform overview')
      : null,
    refetch: query.refetch,
  };
}

export function useFounderMetrics() {
  const query = useQuery({
    queryKey: founderMetricsKeys.all,
    queryFn: async (): Promise<FounderMetrics> => {
      const res = await api.get('/saas-admin/metrics');
      return res.data;
    },
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message || 'Failed to load metrics')
      : null,
    refetch: query.refetch,
  };
}
