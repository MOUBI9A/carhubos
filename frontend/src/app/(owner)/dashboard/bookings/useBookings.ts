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

/**
 * Loads everything the scheduler needs in parallel:
 * bookings (grid blocks), cars (row axis + create form), customers (create form).
 */
export function useBookings() {
  const [data, setData] = useState<BookingsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      // Skeleton only on first load; refetches (after mutations) update in place
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const [bookingsRes, carsRes, customersRes] = await Promise.all([
        api.get<Booking[]>('/bookings'),
        api.get<FleetCar[]>('/cars'),
        api.get<BookingCustomer[]>('/customers'),
      ]);
      setData({
        bookings: bookingsRes.data,
        cars: carsRes.data,
        customers: customersRes.data,
      });
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Bookings fetch error:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load bookings',
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
