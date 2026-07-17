"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CommandCentreData {
  revenue: { mtd: number; growth: number };
  utilization: { percent: number };
  guardianBlocks: Array<{
    id: string; car: string; plate: string; risk: string;
    type: string; severity: string; carId: string;
  }>;
  refusal: { recoverable: number; count: number };
  dailyIntensity: Array<{
    date: string; label: string; bookings: number; revenue: number;
  }>;
  starAsset: {
    id: string; brand: string; model: string; plate: string;
    roi: number; status: string; totalRevenue: number;
  } | null;
  liveActivity: Array<{
    id: string; user: string; role: string; action: string;
    entityType: string; entityId: string; time: string;
  }>;
  availableCars: Array<{ id: string; label: string; pricePerDay: number }>;
  customers: Array<{ id: string; label: string; phone: string }>;
  activeRentals: number;
  totalCustomers: number;
  fleet: {
    total: number; available: number; rented: number;
    maintenance: number; outOfService: number;
  };
}

/** Query key factory so mutations elsewhere can invalidate precisely. */
export const commandCentreKeys = {
  all: ['command-centre'] as const,
};

async function fetchCommandCentre(): Promise<CommandCentreData> {
  const res = await api.get('/analytics/command-centre');
  return res.data;
}

/**
 * Command Centre data on TanStack Query. Public shape is unchanged
 * ({ data, isLoading, error, refetch }) so consumers need no edits; the
 * cache gives instant back-navigation and background refresh for free.
 */
export function useCommandCentre() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: commandCentreKeys.all,
    queryFn: fetchCommandCentre,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message ||
          (query.error as any)?.message ||
          'Failed to load dashboard')
      : null,
    refetch: () => {
      // Keep the old imperative contract: callers just want a refresh.
      void qc.invalidateQueries({ queryKey: commandCentreKeys.all });
    },
  };
}
