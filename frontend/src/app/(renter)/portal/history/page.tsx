"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { History, Calendar, Car, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { BOOKING_STATUS_STYLES, formatDate, type PortalBooking } from '../types';

function errMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.message || fallback;
}

function useRenterBookings() {
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get<PortalBooking[]>('/portal/bookings');
      setBookings(data);
    } catch (err: any) {
      setError(errMessage(err, 'Could not load your rental history.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, isLoading, error, refetch: fetchBookings };
}

export default function RentalHistory() {
  const { bookings, isLoading, error, refetch } = useRenterBookings();
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Rental History</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">
            Your Journey Ledger & Receipts
          </p>
        </div>
        <Link href="/portal/book">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Book a Car
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="outline" className="flex items-center gap-6">
              <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
              <Skeleton className="w-20 h-8 rounded-lg shrink-0" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-white/80 uppercase tracking-tight">History Unavailable</p>
            <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
          </div>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Rentals Yet"
          description="Your completed and upcoming rentals will appear here once you book your first car."
          action={
            <Link href="/portal/book">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Book Your First Car
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bookings.map((item) => {
            const style = BOOKING_STATUS_STYLES[item.status];
            return (
              <Card
                key={item.id}
                variant="outline"
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-6 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Car className="w-6 h-6 text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-lg text-white truncate">
                      {item.car.brand} {item.car.model}{' '}
                      <span className="text-white/30 text-sm font-medium">{item.car.year}</span>
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-white/20 shrink-0" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                          {formatDate(item.startDate)} – {formatDate(item.endDate)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'w-fit flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                          style.chip,
                        )}
                      >
                        {style.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Price</p>
                    <p className="text-lg font-black text-white">{item.totalPrice.toLocaleString()} MAD</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !error && bookings.length > 0 && (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
              <History className="w-6 h-6 text-success" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Rental Summary</h4>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                You have <span className="text-white font-bold">{bookings.length}</span> rental
                {bookings.length !== 1 ? 's' : ''} on record, <span className="text-success font-bold">{completedCount}</span>{' '}
                completed.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
