"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { CarDetail } from '../types';

export function useCarDetail(id: string | null) {
  const [data, setData] = useState<CarDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // Skeleton only on first load; refetches (after mutations) update in place
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<CarDetail>(`/cars/${id}`);
      setData(res.data);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Car detail fetch error:', err);
      setError(
        err?.response?.status === 404
          ? 'This vehicle does not exist in your fleet.'
          : err?.response?.data?.message || err?.message || 'Failed to load vehicle',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    hasLoadedRef.current = false;
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
