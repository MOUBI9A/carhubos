"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { FleetCar } from './types';

const PAGE_SIZE = 20;

interface FleetPageResponse {
  items: FleetCar[];
  total: number;
  page: number;
  limit: number;
}

/**
 * "Load more" pagination against GET /cars?page&limit&search, for the fleet
 * listing page only. Other pages (accidents, ai-vision, hub) still use the
 * plain useFleet() — they need the whole fleet for a car picker, not a
 * paginated window, so that hook is left untouched.
 */
export function useFleetPaginated(search: string = '') {
  const [data, setData] = useState<FleetCar[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    try {
      if (append) setIsLoadingMore(true);
      else if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<FleetPageResponse>('/cars', {
        params: { page: targetPage, limit: PAGE_SIZE, ...(search ? { search } : {}) },
      });
      setData((prev) => (append && prev ? [...prev, ...res.data.items] : res.data.items));
      setTotal(res.data.total);
      setPage(res.data.page);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Fleet fetch error:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load fleet',
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
