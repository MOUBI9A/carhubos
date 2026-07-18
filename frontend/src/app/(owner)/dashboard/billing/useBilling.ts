"use client";

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface BillingInvoice {
  id: string;
  number: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
  amount: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  issuedAt: string;
  paidAt: string | null;
  note: string | null;
}

export interface BillingSnapshot {
  agencyId: string;
  planKey: string;
  planName: string;
  priceMonthly: number;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
  operating: boolean;
  trialEndsAt: string | null;
  limits: {
    maxCars: number | null;
    maxStaff: number | null;
    maxBookingsPerMonth: number | null;
  };
  features: string[];
  usage: { cars: number; staff: number; bookingsThisMonth: number };
  invoices: BillingInvoice[];
}

export function useBilling() {
  const [data, setData] = useState<BillingSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get<BillingSnapshot>('/agency/billing');
      setData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Could not load billing.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  return { data, isLoading, error, refetch: fetchBilling };
}
