"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { StaffMember } from './capabilities';

export function useStaff() {
  const [data, setData] = useState<StaffMember[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      // Skeleton only on first load; refetches update in place
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<StaffMember[]>('/agency/staff');
      setData(res.data);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Staff fetch error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
