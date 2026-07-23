"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Domain types (mirror backend AccidentsService + accidents.dto.ts) ──

export const ACCIDENT_SEVERITIES = [
  'MINOR',
  'MODERATE',
  'SEVERE',
  'TOTAL',
] as const;

export const ACCIDENT_STATUSES = [
  'REPORTED',
  'INVESTIGATING',
  'REPAIR_QUOTE',
  'IN_REPAIR',
  'CLAIM_FILED',
  'RESOLVED',
] as const;

export type AccidentSeverity = (typeof ACCIDENT_SEVERITIES)[number];
export type AccidentStatus = (typeof ACCIDENT_STATUSES)[number];

export interface AccidentCar {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
}

/** One dossier as returned by `GET /accidents` / `GET /accidents/:id`. */
export interface Accident {
  id: string;
  agencyId: string;
  carId: string;
  bookingId: string | null;
  occurredAt: string;
  severity: AccidentSeverity | string;
  status: AccidentStatus | string;
  description: string;
  location: string | null;
  thirdParty: boolean;
  /** Money — number on the wire (DecimalToNumberInterceptor). */
  estimatedCost: number | null;
  createdAt: string;
  updatedAt: string;
  car: AccidentCar;
}

export interface CreateAccidentPayload {
  carId: string;
  occurredAt: string;
  severity: AccidentSeverity;
  description: string;
  status?: AccidentStatus;
  location?: string;
  thirdParty?: boolean;
  estimatedCost?: number;
  bookingId?: string;
}

export interface UpdateAccidentPayload {
  carId?: string;
  occurredAt?: string;
  severity?: AccidentSeverity;
  description?: string;
  status?: AccidentStatus;
  location?: string;
  thirdParty?: boolean;
  estimatedCost?: number;
  bookingId?: string | null;
}

export const accidentKeys = {
  all: ['accidents'] as const,
  list: () => [...accidentKeys.all, 'list'] as const,
};

async function fetchAccidents(): Promise<Accident[]> {
  const res = await api.get<Accident[]>('/accidents');
  return res.data;
}

/**
 * Agency-scoped accident dossiers. `GET /accidents` (capability `fleet.view`)
 * returns every incident for the caller's agency, ordered `occurredAt desc`,
 * each with a nested `car {id,brand,model,licensePlate}`.
 */
export function useAccidents() {
  const query = useQuery({
    queryKey: accidentKeys.list(),
    queryFn: fetchAccidents,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message ||
          (query.error as any)?.message ||
          'Failed to load incident dossiers')
      : null,
    refetch: () => query.refetch(),
  };
}

/**
 * File a new incident (`POST /accidents`, capability `fleet.manage`).
 * Backend scopes agencyId from the JWT, verifies car ownership (404), and
 * rejects unknown severity/status via DTO `@IsIn` (400). Surface those
 * messages rather than re-deriving the rules client-side.
 */
export function useCreateAccident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccidentPayload) =>
      api.post<Accident>('/accidents', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accidentKeys.all });
    },
  });
}

/**
 * Patch an existing dossier (`PATCH /accidents/:id`, capability `fleet.manage`).
 * Cross-tenant / unknown id → 404. AGENT lacks `fleet.manage` → 403.
 */
export function useUpdateAccident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: UpdateAccidentPayload & { id: string }) =>
      api.patch<Accident>(`/accidents/${id}`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accidentKeys.all });
    },
  });
}
