"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { History, Calendar, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/lib/useFormat';
import { BOOKING_STATUS_STYLES, type PortalBooking } from '../types';

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
  const t = useTranslations('renterHistory');
  const { date, money } = useFormat();
  const { bookings, isLoading, error, refetch } = useRenterBookings();
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-text-muted mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/portal/book">
          <Button variant="outline">
            <Plus className="w-4 h-4 me-2" />
            {t('bookCar')}
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-6">
              <Skeleton className="w-24 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/5 h-2.5" />
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
            <p className="text-sm font-semibold text-foreground">{t('historyUnavailable')}</p>
            <p className="text-xs text-text-muted mt-2 max-w-sm leading-relaxed">{error}</p>
          </div>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 me-2" /> {t('retry')}
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <Card padding="none" className="overflow-hidden animate-in fade-in duration-500">
          <AgencyImage
            src="/img/car-street.webp"
            alt=""
            slot="car"
            ratio="21 / 9"
            rounded="rounded-none"
          />
          <div className="px-8 py-10 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{t('noRentals')}</h3>
            <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">{t('noRentalsBody')}</p>
            <div className="mt-6">
              <Link href="/portal/book">
                <Button>
                  <Plus className="w-4 h-4 me-2" /> {t('bookFirst')}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bookings.map((item) => {
            const style = BOOKING_STATUS_STYLES[item.status];
            return (
              <Card
                key={item.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-5 min-w-0">
                  <CarPhoto
                    alt={`${item.car.brand} ${item.car.model}`}
                    className="w-24 shrink-0"
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-lg tracking-tight text-foreground truncate">
                      {item.car.brand} {item.car.model}{' '}
                      <span className="text-text-faint text-sm font-normal">{item.car.year}</span>
                    </h4>
                    <p className="font-mono tabular text-[11px] text-text-faint tracking-wide mt-0.5">
                      {item.car.licensePlate}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-faint shrink-0" />
                        <span className="text-xs text-text-muted">
                          {date(item.startDate)} – {date(item.endDate)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'w-fit flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                          style.chip,
                        )}
                      >
                        {style.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-hairline pt-4 md:pt-0 shrink-0">
                  <div className="text-start md:text-end">
                    <p className="eyebrow text-text-faint">{t('totalPrice')}</p>
                    <p className="text-lg font-semibold font-mono tabular text-foreground mt-0.5">{money(item.totalPrice)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !error && bookings.length > 0 && (
        <Card variant="outline" className="border-success/20 bg-success/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
              <History className="w-6 h-6 text-success" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t('summary')}</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                <span className="text-foreground font-semibold">{bookings.length}</span> {bookings.length === 1 ? t('rentalSingular') : t('rentalPlural')} · <span className="text-success font-semibold">{completedCount}</span> {t('completed')}.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
