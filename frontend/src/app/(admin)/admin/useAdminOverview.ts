"use client";

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PlatformAgency {
  id: string;
  name: string;
  tier: string;
  fleetSize: number;
  totalBookings: number;
  status: string;
  createdAt: string;
}

export interface AdminOverview {
  stats: { totalAgencies: number; liveBookings: number; platformGMV: number };
  agencies: PlatformAgency[];
}

export const adminOverviewKeys = { all: ['admin-overview'] as const };

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
