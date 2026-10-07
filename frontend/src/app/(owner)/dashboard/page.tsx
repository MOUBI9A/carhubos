"use client";

import { useTranslations, useFormatter } from 'next-intl';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  TrendingUp, 
  Users, 
  Car, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  Zap,
  Activity,
  Plus,
  QrCode,
  DollarSign,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wrench,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { useCommandCentre, commandCentreKeys } from './useCommandCentre';
import api from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Combobox } from '@/components/ui/Combobox';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Skeleton, SkeletonCard, SkeletonRows } from '@/components/ui/Skeleton';
import { CarPhoto } from '@/components/ui/AgencyImage';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { SrDataTable } from '@/components/ui/SrDataTable';
import { useFormat } from '@/lib/useFormat';
import { useCustomerRisk } from './useCustomerRisk';
import { RiskAssessmentPanel } from './components/RiskAssessmentPanel';

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function OwnerDashboard() {
  const t = useTranslations('ownerPages');
  const td = useTranslations('commandCentre');
  const { money, number } = useFormat();
  // Locale-aware number formatting (next-intl) — not the browser's locale. Matters
  // most in the SR data table, which a screen reader reads verbatim.
  const format = useFormatter();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useCommandCentre();
  const [creatingTask, setCreatingTask] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [selectedCarId, setSelectedCarId] = useState('');
  const [bookingPrice, setBookingPrice] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [walkIn, setWalkIn] = useState({ firstName: '', lastName: '', phone: '', identityNumber: '' });
  const [overrideReason, setOverrideReason] = useState('');
  // Customers registered from within the modal (kept locally so the
  // dashboard doesn't have to refetch mid-flow).
  const [localCustomers, setLocalCustomers] = useState<Array<{ id: string; label: string; phone: string }>>([]);

  // Pillar 6: live cross-agency risk assessment for the selected renter.
  const risk = useCustomerRisk(isBookingModalOpen && selectedCustomerId ? selectedCustomerId : null);

  const customerOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return [...localCustomers, ...(data?.customers ?? [])].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [localCustomers, data?.customers]);

  const handleCarSelect = (carId: string) => {
    setSelectedCarId(carId);
    const car = data?.availableCars.find((c) => c.id === carId);
    setBookingPrice(car?.pricePerDay || 0);
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setOverrideReason('');
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setIsRegisterOpen(false);
    setSelectedCustomerId('');
    setSelectedCarId('');
    setBookingPrice(0);
    setOverrideReason('');
    setWalkIn({ firstName: '', lastName: '', phone: '', identityNumber: '' });
  };

  const handleQuickRegister = async () => {
    const { firstName, lastName, phone, identityNumber } = walkIn;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !identityNumber.trim()) {
      showToast('danger', td('missingFields'), td('registrationRequired'));
      return;
    }
    if (isRegistering) return;
    setIsRegistering(true);
    try {
      const res = await api.post('/customers', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        identityType: 'CIN',
        identityNumber: identityNumber.trim(),
      });
      const created = {
        id: res.data.id,
        label: `${res.data.firstName} ${res.data.lastName}`,
        phone: res.data.phone,
      };
      setLocalCustomers((prev) => [created, ...prev]);
      handleCustomerSelect(created.id);
      setIsRegisterOpen(false);
      setWalkIn({ firstName: '', lastName: '', phone: '', identityNumber: '' });
      showToast('success', td('customerRegistered'), td('registeredBody', { name: created.label }));
    } catch (err: any) {
      showToast('danger', td('registrationFailed'), td('registrationFailedBody'));
    } finally {
      setIsRegistering(false);
    }
  };

  // The modal stays open with the entered data while the request is in flight
  // (the submit button shows a loading state) and only closes on SUCCESS — so a
  // failed booking keeps everything the user typed instead of discarding it.
  const bookingMutation = useMutation({
    mutationFn: (payload: {
      carId: string; customerId: string; startDate: string; endDate: string; overrideReason?: string;
    }) => api.post('/bookings', payload),
    onSuccess: () => {
      closeBookingModal();
      showToast('success', td('bookingConfirmed'), td('bookingConfirmedBody'));
      queryClient.invalidateQueries({ queryKey: commandCentreKeys.all });
    },
    onError: (err: any) => {
      // Leave the modal open with the form data intact so the user can correct
      // and retry without re-entering everything.
      showToast('danger', td('bookingFailed'), td(err.response?.data?.code === 'TRUST_OVERRIDE_FORBIDDEN' ? 'overrideForbidden' : 'bookingFailedBody'));
      // Resync in case the server partially applied or state drifted.
      queryClient.invalidateQueries({ queryKey: commandCentreKeys.all });
    },
  });

  const handleNewBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingMutation.isPending) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    if (!selectedCarId || !startDate || !endDate) {
      showToast('danger', td('missingFields'), td('requiredBody'));
      return;
    }
    if (!selectedCustomerId) {
      showToast('danger', td('customerRequired'), td('customerRequiredBody'));
      return;
    }
    if (!Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)) || startDate < localToday() || new Date(startDate) >= new Date(endDate)) {
      showToast('danger', td('invalidDates'), td('invalidDatesBody'));
      return;
    }
    // Pillar 6: a Trust Network hard-lock needs a manager override reason.
    if (risk.data?.blocked && !overrideReason.trim()) {
      showToast('danger', td('renterBlocked'), td('renterBlockedBody'));
      return;
    }

    const payload = {
      carId: selectedCarId,
      customerId: selectedCustomerId,
      startDate,
      endDate,
      ...(risk.data?.blocked && overrideReason.trim() ? { overrideReason: overrideReason.trim() } : {}),
    };
    bookingMutation.mutate(payload);
  };

  const openGuardianModal = (block: any) => {
    setSelectedBlock(block);
    setIsGuardianModalOpen(true);
  };

  const documentLabel = (value: string) => {
    const code = value.replace(/ /g, '_');
    const known = (['INSURANCE', 'CARTE_GRISE', 'TECHNICAL_INSPECTION', 'VIGNETTE'] as const).find((entry) => entry === code);
    return known ? td(known) : value;
  };
  const riskLabel = (value: string) => {
    if (value === 'EXPIRED') return td('expired');
    const days = /^(\d+) DAYS LEFT$/.exec(value);
    return days ? td('daysLeft', { days: number(Number(days[1])) }) : value;
  };
  const actionLabel = (value: string) => {
    const keys = { 'New Booking': 'activityNewBooking', 'Car Added': 'activityCarAdded', 'Car Updated': 'activityCarUpdated', 'Price Updated': 'activityPriceUpdated', 'Booking Status Changed': 'activityBookingStatus', 'Car Removed': 'activityCarRemoved' } as const;
    return td(keys[value as keyof typeof keys] ?? 'activityOther');
  };
  const activityTime = (value: string) => {
    if (value === 'Just now') return td('justNow');
    const match = /^(\d+)(m|h|d)$/.exec(value);
    if (!match) return value;
    const key = match[2] === 'm' ? 'minutesAgo' : match[2] === 'h' ? 'hoursAgo' : 'daysAgo';
    return td(key, { count: number(Number(match[1])) });
  };
  const createRenewalTask = async () => {
    if (!selectedBlock || creatingTask) return;
    setCreatingTask(true);
    try {
      await api.post('/tasks', {
        title: td('renewalTitle', { type: documentLabel(selectedBlock.type), car: selectedBlock.car, plate: selectedBlock.plate }),
        description: td('blockSummary', { type: documentLabel(selectedBlock.type), car: selectedBlock.car, plate: selectedBlock.plate, risk: riskLabel(selectedBlock.risk) }),
        priority: selectedBlock.severity === 'danger' ? 'URGENT' : 'HIGH',
      });
      setIsGuardianModalOpen(false);
      showToast('success', td('taskCreated'), td('taskCreatedBody'));
    } catch {
      showToast('danger', td('actionFailed'), td('taskFailed'));
    } finally {
      setCreatingTask(false);
    }
  };

  // ── Loading State ──────────────────────────────────────────────
  // Skeleton mirrors the real layout so nothing jumps when data lands.
  if (isLoading) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="w-64 h-9" />
            <Skeleton className="w-44 h-3" />
          </div>
          <Skeleton className="w-40 h-11 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Skeleton className="h-96 rounded-2xl" />
            <div className="glass rounded-2xl p-6">
              <SkeletonRows rows={4} />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-8">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold tracking-tight text-foreground">{td('offline')}</p>
          <p className="text-xs text-text-muted mt-2 max-w-sm">{td('loadFailed')}</p>
        </div>
        <Button variant="outline" onClick={refetch}><RefreshCw className="w-4 h-4 me-2" /> {td('reconnect')}</Button>
      </div>
    );
  }

  if (!data) return null;

  // Chart calculations
  const chartMax = Math.max(...data.dailyIntensity.map((d) => d.revenue), 1);
  const healthStatus = data.guardianBlocks.length === 0 ? 'Nominal' : 
    data.guardianBlocks.some(b => b.severity === 'danger') ? 'Critical' : 'Warning';
  const healthColor = healthStatus === 'Nominal' ? 'bg-success' : healthStatus === 'Critical' ? 'bg-danger' : 'bg-warning';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 text-foreground">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('commandCenter')}</h1>
          <p className="mt-1.5 flex items-center gap-2 eyebrow">
            <span className={cn("w-1.5 h-1.5 rounded-full", healthColor)} />
            {td('health', { status: td(healthStatus) })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="hidden sm:flex" onClick={() => router.push('/dashboard/finance')}>
            <Wallet className="w-4 h-4 me-2" />
            {td('financialLedger')}
          </Button>
          <Button onClick={() => setIsBookingModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {td('newBooking')}
          </Button>
        </div>
      </header>

      {/* ═══════ Primary metrics ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net revenue MTD — the page's single brass hero figure */}
        <Card
          as="button"
          className="group cursor-pointer"
          onClick={() => router.push('/dashboard/finance')}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">{td('netRevenue')}</p>
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium", data.revenue.growth >= 0 ? "text-success" : "text-danger")}>
              {data.revenue.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {number(Math.abs(data.revenue.growth) / 100, { style: 'percent', maximumFractionDigits: 1 })}
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            <span className="font-mono tabular metal-text"><bdi><AnimatedNumber value={data.revenue.mtd} format={money} /></bdi></span>

          </p>
          <p className="mt-1 text-xs text-text-muted">{td('netRevenueBody')}</p>
        </Card>

        {/* Fleet utilization */}
        <Card
          as="button"
          className="group cursor-pointer"
          onClick={() => router.push('/dashboard/fleet')}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">{td('fleetUtilization')}</p>
            <span className="text-xs font-medium text-text-muted">
              <span className="font-mono tabular">{td('rentedCount', { rented: number(data.fleet.rented), total: number(data.fleet.total) })}</span>
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            <span className="font-mono tabular"><AnimatedNumber value={data.utilization.percent} /></span>
            <span className="ms-1.5 text-sm font-normal text-text-faint">%</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">{td('vehiclesOnRent')}</p>
        </Card>

        {/* Guardian blocks */}
        <Card
          as="button"
          className="group cursor-pointer"
          onClick={() => {
            if (data.guardianBlocks.length > 0) {
              openGuardianModal(data.guardianBlocks[0]);
            } else {
              showToast('success', td('allClear'), td('allClearBody'));
            }
          }}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">{td('guardianBlocks')}</p>
            {data.guardianBlocks.length > 0 ? (
              <Badge variant={healthStatus === 'Critical' ? 'destructive' : 'outline'} className={healthStatus === 'Warning' ? 'text-warning border-warning/30' : undefined}>{td(healthStatus)}</Badge>
            ) : (
              <Badge variant="outline">{td('clear')}</Badge>
            )}
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            <span className="font-mono tabular"><AnimatedNumber value={data.guardianBlocks.length} /></span>
          </p>
          <p className="mt-1 text-xs text-text-muted">{td('complianceIssues')}</p>
        </Card>

        {/* Refusal recoverable */}
        <Card
          as="button"
          className="group cursor-pointer"
          onClick={() => router.push('/dashboard/waitlist')}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">{td('refusalRecoverable')}</p>
            <span className="text-xs font-medium text-text-muted">
              <span className="font-mono tabular">{td('waitingCount', { count: number(data.refusal.count) })}</span>
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            <span className="font-mono tabular"><bdi><AnimatedNumber value={data.refusal.recoverable} format={money} /></bdi></span>

          </p>
          <p className="mt-1 text-xs text-text-muted">{td('waitlistValue')}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 min-w-0 space-y-8">
          {/* ═══════ Daily intensity chart ═══════ */}
          <figure className="m-0">
          <Card className="h-96 flex flex-col justify-between">
            <CardHeader className="p-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
               <div>
                  <CardTitle className="text-lg">{td('dailyIntensity')}</CardTitle>
                  <CardDescription>{td('chartBody')}</CardDescription>
               </div>
               <div className="flex items-center gap-4 bg-surface p-2 rounded-lg border border-hairline" aria-hidden="true">
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                     <span className="text-[11px] text-text-muted">{td('revenue')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-text-faint" />
                     <span className="text-[11px] text-text-muted">{td('bookings')}</span>
                  </div>
               </div>
            </CardHeader>
            {/* Screen-reader equivalent of the bar chart (the visual bars below are
                aria-hidden decorative; this table carries the actual figures). */}
            <SrDataTable
              caption={td('chartCaption')}
              columns={[td('day'), td('revenueMad'), td('bookings')]}
              rows={data.dailyIntensity.map((d) => [
                format.dateTime(new Date(d.date), { weekday: 'short', day: 'numeric', timeZone: 'UTC' }),
                format.number(d.revenue),
                number(d.bookings),
              ])}
            />
            <div className="flex-1 flex items-end gap-2 pb-4 pt-10" aria-hidden="true">
               {data.dailyIntensity.map((day, i) => (
                 <div key={i} className="group/bar relative h-full flex-1 flex flex-col items-center justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-surface-raised text-foreground border border-hairline text-[10px] px-3 py-2 rounded-lg opacity-0 group-hover/bar:opacity-100 group-active/bar:opacity-100 transition-all pointer-events-none z-10 scale-95 group-hover/bar:scale-100 group-active/bar:scale-100 whitespace-nowrap shadow-lg">
                       <p className="font-mono tabular text-primary"><bdi>{money(day.revenue)}</bdi></p>
                       <p className="text-text-muted">{td('bookingCount', { count: day.bookings })}</p>
                    </div>
                    {/* Booking count dot */}
                    {day.bookings > 0 && (
                      <div className="absolute top-0 z-20">
                        <div className="w-4 h-4 rounded-full bg-surface-raised border border-hairline flex items-center justify-center text-[7px] font-mono tabular text-text-muted">
                          {number(day.bookings)}
                        </div>
                      </div>
                    )}
                    {/* Revenue bar — violet series with a violet→transparent area fill */}
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary/5 group-hover/bar:from-primary/70 group-hover/bar:to-primary/20 transition-all duration-500"
                      style={{ height: `${chartMax > 0 ? Math.max((day.revenue / chartMax) * 100, day.bookings > 0 ? 5 : 0) : 0}%` }}
                    />
                 </div>
               ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-hairline" aria-hidden="true">
               {data.dailyIntensity.map((day, i) => (
                 <span key={i} className="text-[8px] text-text-faint">{format.dateTime(new Date(day.date), { day: 'numeric', timeZone: 'UTC' })}</span>
               ))}
            </div>
          </Card>
          </figure>

          {/* ═══════ Active compliance queue ═══════ */}
          <div className="space-y-6">
            <CardHeader className="px-0">
               <CardTitle className="text-lg">{td('complianceQueue')}</CardTitle>
               <CardDescription>{td('issueCount', { count: data.guardianBlocks.length })}</CardDescription>
            </CardHeader>

            {data.guardianBlocks.length === 0 ? (
              <Card className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">{td('fleetCompliant')}</p>
                <p className="text-xs text-text-muted mt-1">{td('documentsValid')}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.guardianBlocks.slice(0, 6).map((block, i) => (
                  <button
                    type="button"
                    key={block.id || i}
                    onClick={() => openGuardianModal(block)}
                    className={cn(
                      "p-5 glass rounded-2xl flex items-center justify-between gap-3 text-start transition-all hover:translate-x-1 rtl:hover:-translate-x-1 group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      block.severity === 'danger' ? 'border-s-4 border-s-danger' : 'border-s-4 border-s-warning'
                    )}
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center transition-transform group-hover:scale-110">
                           <Zap className={cn("w-6 h-6", block.severity === 'danger' ? 'text-danger' : 'text-warning')} />
                        </div>
                        <div>
                           <h4 className="font-semibold text-sm text-foreground">{block.car}</h4>
                           <p className="text-[11px] text-text-muted">{documentLabel(block.type)} · <bdi dir="ltr" className="font-mono tabular">{block.plate}</bdi></p>
                        </div>
                     </div>
                     <div className="text-end">
                        <p className={cn("text-[11px] font-medium", block.severity === 'danger' ? 'text-danger' : 'text-warning')}>
                          {riskLabel(block.risk)}
                        </p>
                        <span className="text-[11px] text-text-faint group-hover:text-primary transition-colors">{td('resolve')}</span>
                     </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ Right Sidebar ═══════ */}
        <div className="lg:col-span-4 space-y-8">
           {/* Star asset */}
           <Card padding="none" className="overflow-hidden">
              {data.starAsset ? (
                <>
                  <CarPhoto
                    alt={`${data.starAsset.brand} ${data.starAsset.model}`}
                    plate={data.starAsset.plate}
                    rounded="rounded-none"
                  />
                  <div className="p-6 space-y-5">
                     <div className="min-w-0">
                        <p className="eyebrow">{td('starAsset')}</p>
                        <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
                          {data.starAsset.brand} {data.starAsset.model}
                        </h3>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                           <span className="text-text-muted">{td('roi')}</span>
                           <span className={cn("flex items-center gap-1 font-mono tabular font-medium", data.starAsset.roi >= 0 ? "text-success" : "text-danger")}>
                             <TrendingUp className="w-3.5 h-3.5" />
                             {number(data.starAsset.roi / 100, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
                           </span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                           <div
                             className={cn("h-full transition-all duration-1000", data.starAsset.roi >= 0 ? "bg-success" : "bg-danger")}
                             style={{ width: `${Math.min(Math.max(data.starAsset.roi, 0), 100)}%` }}
                           />
                        </div>
                        {data.starAsset.totalRevenue > 0 && (
                          <p className="text-xs text-text-muted">
                            {td('lifetimeRevenue')} · <bdi className="font-mono tabular">{money(data.starAsset.totalRevenue)}</bdi>
                          </p>
                        )}
                     </div>
                     <Button
                       className="w-full" variant="outline" size="sm"
                       onClick={() => router.push('/dashboard/fleet')}
                     >
                       <Eye className="w-3.5 h-3.5 me-2" />
                       {td('viewDetails')}
                     </Button>
                  </div>
                </>
              ) : (
                <div className="p-6 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center mx-auto mb-3">
                    <Car className="w-6 h-6 text-text-faint" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{td('noFleet')}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/fleet')}>
                    {td('addCar')}
                  </Button>
                </div>
              )}
           </Card>

           {/* Live activity */}
           <Card>
              <CardHeader className="p-0 mb-8">
                 <CardTitle>{td('liveActivity')}</CardTitle>
                 <Activity className="w-4 h-4 text-text-faint" />
              </CardHeader>
              <div className="space-y-6">
                 {data.liveActivity.length === 0 ? (
                   <div className="text-center py-8">
                     <Clock className="w-8 h-8 text-text-faint mx-auto mb-3" />
                     <p className="text-sm text-text-muted">{td('noActivity')}</p>
                   </div>
                 ) : (
                   data.liveActivity.map((activity, i) => {
                     const colorMap: Record<string, string> = {
                       'New Booking': 'bg-success',
                       'Car Added': 'bg-info',
                       'Car Updated': 'bg-info',
                       'Price Updated': 'bg-warning',
                       'Booking Status Changed': 'bg-info',
                       'Car Removed': 'bg-danger',
                     };
                     const dotColor = colorMap[activity.action] || 'bg-text-faint';

                     return (
                       <div key={activity.id || i} className="flex gap-4 items-center group cursor-pointer" onClick={() => {
                         // AuditLog stores entityType in UPPERCASE (BOOKING, CAR, ...);
                         // normalize defensively so routing never silently breaks.
                         const entity = (activity.entityType || '').toUpperCase();
                         if (entity === 'BOOKING') router.push('/dashboard/bookings');
                         else if (entity === 'CAR') router.push('/dashboard/fleet');
                         else if (entity === 'CUSTOMER') router.push('/dashboard/customers');
                         else showToast('info', actionLabel(activity.action), td('activityBy', { name: activity.role === 'SYSTEM' ? td('system') : activity.user, time: activityTime(activity.time) }));
                       }}>
                          <div className="relative shrink-0">
                             <Avatar name={activity.role === 'SYSTEM' ? td('system') : activity.user} size={36} />
                             <div className={cn("absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-background", dotColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{activity.role === 'SYSTEM' ? td('system') : activity.user}</p>
                             <p className="text-xs text-text-muted">{actionLabel(activity.action)}</p>
                          </div>
                          <span className="text-[11px] font-mono tabular text-text-faint shrink-0">{activityTime(activity.time)}</span>
                       </div>
                     );
                   })
                 )}
              </div>
           </Card>

           {/* Operations overview */}
           <Card>
              <CardHeader className="p-0 mb-6">
                <CardTitle>{td('operations')}</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-semibold font-mono tabular text-success">{number(data.fleet.available)}</p>
                  <p className="eyebrow">{td('available')}</p>
                </div>
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/bookings')}>
                  <p className="text-lg font-semibold font-mono tabular text-foreground">{number(data.fleet.rented)}</p>
                  <p className="eyebrow">{td('rented')}</p>
                </div>
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-semibold font-mono tabular text-warning">{number(data.fleet.maintenance)}</p>
                  <p className="eyebrow">{td('maintenance')}</p>
                </div>
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-semibold font-mono tabular text-danger">{number(data.fleet.outOfService)}</p>
                  <p className="eyebrow">{td('outOfService')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-hairline">
                <div
                  className="p-3 bg-surface border border-hairline rounded-xl flex items-center gap-3 cursor-pointer hover:bg-surface-raised transition-colors group"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-raised border border-hairline flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold font-mono tabular text-foreground leading-none">{number(data.activeRentals)}</p>
                    <p className="eyebrow mt-1">{td('activeRentals')}</p>
                  </div>
                </div>
                <div
                  className="p-3 bg-surface border border-hairline rounded-xl flex items-center gap-3 cursor-pointer hover:bg-surface-raised transition-colors group"
                  onClick={() => router.push('/dashboard/customers')}
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-raised border border-hairline flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold font-mono tabular text-foreground leading-none">{number(data.totalCustomers)}</p>
                    <p className="eyebrow mt-1">{td('customers')}</p>
                  </div>
                </div>
              </div>
           </Card>
        </div>
      </div>

      {/* ═══════ Booking Modal ═══════ */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={closeBookingModal}
        title={td('newBooking')}
        description={td('bookingDescription')}
        size="lg"
      >
        <form onSubmit={handleNewBooking} className="space-y-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                    <p className="eyebrow">{td('customer')} <span className="text-danger">*</span></p>
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen((v) => !v)}
                      className="text-xs font-medium text-primary hover:text-primary/70 transition-colors"
                    >
                      {isRegisterOpen ? td('cancel') : td('walkIn')}
                    </button>
                 </div>
                 <Combobox
                   options={customerOptions.map((c) => ({ id: c.id, label: c.label, sublabel: c.phone }))}
                   value={selectedCustomerId}
                   onChange={handleCustomerSelect}
                   placeholder={customerOptions.length === 0 ? td('noCustomers') : td('selectCustomer')}
                   emptyText={td('noMatchingCustomers')}
                   icon={<QrCode className="w-4 h-4" />}
                 />
              </div>
              <div className="space-y-2">
                 <p className="eyebrow px-1">{td('vehicle')}</p>
                 <Combobox
                   options={data.availableCars.map((car) => ({
                     id: car.id,
                     label: car.label,
                     sublabel: td('ratePerDay', { amount: money(car.pricePerDay) }),
                   }))}
                   value={selectedCarId}
                   onChange={handleCarSelect}
                   placeholder={td('selectVehicle')}
                   emptyText={td('noVehicles')}
                 />
              </div>
           </div>

           {/* ═══════ Pillar 6: Client Risk Assessment ═══════ */}
           {selectedCustomerId && (
             <RiskAssessmentPanel
               assessment={risk.data}
               isLoading={risk.isPending}
               isError={risk.isError}
               overrideReason={overrideReason}
               onOverrideChange={setOverrideReason}
             />
           )}

           {isRegisterOpen && (
             <div className="p-5 glass rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="eyebrow">{td('walkInRegistration')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <input
                     value={walkIn.firstName}
                     onChange={(e) => setWalkIn((w) => ({ ...w, firstName: e.target.value }))}
                     aria-label={td('firstName')} placeholder={td('firstName')}
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                   <input
                     value={walkIn.lastName}
                     onChange={(e) => setWalkIn((w) => ({ ...w, lastName: e.target.value }))}
                     aria-label={td('lastName')} placeholder={td('lastName')}
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                   <input
                     value={walkIn.phone}
                     onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))}
                     aria-label={td('phone')} placeholder={td('phone')}
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                   <input
                     value={walkIn.identityNumber}
                     onChange={(e) => setWalkIn((w) => ({ ...w, identityNumber: e.target.value }))}
                     aria-label={td('identity')} placeholder={td('identity')}
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                </div>
                <Button type="button" size="sm" className="w-full" onClick={handleQuickRegister} disabled={isRegistering}>
                   {isRegistering
                     ? <Loader2 className="w-3.5 h-3.5 me-2 animate-spin" />
                     : <Plus className="w-3.5 h-3.5 me-2" />}
                   {td('registerSelect')}
                </Button>
             </div>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <p className="eyebrow px-1">{td('startDate')}</p>
                 <input aria-label={td('startDate')} name="startDate" type="date" required min={localToday()} className="w-full bg-surface border border-hairline rounded-xl px-4 py-4 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                 <p className="eyebrow px-1">{td('endDate')}</p>
                 <input aria-label={td('endDate')} name="endDate" type="date" required min={localToday()} className="w-full bg-surface border border-hairline rounded-xl px-4 py-4 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all" />
              </div>
           </div>

           <div className="p-6 glass rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                 <p className="eyebrow mb-1">{td('dailyRate')}</p>
                 <p className="text-3xl font-semibold tracking-tight text-foreground">
                   <bdi className="font-mono tabular">{bookingPrice > 0 ? td('ratePerDay', { amount: money(bookingPrice) }) : '—'}</bdi>
                 </p>
              </div>
              <div className="text-start sm:text-end">
                 <p className="eyebrow">{td('taxIncluded')}</p>
                 {risk.data && risk.data.depositMultiplier && risk.data.depositMultiplier > 1 ? (
                   <p className="text-[11px] font-medium text-warning mt-1 border border-warning/25 px-2 py-0.5 rounded-full inline-block">
                     {td('depositUplift', { multiplier: number(risk.data.depositMultiplier) })}
                   </p>
                 ) : bookingPrice > 0 && (
                   <p className="text-[11px] font-medium text-success mt-1 border border-success/20 px-2 py-0.5 rounded-full inline-block">{td('liveRate')}</p>
                 )}
              </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4">
              <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeBookingModal}>{td('cancel')}</Button>
              {risk.data?.blocked ? (
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 py-4"
                  isLoading={bookingMutation.isPending}
                >
                  {overrideReason.trim() ? td('overrideConfirm') : td('bookingLocked')}
                </Button>
              ) : (
                <Button type="submit" className="flex-1 py-4" isLoading={bookingMutation.isPending}>
                  {td('confirmBooking')}
                </Button>
              )}
           </div>
        </form>
      </Modal>

      {/* ═══════ Guardian Intervention Modal ═══════ */}
      <Modal
        isOpen={isGuardianModalOpen}
        onClose={() => setIsGuardianModalOpen(false)}
        title={td('guardianTitle')}
        description={td('guardianDescription')}
      >
         {selectedBlock && (
           <div className="space-y-6">
              <div className={cn(
                "p-4 border rounded-2xl",
                selectedBlock.severity === 'danger' ? 'bg-danger/10 border-danger/20' : 'bg-warning/10 border-warning/20'
              )}>
                 <p className={cn(
                   "text-xs font-semibold mb-1",
                   selectedBlock.severity === 'danger' ? 'text-danger' : 'text-warning'
                 )}>
                   {selectedBlock.severity === 'danger' ? td('criticalBlock') : td('warningAction')}
                 </p>
                 <p className="text-xs text-text-muted leading-relaxed">
                   {td('blockSummary', { type: documentLabel(selectedBlock.type), car: selectedBlock.car, plate: selectedBlock.plate, risk: riskLabel(selectedBlock.risk) })}
                   {selectedBlock.severity === 'danger'
                     ? ` ${td('assetLocked')}`
                     : ` ${td('renewSoon')}`}
                 </p>
              </div>
              <div className="space-y-3">
                 <p className="eyebrow px-1">{td('quickActions')}</p>
                 <Button
                   className="w-full justify-between"
                   onClick={() => {
                     setIsGuardianModalOpen(false);
                     router.push(`/dashboard/fleet/${encodeURIComponent(selectedBlock.carId)}`);
                   }}
                 >
                   {td('vehicleDetails')}
                   <ArrowRight className="w-4 h-4" />
                 </Button>
                 <Button
                   variant="outline"
                   isLoading={creatingTask}
                   disabled={creatingTask}
                   className="w-full justify-between"
                   onClick={() => {
                     void createRenewalTask();
                   }}
                 >
                   <span className="flex items-center gap-2">
                     <Wrench className="w-3.5 h-3.5" />
                     {td('createRenewal')}
                   </span>
                   <ArrowRight className="w-4 h-4" />
                 </Button>
              </div>
           </div>
         )}
      </Modal>
    </div>
  );
}
