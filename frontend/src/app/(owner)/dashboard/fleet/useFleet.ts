"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { FleetCar } from './types';

export function useFleet() {
  const [data, setData] = useState<FleetCar[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      // Skeleton only on first load; refetches update in place
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<FleetCar[]>('/cars');
      setData(res.data);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Fleet fetch error:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load fleet',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
