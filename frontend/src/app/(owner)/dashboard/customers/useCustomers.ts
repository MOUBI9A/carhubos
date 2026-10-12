"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { Customer } from './types';

const PAGE_SIZE = 20;

interface CustomersPageResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
}

/**
 * "Load more" pagination against the backend's opt-in envelope
 * (GET /customers?page&limit&search — bare array only when both are
 * omitted, see cars.service.ts/customers.service.ts). `search` drives the
 * server-side filter and resets back to page 1 whenever it changes.
 */
export function useCustomers(search: string = '') {
  const [data, setData] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    try {
      if (append) setIsLoadingMore(true);
      // Skeleton only on first-ever load; refetches/search changes update in place.
      else if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<CustomersPageResponse>('/customers', {
        params: { page: targetPage, limit: PAGE_SIZE, ...(search ? { search } : {}) },
      });
      setData((prev) => (append && prev ? [...prev, ...res.data.items] : res.data.items));
      setTotal(res.data.total);
      setPage(res.data.page);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Customers fetch error:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load customers',
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoadingMore) return;
    fetchPage(page + 1, true);
  }, [fetchPage, page, isLoadingMore]);

  const hasMore = (data?.length ?? 0) < total;

  return {
    data,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refetch: () => fetchPage(1, false),
    loadMore,
  };
}
