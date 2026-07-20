"use client";

import { useTranslations } from 'next-intl';
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
import { useCustomerRisk } from './useCustomerRisk';
import { RiskAssessmentPanel } from './components/RiskAssessmentPanel';

export default function OwnerDashboard() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useCommandCentre();
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
      showToast('danger','Missing Fields', 'Name, phone and CIN/ID number are required to register a walk-in.');
      return;
    }
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
      setSelectedCustomerId(created.id);
      setIsRegisterOpen(false);
      setWalkIn({ firstName: '', lastName: '', phone: '', identityNumber: '' });
      showToast('success', 'Customer Registered', `${created.label} added to your directory and selected.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to register customer';
      showToast('danger','Registration Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsRegistering(false);
    }
  };

  // Optimistic booking: the modal closes the instant the form is valid and a
  // "pulse" toast confirms the request is in flight; success/failure resolves
  // in the background and resyncs the dashboard via query invalidation.
  const bookingMutation = useMutation({
    mutationFn: (payload: {
      carId: string; customerId: string; startDate: string; endDate: string; overrideReason?: string;
    }) => api.post('/bookings', payload),
    onSuccess: () => {
      showToast('success', 'Booking Confirmed', 'A new rental session has been instantiated.');
      queryClient.invalidateQueries({ queryKey: commandCentreKeys.all });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create booking';
      showToast('danger', 'Booking Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
      // Resync in case the server partially applied or state drifted.
      queryClient.invalidateQueries({ queryKey: commandCentreKeys.all });
    },
  });

  const handleNewBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    if (!selectedCarId || !startDate || !endDate) {
      showToast('danger','Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (!selectedCustomerId) {
      showToast('danger','Customer Required', 'Select a customer, or register the walk-in with the + Walk-in option.');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      showToast('danger','Invalid Dates', 'The return date must be after the start date.');
      return;
    }
    // Pillar 6: a Trust Network hard-lock needs a manager override reason.
    if (risk.data?.blocked && !overrideReason.trim()) {
      showToast('danger', 'Renter Blocked', 'This renter is flagged on the Trust Network. Enter a manager override reason to proceed.');
      return;
    }

    const payload = {
      carId: selectedCarId,
      customerId: selectedCustomerId,
      startDate,
      endDate,
      ...(risk.data?.blocked && overrideReason.trim() ? { overrideReason: overrideReason.trim() } : {}),
    };
    closeBookingModal();
    showToast('pulse', 'Deploying Booking', 'Reserving the asset and generating the contract...');
    bookingMutation.mutate(payload);
  };

  const openGuardianModal = (block: any) => {
    setSelectedBlock(block);
    setIsGuardianModalOpen(true);
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
          <p className="text-base font-semibold tracking-tight text-foreground">System offline</p>
          <p className="text-xs text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}><RefreshCw className="w-4 h-4 me-2" /> Reconnect</Button>
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
            System health · {healthStatus}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="hidden sm:flex" onClick={() => router.push('/dashboard/finance')}>
            <Wallet className="w-4 h-4 me-2" />
            Financial ledger
          </Button>
          <Button onClick={() => setIsBookingModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            New booking
          </Button>
        </div>
      </header>

      {/* ═══════ Primary metrics ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net revenue MTD — the page's single brass hero figure */}
        <Card
          className="group cursor-pointer"
          onClick={() => router.push('/dashboard/finance')}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">Net revenue · MTD</p>
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium", data.revenue.growth >= 0 ? "text-success" : "text-danger")}>
              {data.revenue.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(data.revenue.growth)}%
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            <span className="font-mono tabular metal-text"><AnimatedNumber value={data.revenue.mtd} /></span>
            <span className="ms-1.5 text-sm font-normal text-text-faint">MAD</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">Net revenue this month</p>
        </Card>

        {/* Fleet utilization */}
        <Card
          className="group cursor-pointer"
          onClick={() => router.push('/dashboard/fleet')}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">Fleet utilization</p>
            <span className="text-xs font-medium text-text-muted">
              <span className="font-mono tabular">{data.fleet.rented}/{data.fleet.total}</span> rented
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            <span className="font-mono tabular"><AnimatedNumber value={data.utilization.percent} /></span>
            <span className="ms-1.5 text-sm font-normal text-text-faint">%</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">Vehicles currently on rent</p>
        </Card>

        {/* Guardian blocks */}
        <Card
          className="group cursor-pointer"
          onClick={() => {
            if (data.guardianBlocks.length > 0) {
              openGuardianModal(data.guardianBlocks[0]);
            } else {
              showToast('success', 'All Clear', 'No guardian blocks detected. Fleet is fully compliant.');
            }
          }}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">Guardian blocks</p>
            {data.guardianBlocks.length > 0 ? (
              <Badge variant="destructive">Critical</Badge>
            ) : (
              <Badge variant="outline">Clear</Badge>
            )}
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            <span className="font-mono tabular"><AnimatedNumber value={data.guardianBlocks.length} /></span>
          </p>
          <p className="mt-1 text-xs text-text-muted">Compliance issues to resolve</p>
        </Card>

        {/* Refusal recoverable */}
        <Card
          className="group cursor-pointer"
          onClick={() => router.push('/dashboard/waitlist')}
        >
          <div className="flex items-start justify-between">
            <p className="eyebrow">Refusal recoverable</p>
            <span className="text-xs font-medium text-text-muted">
              <span className="font-mono tabular">{data.refusal.count}</span> waiting
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            <span className="font-mono tabular"><AnimatedNumber value={data.refusal.recoverable} /></span>
            <span className="ms-1.5 text-sm font-normal text-text-faint">MAD</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">Value in the waitlist queue</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* ═══════ Daily intensity chart ═══════ */}
          <Card className="h-96 flex flex-col justify-between">
            <CardHeader className="p-0">
               <div>
                  <CardTitle className="text-lg">Daily intensity</CardTitle>
                  <CardDescription>14-day booking & revenue flow</CardDescription>
               </div>
               <div className="flex items-center gap-4 bg-surface p-2 rounded-lg border border-hairline">
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                     <span className="text-[11px] text-text-muted">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-text-faint" />
                     <span className="text-[11px] text-text-muted">Bookings</span>
                  </div>
               </div>
            </CardHeader>
            <div className="flex-1 flex items-end gap-2 pb-4 pt-10">
               {data.dailyIntensity.map((day, i) => (
                 <div key={i} className="group/bar relative flex-1 flex flex-col items-center justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-surface-raised text-foreground border border-hairline text-[10px] px-3 py-2 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-10 scale-95 group-hover/bar:scale-100 whitespace-nowrap shadow-lg">
                       <p className="font-mono tabular text-primary">{day.revenue.toLocaleString()} MAD</p>
                       <p className="text-text-muted">{day.bookings} booking{day.bookings !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Booking count dot */}
                    {day.bookings > 0 && (
                      <div className="absolute top-0 z-20">
                        <div className="w-4 h-4 rounded-full bg-surface-raised border border-hairline flex items-center justify-center text-[7px] font-mono tabular text-text-muted">
                          {day.bookings}
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
            <div className="flex items-center justify-between pt-4 border-t border-hairline">
               {data.dailyIntensity.map((day, i) => (
                 <span key={i} className="text-[8px] text-text-faint">{day.label}</span>
               ))}
            </div>
          </Card>

          {/* ═══════ Active compliance queue ═══════ */}
          <div className="space-y-6">
            <CardHeader className="px-0">
               <CardTitle className="text-lg">Active compliance queue</CardTitle>
               <CardDescription>{data.guardianBlocks.length} issue{data.guardianBlocks.length !== 1 ? 's' : ''} requiring attention</CardDescription>
            </CardHeader>

            {data.guardianBlocks.length === 0 ? (
              <Card className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">Fleet fully compliant</p>
                <p className="text-xs text-text-muted mt-1">All documents are valid and up to date</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.guardianBlocks.slice(0, 6).map((block, i) => (
                  <div
                    key={block.id || i}
                    onClick={() => openGuardianModal(block)}
                    className={cn(
                      "p-5 glass rounded-2xl flex items-center justify-between transition-all hover:translate-x-1 group cursor-pointer",
                      block.severity === 'danger' ? 'border-s-4 border-s-danger' : 'border-s-4 border-s-warning'
                    )}
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center transition-transform group-hover:scale-110">
                           <Zap className={cn("w-6 h-6", block.severity === 'danger' ? 'text-danger' : 'text-warning')} />
                        </div>
                        <div>
                           <h4 className="font-semibold text-sm text-foreground">{block.car}</h4>
                           <p className="text-[11px] text-text-muted">{block.type} · <span className="font-mono tabular">{block.plate}</span></p>
                        </div>
                     </div>
                     <div className="text-end">
                        <p className={cn("text-[11px] font-medium", block.severity === 'danger' ? 'text-danger' : 'text-warning')}>
                          {block.risk}
                        </p>
                        <span className="text-[11px] text-text-faint group-hover:text-primary transition-colors">Resolve →</span>
                     </div>
                  </div>
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
                        <p className="eyebrow">Star asset · highest ROI</p>
                        <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
                          {data.starAsset.brand} {data.starAsset.model}
                        </h3>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                           <span className="text-text-muted">ROI score</span>
                           <span className={cn("flex items-center gap-1 font-mono tabular font-medium", data.starAsset.roi >= 0 ? "text-success" : "text-danger")}>
                             <TrendingUp className="w-3.5 h-3.5" />
                             {data.starAsset.roi >= 0 ? '+' : ''}{data.starAsset.roi.toFixed(1)}%
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
                            Lifetime revenue · <span className="font-mono tabular">{data.starAsset.totalRevenue.toLocaleString()} MAD</span>
                          </p>
                        )}
                     </div>
                     <Button
                       className="w-full" variant="outline" size="sm"
                       onClick={() => router.push('/dashboard/fleet')}
                     >
                       <Eye className="w-3.5 h-3.5 me-2" />
                       View details
                     </Button>
                  </div>
                </>
              ) : (
                <div className="p-6 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center mx-auto mb-3">
                    <Car className="w-6 h-6 text-text-faint" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No fleet data yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/fleet')}>
                    Add your first car
                  </Button>
                </div>
              )}
           </Card>

           {/* Live activity */}
           <Card>
              <CardHeader className="p-0 mb-8">
                 <CardTitle>Live activity</CardTitle>
                 <Activity className="w-4 h-4 text-text-faint" />
              </CardHeader>
              <div className="space-y-6">
                 {data.liveActivity.length === 0 ? (
                   <div className="text-center py-8">
                     <Clock className="w-8 h-8 text-text-faint mx-auto mb-3" />
                     <p className="text-sm text-text-muted">No recent activity</p>
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
                         else showToast('info', activity.action, `By ${activity.user} • ${activity.time} ago`);
                       }}>
                          <div className="relative shrink-0">
                             <Avatar name={activity.user} size={36} />
                             <div className={cn("absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-background", dotColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{activity.user}</p>
                             <p className="text-xs text-text-muted">{activity.action}</p>
                          </div>
                          <span className="text-[11px] font-mono tabular text-text-faint shrink-0">{activity.time}</span>
                       </div>
                     );
                   })
                 )}
              </div>
           </Card>

           {/* Operations overview */}
           <Card>
              <CardHeader className="p-0 mb-6">
                <CardTitle>Operations overview</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-semibold font-mono tabular text-success">{data.fleet.available}</p>
                  <p className="eyebrow">Available</p>
                </div>
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/bookings')}>
                  <p className="text-lg font-semibold font-mono tabular text-foreground">{data.fleet.rented}</p>
                  <p className="eyebrow">Rented</p>
                </div>
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-semibold font-mono tabular text-warning">{data.fleet.maintenance}</p>
                  <p className="eyebrow">Maintenance</p>
                </div>
                <div className="p-3 bg-surface border border-hairline rounded-xl text-center cursor-pointer hover:bg-surface-raised transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-semibold font-mono tabular text-danger">{data.fleet.outOfService}</p>
                  <p className="eyebrow">Out of service</p>
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
                    <p className="text-lg font-semibold font-mono tabular text-foreground leading-none">{data.activeRentals}</p>
                    <p className="eyebrow mt-1">Active rentals</p>
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
                    <p className="text-lg font-semibold font-mono tabular text-foreground leading-none">{data.totalCustomers}</p>
                    <p className="eyebrow mt-1">Customers</p>
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
        title="New booking"
        description="Reserve a vehicle and generate the contract"
        size="lg"
      >
        <form onSubmit={handleNewBooking} className="space-y-8">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                    <p className="eyebrow">Customer <span className="text-danger">*</span></p>
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen((v) => !v)}
                      className="text-xs font-medium text-primary hover:text-primary/70 transition-colors"
                    >
                      {isRegisterOpen ? '− Cancel' : '+ Walk-in'}
                    </button>
                 </div>
                 <Combobox
                   options={customerOptions.map((c) => ({ id: c.id, label: c.label, sublabel: c.phone }))}
                   value={selectedCustomerId}
                   onChange={setSelectedCustomerId}
                   placeholder={customerOptions.length === 0 ? 'No customers — register a walk-in' : 'Select Customer...'}
                   emptyText="No matching customers"
                   icon={<QrCode className="w-4 h-4" />}
                 />
              </div>
              <div className="space-y-2">
                 <p className="eyebrow px-1">Vehicle</p>
                 <Combobox
                   options={data.availableCars.map((car) => ({
                     id: car.id,
                     label: car.label,
                     sublabel: `${car.pricePerDay.toLocaleString()} MAD/day`,
                   }))}
                   value={selectedCarId}
                   onChange={handleCarSelect}
                   placeholder="Select Vehicle..."
                   emptyText="No available vehicles"
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
                <p className="eyebrow">Walk-in registration</p>
                <div className="grid grid-cols-2 gap-4">
                   <input
                     value={walkIn.firstName}
                     onChange={(e) => setWalkIn((w) => ({ ...w, firstName: e.target.value }))}
                     placeholder="First name *"
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                   <input
                     value={walkIn.lastName}
                     onChange={(e) => setWalkIn((w) => ({ ...w, lastName: e.target.value }))}
                     placeholder="Last name *"
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                   <input
                     value={walkIn.phone}
                     onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))}
                     placeholder="Phone *"
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                   <input
                     value={walkIn.identityNumber}
                     onChange={(e) => setWalkIn((w) => ({ ...w, identityNumber: e.target.value }))}
                     placeholder="CIN / ID number *"
                     className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                   />
                </div>
                <Button type="button" size="sm" className="w-full" onClick={handleQuickRegister} disabled={isRegistering}>
                   {isRegistering
                     ? <Loader2 className="w-3.5 h-3.5 me-2 animate-spin" />
                     : <Plus className="w-3.5 h-3.5 me-2" />}
                   Register & select
                </Button>
             </div>
           )}

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <p className="eyebrow px-1">Start date</p>
                 <input name="startDate" type="date" required min={new Date().toISOString().slice(0, 10)} className="w-full bg-surface border border-hairline rounded-xl px-4 py-4 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                 <p className="eyebrow px-1">Return date</p>
                 <input name="endDate" type="date" required min={new Date().toISOString().slice(0, 10)} className="w-full bg-surface border border-hairline rounded-xl px-4 py-4 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all" />
              </div>
           </div>

           <div className="p-6 glass rounded-2xl flex items-center justify-between">
              <div>
                 <p className="eyebrow mb-1">Daily rate</p>
                 <p className="text-3xl font-semibold tracking-tight text-foreground">
                   <span className="font-mono tabular">{bookingPrice > 0 ? `${bookingPrice.toLocaleString()}` : '—'}</span> <span className="text-sm font-normal text-text-faint">MAD/day</span>
                 </p>
              </div>
              <div className="text-end">
                 <p className="eyebrow">Tax & escrow included</p>
                 {risk.data && risk.data.depositMultiplier && risk.data.depositMultiplier > 1 ? (
                   <p className="text-[11px] font-medium text-warning mt-1 border border-warning/25 px-2 py-0.5 rounded-full inline-block">
                     Deposit <span className="font-mono tabular">×{risk.data.depositMultiplier}</span> · risk uplift
                   </p>
                 ) : bookingPrice > 0 && (
                   <p className="text-[11px] font-medium text-success mt-1 border border-success/20 px-2 py-0.5 rounded-full inline-block">Live rate</p>
                 )}
              </div>
           </div>

           <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeBookingModal}>Cancel</Button>
              {risk.data?.blocked ? (
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 py-4"
                >
                  {overrideReason.trim() ? 'Override & confirm' : 'Booking locked — override required'}
                </Button>
              ) : (
                <Button type="submit" className="flex-1 py-4">
                  Confirm booking
                </Button>
              )}
           </div>
        </form>
      </Modal>

      {/* ═══════ Guardian Intervention Modal ═══════ */}
      <Modal
        isOpen={isGuardianModalOpen}
        onClose={() => setIsGuardianModalOpen(false)}
        title="Guardian intervention"
        description="Resolve critical asset compliance issue"
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
                   {selectedBlock.severity === 'danger' ? 'Critical block detected' : 'Warning · action required'}
                 </p>
                 <p className="text-xs text-text-muted leading-relaxed">
                   <strong>{selectedBlock.type}</strong> for <strong>{selectedBlock.car}</strong> (<span className="font-mono tabular">{selectedBlock.plate}</span>) has status: <strong>{selectedBlock.risk}</strong>.
                   {selectedBlock.severity === 'danger'
                     ? ' The system has hard-locked this asset from bookings.'
                     : ' The document will expire soon — renew to avoid a booking lock.'}
                 </p>
              </div>
              <div className="space-y-3">
                 <p className="eyebrow px-1">Quick actions</p>
                 <Button
                   className="w-full justify-between"
                   onClick={() => {
                     setIsGuardianModalOpen(false);
                     router.push('/dashboard/fleet');
                   }}
                 >
                   View vehicle details
                   <ArrowRight className="w-4 h-4" />
                 </Button>
                 <Button
                   variant="outline"
                   className="w-full justify-between"
                   onClick={() => {
                     setIsGuardianModalOpen(false);
                     showToast('success', 'Task Created', `Priority renewal task for ${selectedBlock.car} assigned.`);
                   }}
                 >
                   <span className="flex items-center gap-2">
                     <Wrench className="w-3.5 h-3.5" />
                     Assign renewal task
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
