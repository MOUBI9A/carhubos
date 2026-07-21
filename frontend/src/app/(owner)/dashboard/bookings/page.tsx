"use client";

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  CalendarDays,
  Phone,
  Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useBookings } from './useBookings';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_STYLES,
  BOOKING_TRANSITIONS,
  MS_PER_DAY,
  billableDays,
  formatDateLong,
  startOfDay,
  type Booking,
  type BookingStatus,
} from './types';

const DAYS_TO_SHOW = 14;
const DAY_WIDTH_REM = 12; // w-48

/** Dot + Badge chrome for deposit status — colored signal comes from the dot, Badge stays neutral. */
const DEPOSIT_DOT: Record<string, string> = {
  PENDING: 'bg-text-faint',
  HELD: 'bg-warning',
  RETURNED: 'bg-success',
  CLAIMED: 'bg-danger',
};

const DEPOSIT_BADGE_VARIANT: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  HELD: 'secondary',
  RETURNED: 'outline',
  CLAIMED: 'destructive',
};

const STATUS_BADGE_VARIANT: Record<BookingStatus, 'outline' | 'secondary' | 'destructive'> = {
  REQUESTED: 'outline',
  APPROVED: 'secondary',
  ACTIVE: 'secondary',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

const INITIAL_FORM = {
  customerId: '',
  carId: '',
  startDate: '',
  endDate: '',
  depositAmount: '',
  depositMethod: 'CASH',
};

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

export default function BookingsScheduler() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();

  const [windowStart, setWindowStart] = useState(() => startOfDay(new Date()));
  // The scheduler loads only the bookings overlapping its visible window, so the
  // grid scales with what's on screen — not the agency's whole booking history.
  // Moving the window (shiftWindow / "Today") re-runs the windowed query.
  const rangeFrom = useMemo(() => windowStart.toISOString(), [windowStart]);
  const rangeTo = useMemo(() => {
    const end = new Date(windowStart);
    end.setDate(end.getDate() + DAYS_TO_SHOW);
    return end.toISOString();
  }, [windowStart]);
  const { data, isLoading, error, refetch } = useBookings(rangeFrom, rangeTo);

  // Captured once per mount — keeps render pure (react-hooks/purity)
  const [nowTs] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [claimAmount, setClaimAmount] = useState('');

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
        const d = new Date(windowStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [windowStart],
  );

  const statusCounts = useMemo(() => {
    const counts = { REQUESTED: 0, APPROVED: 0, ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const b of data?.bookings ?? []) counts[b.status]++;
    return counts;
  }, [data?.bookings]);

  const visibleBookings = useMemo(() => {
    const bookings = data?.bookings ?? [];
    if (statusFilter === 'ALL') return bookings.filter((b) => b.status !== 'CANCELLED');
    return bookings.filter((b) => b.status === statusFilter);
  }, [data?.bookings, statusFilter]);

  /** Maps a booking to its scheduler geometry, or null if outside the window. */
  const blockGeometry = (booking: Booking) => {
    const start = startOfDay(new Date(booking.startDate)).getTime();
    const end = startOfDay(new Date(booking.endDate)).getTime();
    const offset = Math.round((start - windowStart.getTime()) / MS_PER_DAY);
    const endOffset = Math.round((end - windowStart.getTime()) / MS_PER_DAY);

    const rawRightEdge = Math.max(endOffset, offset + 1); // occupy [start, end), min 1 day
    const leftCell = Math.max(offset, 0);
    const rightEdge = Math.min(rawRightEdge, DAYS_TO_SHOW);
    if (rightEdge <= leftCell) return null; // fully outside the window

    return {
      leftRem: leftCell * DAY_WIDTH_REM,
      widthRem: (rightEdge - leftCell) * DAY_WIDTH_REM - 0.5,
      clippedLeft: offset < 0,
      clippedRight: rawRightEdge > DAYS_TO_SHOW,
    };
  };

  const nowOffsetDays = (nowTs - windowStart.getTime()) / MS_PER_DAY;
  const showTodayLine = nowOffsetDays >= 0 && nowOffsetDays < DAYS_TO_SHOW;

  const shiftWindow = (deltaDays: number) => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + deltaDays);
    setWindowStart(startOfDay(d));
  };

  // ── Mutations ─────────────────────────────────────────────────────
  const downloadContract = async (bookingId: string) => {
    setIsDownloading(true);
    showToast('pulse', 'Generating PDF', 'Constructing forensic contract document...');
    try {
      const response = await api.get(`/bookings/${bookingId}/contract`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Contract Ready', 'The signed PDF has been downloaded.');
    } catch {
      showToast('danger', 'Generation Failed', 'The PDF engine could not render this contract.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStatusChange = async (booking: Booking, to: BookingStatus) => {
    setIsMutating(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status: to });
      showToast('success', 'Status Updated', `Booking is now ${BOOKING_STATUS_STYLES[to].label}.`);
      if (to === 'COMPLETED') {
        setSelectedBooking(null);
        setReviewBooking(booking);
        setReviewRating(5);
        setReviewComment('');
      } else {
        setSelectedBooking(null);
      }
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update status';
      showToast('danger', 'Transition Blocked', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDepositAction = async (
    booking: Booking,
    action: 'HOLD' | 'RETURN' | 'CLAIM',
  ) => {
    setIsMutating(true);
    try {
      const body: { action: string; claimAmount?: number; note?: string } = { action };
      if (action === 'CLAIM') {
        const extra = Number(claimAmount);
        if (Number.isFinite(extra) && extra > 0) body.claimAmount = extra;
        body.note = 'Damage claim from bookings UI';
      }
      const { data } = await api.patch(`/bookings/${booking.id}/deposit`, body);
      setSelectedBooking({ ...booking, ...data });
      setClaimAmount('');
      showToast(
        'success',
        `Deposit ${action}`,
        action === 'HOLD'
          ? 'Security deposit is now held.'
          : action === 'RETURN'
            ? 'Deposit returned to the renter.'
            : 'Deposit claimed; damage charge recorded if set.',
      );
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Deposit action failed';
      showToast('danger', 'Deposit Blocked', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleCaptureDeposit = async (booking: Booking) => {
    const amount = Number(claimAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('danger', 'Invalid Amount', 'Enter a positive deposit amount.');
      return;
    }
    setIsMutating(true);
    try {
      const { data } = await api.post(`/bookings/${booking.id}/deposit`, {
        amount,
        method: 'CASH',
      });
      setSelectedBooking({ ...booking, ...data });
      setClaimAmount('');
      showToast('success', 'Deposit Captured', `${amount.toLocaleString()} MAD set as security deposit.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not capture deposit';
      showToast('danger', 'Capture Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setIsMutating(true);
    try {
      await api.post('/trust/reviews', {
        bookingId: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      showToast('success', 'Review Filed', 'Network reputation updated for this renter.');
      setReviewBooking(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not file review';
      showToast('danger', 'Review Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setForm(INITIAL_FORM);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.carId || !form.startDate || !form.endDate) {
      showToast('danger', 'Missing Fields', 'Customer, vehicle and both dates are required.');
      return;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      showToast('danger', 'Invalid Dates', 'The return date must be after the start date.');
      return;
    }
    setIsMutating(true);
    try {
      const depositNum = Number(form.depositAmount);
      await api.post('/bookings', {
        customerId: form.customerId,
        carId: form.carId,
        startDate: form.startDate,
        endDate: form.endDate,
        ...(Number.isFinite(depositNum) && depositNum > 0
          ? { depositAmount: depositNum, depositMethod: form.depositMethod }
          : {}),
      });
      closeCreateModal();
      showToast('success', 'Booking Confirmed', 'The reservation has been placed on the schedule.');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create booking';
      showToast('danger', 'Booking Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const selectedFormCar = data?.cars.find((c) => c.id === form.carId);
  const estimatedDays =
    form.startDate && form.endDate && new Date(form.startDate) < new Date(form.endDate)
      ? billableDays(form.startDate, form.endDate)
      : 0;
  const estimatedTotal =
    selectedFormCar && estimatedDays > 0 ? estimatedDays * selectedFormCar.pricePerDay : 0;

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">Scheduler offline</p>
          <p className="text-sm text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 me-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[calc(100vw-2rem)] overflow-hidden pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('bookingPlanner')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Real-time fleet deployment and availability
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-hairline">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shiftWindow(-7)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setWindowStart(startOfDay(new Date()))}
              className="px-3 text-xs font-medium text-foreground hover:text-primary transition-colors"
              title="Jump to today"
            >
              {windowStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} — {days[DAYS_TO_SHOW - 1].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shiftWindow(7)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            New booking
          </Button>
        </div>
      </header>

      {/* ═══════ Status filter strip ═══════ */}
      {isLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border',
              statusFilter === 'ALL'
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-surface text-text-muted border-hairline hover:text-foreground',
            )}
          >
            All active ({(data?.bookings ?? []).filter((b) => b.status !== 'CANCELLED').length})
          </button>
          {BOOKING_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-surface text-text-muted border-hairline hover:text-foreground',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', BOOKING_STATUS_STYLES[s].dot)} />
              {BOOKING_STATUS_STYLES[s].label} ({statusCounts[s]})
            </button>
          ))}
        </div>
      )}

      {/* ═══════ Scheduler ═══════ */}
      {isLoading ? (
        <Card padding="none" className="overflow-hidden p-6 space-y-4">
          <div className="flex gap-4">
            <Skeleton className="w-64 h-16 rounded-xl shrink-0" />
            <Skeleton className="flex-1 h-16 rounded-xl" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-64 h-20 rounded-xl shrink-0" />
              <Skeleton className="flex-1 h-20 rounded-xl" />
            </div>
          ))}
        </Card>
      ) : (data?.cars.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="font-medium text-foreground">No vehicles yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              The scheduler needs vehicles to deploy. Register your fleet first, then reservations will appear on this timeline.
            </p>
          </div>
          <Link href="/dashboard/fleet">
            <Button>
              <Plus className="w-4 h-4 me-2" /> Register vehicles
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {(data?.bookings.length ?? 0) === 0 && (
            <div className="p-4 bg-surface border border-hairline rounded-2xl flex items-center gap-4">
              <CalendarDays className="w-5 h-5 text-text-faint shrink-0" />
              <p className="text-sm text-text-muted">
                No reservations yet — the timeline is clear.{' '}
                <button onClick={() => setIsCreateModalOpen(true)} className="text-primary hover:underline font-medium">
                  Create the first booking →
                </button>
              </p>
            </div>
          )}

          <Card padding="none" className="overflow-hidden">
            <div className="flex max-h-[600px] overflow-hidden">
              {/* Vertical Axis: Cars */}
              <div className="w-64 border-r border-hairline flex-shrink-0 bg-surface-raised z-10">
                <div className="h-16 border-b border-hairline flex items-center px-6">
                  <span className="eyebrow">
                    Fleet assets ({data!.cars.length})
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[calc(600px-4rem)]">
                  {data!.cars.map((car) => (
                    <Link key={car.id} href={`/dashboard/fleet/${car.id}`}>
                      <div className="h-20 border-b border-hairline px-6 flex items-center gap-3 hover:bg-surface-raised transition-colors cursor-pointer group">
                        <CarPhoto
                          alt={`${car.brand} ${car.model}`}
                          rounded="rounded-lg"
                          className="w-14 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                            {car.brand} {car.model}
                          </p>
                          <p className="mt-0.5 font-mono tabular text-[11px] text-text-faint">
                            {car.licensePlate}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="flex-1 overflow-x-auto overflow-y-auto relative">
                {/* Horizontal Axis: Dates */}
                <div className="inline-flex h-16 border-b border-hairline bg-surface-raised sticky top-0 z-10">
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-48 border-r border-hairline flex flex-col items-center justify-center shrink-0',
                        day.toDateString() === new Date(nowTs).toDateString() && 'bg-primary/10',
                      )}
                    >
                      <span className="eyebrow">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {day.getDate()}
                        <span className="text-text-faint text-xs ms-1 font-normal">
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="relative inline-flex flex-col">
                  {data!.cars.map((car) => (
                    <div key={car.id} className="h-20 border-b border-hairline inline-flex shrink-0 relative">
                      {days.map((_, i) => (
                        <div key={i} className="w-48 border-r border-hairline/30 shrink-0" />
                      ))}

                      {visibleBookings
                        .filter((b) => b.carId === car.id)
                        .map((booking) => {
                          const geo = blockGeometry(booking);
                          if (!geo) return null;
                          const style = BOOKING_STATUS_STYLES[booking.status];
                          return (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.02, zIndex: 20 }}
                              onClick={() => setSelectedBooking(booking)}
                              className={cn(
                                'absolute top-3 bottom-3 border p-3 flex flex-col justify-center cursor-pointer shadow-sm transition-shadow',
                                style.block,
                                geo.clippedLeft ? 'rounded-l-none border-l-2 border-l-foreground/40' : 'rounded-l-xl',
                                geo.clippedRight ? 'rounded-r-none border-r-2 border-r-foreground/40' : 'rounded-r-xl',
                              )}
                              style={{
                                left: `${geo.leftRem}rem`,
                                width: `${geo.widthRem}rem`,
                                marginLeft: '0.25rem',
                              }}
                            >
                              <div className="flex items-center justify-between gap-2 overflow-hidden">
                                <p className="text-[11px] font-medium truncate">
                                  {booking.customer.firstName} {booking.customer.lastName}
                                </p>
                                <p className="text-[10px] font-mono tabular opacity-70 shrink-0">
                                  {booking.totalPrice.toLocaleString()} MAD
                                </p>
                              </div>
                              <div className="flex items-center gap-1 mt-1 opacity-70">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-[10px]">
                                  {style.label} • {billableDays(booking.startDate, booking.endDate)}d
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  ))}

                  {/* Live "now" indicator */}
                  {showTodayLine && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-[5] pointer-events-none"
                      style={{ left: `${nowOffsetDays * DAY_WIDTH_REM}rem` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-primary absolute -top-1 -left-[3px]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex gap-6 p-4 bg-surface border border-hairline rounded-2xl w-fit flex-wrap">
            {BOOKING_STATUSES.filter((s) => s !== 'CANCELLED').map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', BOOKING_STATUS_STYLES[s].dot)} />
                <span className="eyebrow">{BOOKING_STATUS_STYLES[s].label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════ Booking Detail Modal ═══════ */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking details"
        description="Manage this reservation"
        size="md"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Renter */}
            <div className="flex items-center gap-4">
              <Avatar
                name={`${selectedBooking.customer.firstName} ${selectedBooking.customer.lastName}`}
                size={56}
              />
              <div className="min-w-0">
                <p className="eyebrow">Renter</p>
                <h3 className="text-lg font-semibold tracking-tight text-foreground truncate">
                  {selectedBooking.customer.firstName} {selectedBooking.customer.lastName}
                </h3>
                <p className="mt-0.5 text-xs text-text-muted flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedBooking.customer.phone}
                </p>
              </div>
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-4 rounded-2xl bg-surface border border-hairline p-3">
              <CarPhoto
                alt={`${selectedBooking.car.brand} ${selectedBooking.car.model}`}
                plate={selectedBooking.car.licensePlate}
                className="w-20 shrink-0"
                rounded="rounded-lg"
              />
              <div className="min-w-0">
                <p className="eyebrow">Vehicle</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedBooking.car.brand} {selectedBooking.car.model}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface border border-hairline rounded-2xl">
                <p className="eyebrow mb-1">Period</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDateLong(selectedBooking.startDate)} → {formatDateLong(selectedBooking.endDate)}
                </p>
                <p className="text-xs text-text-faint mt-1">
                  {billableDays(selectedBooking.startDate, selectedBooking.endDate)} billable day{billableDays(selectedBooking.startDate, selectedBooking.endDate) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-4 bg-surface border border-hairline rounded-2xl">
                <p className="eyebrow mb-1.5">Status</p>
                <Badge variant={STATUS_BADGE_VARIANT[selectedBooking.status]}>
                  <span className={cn('me-1 w-1.5 h-1.5 rounded-full', BOOKING_STATUS_STYLES[selectedBooking.status].dot)} />
                  {BOOKING_STATUS_STYLES[selectedBooking.status].label}
                </Badge>
              </div>
              <div className="p-4 bg-surface border border-hairline rounded-2xl">
                <p className="eyebrow mb-1">Total price</p>
                <p className="text-sm font-semibold text-foreground">
                  <span className="font-mono tabular">{selectedBooking.totalPrice.toLocaleString()}</span>{' '}
                  <span className="text-xs font-normal text-text-faint">MAD</span>
                </p>
              </div>
              <div className="p-4 bg-surface border border-hairline rounded-2xl">
                <p className="eyebrow mb-1.5 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Deposit
                </p>
                <Badge variant={DEPOSIT_BADGE_VARIANT[selectedBooking.depositStatus] ?? 'outline'}>
                  <span className={cn('me-1 w-1.5 h-1.5 rounded-full', DEPOSIT_DOT[selectedBooking.depositStatus] ?? DEPOSIT_DOT.PENDING)} />
                  {selectedBooking.depositStatus.toLowerCase()}
                  {selectedBooking.depositAmount > 0 && ` • ${selectedBooking.depositAmount.toLocaleString()} MAD`}
                </Badge>
              </div>
            </div>

            {/* Deposit lifecycle */}
            <div className="space-y-3">
              <p className="eyebrow px-1">Security deposit</p>
              {selectedBooking.depositStatus === 'PENDING' && selectedBooking.depositAmount <= 0 && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount MAD"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className={cn(inputCls, 'flex-1')}
                  />
                  <Button disabled={isMutating} onClick={() => handleCaptureDeposit(selectedBooking)}>
                    Capture
                  </Button>
                </div>
              )}
              {selectedBooking.depositStatus === 'PENDING' && selectedBooking.depositAmount > 0 && (
                <Button
                  className="w-full"
                  disabled={isMutating}
                  onClick={() => handleDepositAction(selectedBooking, 'HOLD')}
                >
                  Hold deposit ({selectedBooking.depositAmount.toLocaleString()} MAD)
                </Button>
              )}
              {selectedBooking.depositStatus === 'HELD' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isMutating}
                      onClick={() => handleDepositAction(selectedBooking, 'RETURN')}
                    >
                      Return deposit
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      disabled={isMutating}
                      onClick={() => handleDepositAction(selectedBooking, 'CLAIM')}
                    >
                      Claim deposit
                    </Button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Extra damage charge (MAD, optional)"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Lifecycle actions */}
            {BOOKING_TRANSITIONS[selectedBooking.status].length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow px-1">Lifecycle actions</p>
                <div className="flex gap-3">
                  {BOOKING_TRANSITIONS[selectedBooking.status].map((action) => (
                    <Button
                      key={action.to}
                      variant={action.variant}
                      className="flex-1"
                      disabled={isMutating}
                      onClick={() => handleStatusChange(selectedBooking, action.to)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => downloadContract(selectedBooking.id)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <span className="animate-pulse">Preparing PDF…</span>
                ) : (
                  <>
                    <Download className="w-4 h-4 me-2" />
                    Download contract
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════ New Booking Modal ═══════ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="New booking"
        description="Place a reservation on the schedule"
      >
        <form onSubmit={handleCreateBooking} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Customer *</p>
              <select
                required
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="">
                  {(data?.customers.length ?? 0) === 0 ? 'No customers registered' : 'Select customer...'}
                </option>
                {data?.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} • {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Vehicle *</p>
              <select
                required
                value={form.carId}
                onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="">Select vehicle...</option>
                {data?.cars
                  .filter((c) => c.status === 'AVAILABLE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.licensePlate}) — {c.pricePerDay.toLocaleString()} MAD/d
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Start date *</p>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Return date *</p>
              <input
                type="date"
                required
                min={form.startDate || new Date().toISOString().slice(0, 10)}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Security deposit (MAD)</p>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.depositAmount}
                onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Deposit method</p>
              <select
                value={form.depositMethod}
                onChange={(e) => setForm((f) => ({ ...f, depositMethod: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>

          <div className="p-6 rounded-3xl flex items-center justify-between bg-surface border border-hairline">
            <div>
              <p className="eyebrow mb-1">Estimated total</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                <span className="font-mono tabular">{estimatedTotal > 0 ? estimatedTotal.toLocaleString() : '—'}</span>{' '}
                <span className="text-sm font-normal text-text-faint">MAD</span>
              </p>
            </div>
            <div className="text-end">
              {estimatedDays > 0 && selectedFormCar ? (
                <>
                  <p className="text-xs text-text-muted">
                    <span className="font-mono tabular">{estimatedDays}</span> day{estimatedDays !== 1 ? 's' : ''} × <span className="font-mono tabular">{selectedFormCar.pricePerDay.toLocaleString()}</span> MAD
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live estimate
                  </span>
                </>
              ) : (
                <p className="text-xs text-text-faint">Select vehicle and dates</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeCreateModal} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isMutating}>
              {isMutating ? 'Booking...' : 'Confirm booking'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Leave-a-review prompt after completion */}
      <Modal
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        title="Leave a renter review"
        description="Rate this completed rental for the trust network"
      >
        {reviewBooking && (
          <form onSubmit={handleSubmitReview} className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar
                name={`${reviewBooking.customer.firstName} ${reviewBooking.customer.lastName}`}
                size={40}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {reviewBooking.customer.firstName} {reviewBooking.customer.lastName}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {reviewBooking.car.brand} {reviewBooking.car.model}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Rating (1–5)</p>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className={cn(inputCls, 'appearance-none')}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Comment (optional)</p>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className={cn(inputCls, 'min-h-[90px]')}
                placeholder="How did the rental go?"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setReviewBooking(null)}>
                Skip
              </Button>
              <Button type="submit" className="flex-1" disabled={isMutating}>
                Submit review
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
