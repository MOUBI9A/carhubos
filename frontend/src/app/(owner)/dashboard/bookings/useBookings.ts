"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { FleetCar } from '../fleet/types';
import type { Booking, BookingCustomer } from './types';

interface BookingsPageData {
  bookings: Booking[];
  cars: FleetCar[];
  customers: BookingCustomer[];
}

type RefData = { cars: FleetCar[]; customers: BookingCustomer[] };

/**
 * Loads the scheduler's data for a given visible date window `[from, to]`.
 *
 * Bookings are fetched **windowed** — the backend uses overlap semantics
 * (`startDate <= to AND endDate >= from`), so the grid pulls only the rentals
 * that intersect what's on screen, never the agency's entire lifetime history.
 * The query scales with the window, not the table.
 *
 * Cars + customers are bounded reference lists (fleet row-axis + create-form
 * dropdowns). They're window-independent, so moving the window reuses the cached
 * copy and re-runs only the bookings query. `refetch` (called after a mutation)
 * force-refreshes them too — a booking transition flips car availability, which
 * the "available cars" picker must reflect.
 */
export function useBookings(from: string, to: string) {
  const [data, setData] = useState<BookingsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const refDataRef = useRef<RefData | null>(null);
  // Monotonic request token: navigating windows fires overlapping requests, and
  // they can resolve out of order. Only the newest request is allowed to write
  // state, so a slow earlier window can't overwrite a newer one's data/loading.
  const reqIdRef = useRef(0);

  const loadRefData = useCallback(async (): Promise<RefData> => {
    const [carsRes, customersRes] = await Promise.all([
      api.get<FleetCar[]>('/cars'),
      api.get<BookingCustomer[]>('/customers'),
    ]);
    const ref: RefData = { cars: carsRes.data, customers: customersRes.data };
    refDataRef.current = ref;
    return ref;
  }, []);

  const load = useCallback(
    async (forceRefData: boolean) => {
      const reqId = ++reqIdRef.current;
      // Skeleton only on first load; window navigation / refetches update in place.
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      try {
        const bookingsPromise = api.get<Booking[]>('/bookings', {
          params: { from, to },
        });
        const refPromise =
          !forceRefData && refDataRef.current
            ? Promise.resolve(refDataRef.current)
            : loadRefData();

        const [bookingsRes, ref] = await Promise.all([bookingsPromise, refPromise]);
        if (reqId !== reqIdRef.current) return; // superseded by a newer window/refetch
        setData({ bookings: bookingsRes.data, cars: ref.cars, customers: ref.customers });
        hasLoadedRef.current = true;
      } catch (err: any) {
        if (reqId !== reqIdRef.current) return; // stale failure — ignore
        console.error('Bookings fetch error:', err);
        // Only blank the page when there's nothing to show (initial load). A failed
        // window-navigation / refetch keeps the already-rendered grid intact rather
        // than discarding it for a full-screen error.
        if (!hasLoadedRef.current) {
          setError(
            err?.response?.data?.message || err?.message || 'Failed to load bookings',
          );
        }
      } finally {
        if (reqId === reqIdRef.current) setIsLoading(false);
      }
    },
    [from, to, loadRefData],
  );

  // Window navigation (from/to change) reuses the cached fleet; only bookings re-run.
  useEffect(() => {
    load(false);
  }, [load]);

  // After a mutation, refresh bookings AND the fleet/customer lists (car status changes).
  const refetch = useCallback(() => load(true), [load]);

  return { data, isLoading, error, refetch };
}
