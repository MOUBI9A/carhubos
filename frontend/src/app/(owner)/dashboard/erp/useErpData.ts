"use client";

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface ErpData {
  gmv: { value: number; changePercent: number };
  efficiency: { score: number };
  fleetHealth: { percent: number; changePercent: number };
  utilization: { percent: number };
  monthlyData: Array<{ month: string; revenue: number; expenses: number }>;
  exceptions: Array<{ id: string; msg: string; severity: string; link: string }>;
  advisor: { message: string; action: string };
  forecast: {
    projected30Day: number;
    inflows: Array<{ source: string; amount: number; date: string }>;
    outflows: Array<{ source: string; amount: number; date: string }>;
  };
  branches: Array<{
    name: string;
    city: string;
    revenue: number;
    bookings: number;
    activeBookings: number;
    utilization: number;
    fleetSize: number;
    healthScore: number;
  }>;
}

export function useErpData() {
  const [data, setData] = useState<ErpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/analytics/erp-dashboard');
      setData(res.data);
    } catch (err: any) {
      console.error('ERP Dashboard fetch error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load ERP data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportPnL = useCallback(() => {
    if (!data) return;

    const rows = [
      ['Month', 'Revenue (MAD)', 'Expenses (MAD)', 'Net (MAD)'],
      ...data.monthlyData.map((m) => [
        m.month,
        m.revenue.toString(),
        m.expenses.toString(),
        (m.revenue - m.expenses).toString(),
      ]),
      [],
      ['TOTAL', 
        data.monthlyData.reduce((s, m) => s + m.revenue, 0).toString(),
        data.monthlyData.reduce((s, m) => s + m.expenses, 0).toString(),
        data.monthlyData.reduce((s, m) => s + (m.revenue - m.expenses), 0).toString(),
      ],
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titan-erp-pnl-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return { data, isLoading, error, refetch: fetchData, exportPnL };
}
