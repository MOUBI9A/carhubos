"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { Customer } from './types';

export function useCustomers() {
  const [data, setData] = useState<Customer[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      // Skeleton only on first load; refetches update in place
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<Customer[]>('/customers');
      setData(res.data);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Customers fetch error:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load customers',
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
