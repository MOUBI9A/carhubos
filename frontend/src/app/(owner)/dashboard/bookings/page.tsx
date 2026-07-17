"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Car as CarIcon,
  Clock,
  CheckCircle2,
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
import { EmptyState } from '@/components/ui/EmptyState';
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

const DEPOSIT_STYLES: Record<string, string> = {
  PENDING: 'text-white/60 bg-white/5 border-white/10',
  HELD: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  RETURNED: 'text-success bg-success/10 border-success/20',
  CLAIMED: 'text-danger bg-danger/10 border-danger/20',
};

const INITIAL_FORM = { customerId: '', carId: '', startDate: '', endDate: '' };

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20';

export default function BookingsScheduler() {
  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useBookings();

  const [windowStart, setWindowStart] = useState(() => startOfDay(new Date()));
  // Captured once per mount — keeps render pure (react-hooks/purity)
  const [nowTs] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

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
      setSelectedBooking(null);
      showToast('success', 'Status Updated', `Booking is now ${BOOKING_STATUS_STYLES[to].label.toUpperCase()}.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update status';
      showToast('danger', 'Transition Blocked', Array.isArray(msg) ? msg.join(' ') : String(msg));
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
      await api.post('/bookings', form);
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Scheduler Offline</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[calc(100vw-2rem)] overflow-hidden pb-20">
      {/* ═══════ Header ═══════ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
            Visual <span className="text-primary">Scheduler</span>
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2">
            Real-Time Fleet Deployment & Availability Matrix
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shiftWindow(-7)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setWindowStart(startOfDay(new Date()))}
              className="px-3 text-[10px] font-black text-white uppercase italic hover:text-primary transition-colors"
              title="Jump to today"
            >
              {windowStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} — {days[DAYS_TO_SHOW - 1].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shiftWindow(7)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button className="h-10 bg-primary px-4" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

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
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border',
              statusFilter === 'ALL'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-white/5 text-white/40 border-white/5 hover:text-white/70',
            )}
          >
            All Active ({(data?.bookings ?? []).filter((b) => b.status !== 'CANCELLED').length})
          </button>
          {BOOKING_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2',
                statusFilter === s
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white/5 text-white/40 border-white/5 hover:text-white/70',
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
        <Card padding="none" className="glass border-white/5 overflow-hidden p-6 space-y-4">
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
        <EmptyState
          icon={CarIcon}
          title="No Fleet Assets"
          description="The scheduler needs vehicles to deploy. Register your fleet first, then reservations will appear on this timeline."
          action={
            <Link href="/dashboard/fleet">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Register Vehicles
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {(data?.bookings.length ?? 0) === 0 && (
            <div className="p-4 glass rounded-2xl border border-primary/20 bg-primary/[0.03] flex items-center gap-4">
              <CalendarDays className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs font-bold text-white/60">
                No reservations yet — the timeline is clear.{' '}
                <button onClick={() => setIsCreateModalOpen(true)} className="text-primary hover:underline font-black uppercase text-[10px] tracking-widest">
                  Create the first booking →
                </button>
              </p>
            </div>
          )}

          <Card padding="none" className="glass border-white/5 overflow-hidden">
            <div className="flex max-h-[600px] overflow-hidden">
              {/* Vertical Axis: Cars */}
              <div className="w-64 border-r border-white/10 flex-shrink-0 bg-white/5 z-10">
                <div className="h-16 border-b border-white/10 flex items-center px-6">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">
                    Fleet Assets ({data!.cars.length})
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[calc(600px-4rem)]">
                  {data!.cars.map((car) => (
                    <Link key={car.id} href={`/dashboard/fleet/${car.id}`}>
                      <div className="h-20 border-b border-white/5 px-6 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                        <div className="w-12 h-12 rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:ring-primary/50 transition-all flex items-center justify-center shrink-0">
                          <CarIcon className="w-6 h-6 text-white/25 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase italic leading-none truncate">
                            {car.brand} {car.model}
                          </p>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mt-1">
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
                <div className="inline-flex h-16 border-b border-white/10 bg-white/5 sticky top-0 z-10">
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-48 border-r border-white/5 flex flex-col items-center justify-center shrink-0',
                        day.toDateString() === new Date(nowTs).toDateString() && 'bg-primary/10',
                      )}
                    >
                      <span className="text-[10px] font-black text-white/40 uppercase">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-black text-white">
                        {day.getDate()}
                        <span className="text-white/30 text-[10px] ml-1">
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="relative inline-flex flex-col">
                  {data!.cars.map((car) => (
                    <div key={car.id} className="h-20 border-b border-white/5 inline-flex shrink-0 relative">
                      {days.map((_, i) => (
                        <div key={i} className="w-48 border-r border-white/[0.02] shrink-0" />
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
                                'absolute top-3 bottom-3 border p-3 flex flex-col justify-center cursor-pointer shadow-xl backdrop-blur-md transition-shadow hover:shadow-primary/20',
                                style.block,
                                geo.clippedLeft ? 'rounded-l-none border-l-2 border-l-white/40' : 'rounded-l-xl',
                                geo.clippedRight ? 'rounded-r-none border-r-2 border-r-white/40' : 'rounded-r-xl',
                              )}
                              style={{
                                left: `${geo.leftRem}rem`,
                                width: `${geo.widthRem}rem`,
                                marginLeft: '0.25rem',
                              }}
                            >
                              <div className="flex items-center justify-between gap-2 overflow-hidden">
                                <p className="text-[10px] font-black uppercase truncate italic">
                                  {booking.customer.firstName} {booking.customer.lastName}
                                </p>
                                <p className="text-[8px] font-bold opacity-60 shrink-0">
                                  {booking.totalPrice.toLocaleString()} MAD
                                </p>
                              </div>
                              <div className="flex items-center gap-1 mt-1 opacity-60">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-[8px] font-bold uppercase tracking-widest">
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
                      <div className="w-2 h-2 rounded-full bg-primary absolute -top-1 -left-[3px] shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex gap-6 p-4 glass rounded-2xl w-fit flex-wrap">
            {BOOKING_STATUSES.filter((s) => s !== 'CANCELLED').map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', BOOKING_STATUS_STYLES[s].dot)} />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  {BOOKING_STATUS_STYLES[s].label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════ Booking Detail Modal ═══════ */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
        description="Rental session control"
        size="md"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex items-center gap-6 p-6 glass rounded-3xl bg-primary/5 border-primary/20">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <CarIcon className="w-8 h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-black text-white uppercase italic truncate">
                  {selectedBooking.customer.firstName} {selectedBooking.customer.lastName}
                </h3>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedBooking.car.brand} {selectedBooking.car.model} • {selectedBooking.car.licensePlate}
                </p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedBooking.customer.phone}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 glass rounded-2xl border-white/5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Period</p>
                <p className="text-xs font-black text-white italic">
                  {formatDateLong(selectedBooking.startDate)} → {formatDateLong(selectedBooking.endDate)}
                </p>
                <p className="text-[9px] font-bold text-white/30 uppercase mt-1">
                  {billableDays(selectedBooking.startDate, selectedBooking.endDate)} billable day{billableDays(selectedBooking.startDate, selectedBooking.endDate) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-4 glass rounded-2xl border-white/5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Status</p>
                <span className={cn(
                  'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border inline-block',
                  BOOKING_STATUS_STYLES[selectedBooking.status].chip,
                )}>
                  {BOOKING_STATUS_STYLES[selectedBooking.status].label}
                </span>
              </div>
              <div className="p-4 glass rounded-2xl border-white/5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Price</p>
                <p className="text-sm font-black text-white italic">
                  {selectedBooking.totalPrice.toLocaleString()} <span className="text-[10px] text-white/40">MAD</span>
                </p>
              </div>
              <div className="p-4 glass rounded-2xl border-white/5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Deposit
                </p>
                <span className={cn(
                  'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border inline-block',
                  DEPOSIT_STYLES[selectedBooking.depositStatus] || DEPOSIT_STYLES.PENDING,
                )}>
                  {selectedBooking.depositStatus}
                  {selectedBooking.depositAmount > 0 && ` • ${selectedBooking.depositAmount.toLocaleString()} MAD`}
                </span>
              </div>
            </div>

            {/* Lifecycle actions */}
            {BOOKING_TRANSITIONS[selectedBooking.status].length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Lifecycle Actions</p>
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
              <Button variant="outline" className="flex-1 glass" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={() => downloadContract(selectedBooking.id)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <span className="animate-pulse italic">Constructing PDF...</span>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Contract
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
        title="Initialize Booking"
        description="Place a reservation on the schedule"
      >
        <form onSubmit={handleCreateBooking} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Customer *</p>
              <select
                required
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="">
                  {(data?.customers.length ?? 0) === 0 ? 'No customers registered' : 'Select Customer...'}
                </option>
                {data?.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} • {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Vehicle *</p>
              <select
                required
                value={form.carId}
                onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="">Select Vehicle...</option>
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
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Start Date *</p>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Return Date *</p>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="p-6 glass rounded-3xl flex items-center justify-between border-primary/20 bg-primary/[0.03] shadow-lg">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Pricing Vector</p>
              <p className="text-3xl font-black text-white tracking-tighter">
                {estimatedTotal > 0 ? estimatedTotal.toLocaleString() : '—'}{' '}
                <span className="text-sm text-white/40">MAD</span>
              </p>
            </div>
            <div className="text-right">
              {estimatedDays > 0 && selectedFormCar ? (
                <>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {estimatedDays} day{estimatedDays !== 1 ? 's' : ''} × {selectedFormCar.pricePerDay.toLocaleString()} MAD
                  </p>
                  <p className="text-[10px] font-black text-success uppercase mt-1 tracking-widest border border-success/20 px-2 py-0.5 rounded-full inline-block">
                    Live Estimate
                  </p>
                </>
              ) : (
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                  Select vehicle & dates
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeCreateModal} disabled={isMutating}>
              Abort
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isMutating}>
              {isMutating ? 'Executing...' : 'Execute Reservation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
