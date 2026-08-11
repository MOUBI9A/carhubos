"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export interface VehicleState {
  carId: string;
  deviceId: string | null;
  latitude: number | null;
  longitude: number | null;
  speedKph: number;
  ignitionOn: boolean | null;
  lastFixAt: string | null;
  online: boolean | null;
  batteryPercent: number | null;
  odometerKm: number | null;
  fixAgeSeconds: number | null;
  immobilized: boolean;
  lastCommand: TelematicsCommand | null;
}

export interface TelematicsCommand {
  id: string;
  type: 'IMMOBILIZE' | 'RESTORE_MOBILITY';
  status: 'SENT' | 'FAILED' | 'REJECTED';
  reason: string;
  speedKphAtRequest: number | null;
  ignitionOnAtRequest: boolean | null;
  fixAgeSecondsAtRequest: number | null;
  failureReason: string | null;
  requestedByUserId: string;
  createdAt: string;
}

/**
 * Distinguishes "this agency has no GPS provider connected" (503) and "this
 * car has no device linked" (400) from a genuine failure, so the panel can
 * show a setup prompt instead of an alarming error on a feature the agency
 * simply hasn't turned on.
 */
export type TelematicsStatus =
  | 'loading'
  | 'ready'
  | 'not-configured'
  | 'no-device'
  | 'error';

const POLL_INTERVAL_MS = 20_000;

export function useTelematics(carId: string) {
  const [state, setState] = useState<VehicleState | null>(null);
  const [commands, setCommands] = useState<TelematicsCommand[]>([]);
  const [status, setStatus] = useState<TelematicsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get<VehicleState>(`/telematics/cars/${carId}/state`);
      setState(res.data);
      setStatus('ready');
      setError(null);
      hasLoadedRef.current = true;
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 503) setStatus('not-configured');
      else if (httpStatus === 400) setStatus('no-device');
      else {
        setStatus('error');
        setError(err?.response?.data?.message || 'Could not read vehicle state.');
      }
    }
  }, [carId]);

  const fetchCommands = useCallback(async () => {
    try {
      const res = await api.get<TelematicsCommand[]>(
        `/telematics/cars/${carId}/commands`,
      );
      setCommands(res.data);
    } catch {
      // History is supplementary — never let it mask the live panel.
    }
  }, [carId]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchState(), fetchCommands()]);
  }, [fetchState, fetchCommands]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Poll only while the integration is actually usable — polling a
  // not-configured agency every 20s would hammer the API for nothing.
  useEffect(() => {
    if (status !== 'ready') return;
    const id = setInterval(() => {
      fetchState();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, fetchState]);

  return { state, commands, status, error, refetch };
}
