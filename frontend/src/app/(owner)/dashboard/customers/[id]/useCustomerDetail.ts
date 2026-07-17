"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { CustomerDetail } from '../types';

export function useCustomerDetail(id: string | null) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // Skeleton only on first load; refetches (after mutations) update in place
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<CustomerDetail>(`/customers/${id}`);
      setData(res.data);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Customer detail fetch error:', err);
      setError(
        err?.response?.status === 404
          ? 'This customer does not exist in your directory.'
          : err?.response?.data?.message || err?.message || 'Failed to load customer',
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
