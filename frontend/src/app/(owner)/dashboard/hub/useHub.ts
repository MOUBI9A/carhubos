"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Domain types (mirror backend Prisma shapes returned by hub.service.ts) ──

export interface HubListingCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  imageUrl?: string | null;
  pricePerDay: number;
  fuelType: string;
  gearbox: string;
  status: string;
}

/** A cross-agency listing as returned by `GET /hub/discover`. */
export interface HubListing {
  id: string;
  dailyRateB2B: number;
  status: string;
  createdAt: string;
  carId: string;
  car: HubListingCar;
  agencyId: string;
  agency: { name: string; city: string };
}

export const hubKeys = {
  discover: ['hub', 'discover'] as const,
};

async function fetchDiscover(): Promise<HubListing[]> {
  const res = await api.get<HubListing[]>('/hub/discover');
  return res.data;
}

/**
 * Cross-agency marketplace feed. `GET /hub/discover` (capability `fleet.view`)
 * only ever returns OTHER agencies' ACTIVE listings on AVAILABLE cars — never
 * this agency's own, by design (that's the whole point of a B2B network).
 */
export function useHubDiscover() {
  const query = useQuery({
    queryKey: hubKeys.discover,
    queryFn: fetchDiscover,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message ||
          (query.error as any)?.message ||
          'Failed to load the hub marketplace')
      : null,
    refetch: () => query.refetch(),
  };
}

/**
 * List one of this agency's own cars on the hub (`POST /hub/list`,
 * capability `hub.manage`). The backend independently guards against
 * double-listing (409) and a car that isn't ours (404) — surface whatever it
 * says rather than re-deriving those rules client-side.
 */
export function useListOnHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { carId: string; b2bRate: number }) =>
      api.post('/hub/list', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.discover });
    },
  });
}
