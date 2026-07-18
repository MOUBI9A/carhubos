"use client";

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
import { useCustomerRisk } from './useCustomerRisk';
import { RiskAssessmentPanel } from './components/RiskAssessmentPanel';

export default function OwnerDashboard() {
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">System Offline</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}><RefreshCw className="w-4 h-4 mr-2" /> Reconnect</Button>
      </div>
    );
  }

  if (!data) return null;

  // Chart calculations
  const chartMax = Math.max(...data.dailyIntensity.map((d) => d.revenue), 1);
  const healthStatus = data.guardianBlocks.length === 0 ? 'Nominal' : 
    data.guardianBlocks.some(b => b.severity === 'danger') ? 'Critical' : 'Warning';
  const healthColor = healthStatus === 'Nominal' ? 'bg-success' : healthStatus === 'Critical' ? 'bg-danger' : 'bg-amber-500';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 text-foreground">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Fider Control</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full animate-pulse", healthColor)} />
            Live System Health: {healthStatus}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="hidden sm:flex" onClick={() => router.push('/dashboard/finance')}>
            <Wallet className="w-4 h-4 mr-2" />
            Financial Ledger
          </Button>
          <Button onClick={() => setIsBookingModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </header>

      {/* ═══════ Primary Metrics HUD ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue MTD */}
        <Card 
          className="relative overflow-hidden group hover:ring-1 ring-primary/50 transition-all cursor-pointer" 
          onClick={() => router.push('/dashboard/finance')}
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-primary">
             <TrendingUp className="w-32 h-32" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="text-right">
               <span className={cn("flex items-center text-[11px] font-black gap-1", data.revenue.growth >= 0 ? "text-success" : "text-danger")}>
                 {data.revenue.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                 {Math.abs(data.revenue.growth)}%
               </span>
               <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Growth</p>
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-white"><AnimatedNumber value={data.revenue.mtd} /> <span className="text-sm text-white/40 font-bold">MAD</span></CardTitle>
          <CardDescription className="mt-1 font-bold">Net Revenue MTD</CardDescription>
        </Card>

        {/* Fleet Utilization */}
        <Card 
          className="relative overflow-hidden group hover:ring-1 ring-success/50 transition-all cursor-pointer"
          onClick={() => router.push('/dashboard/fleet')}
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-success">
             <CheckCircle2 className="w-32 h-32" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div className="text-right">
               <span className="flex items-center text-[11px] font-black text-white/40 gap-1">
                 {data.fleet.rented}/{data.fleet.total}
               </span>
               <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Rented</p>
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-white"><AnimatedNumber value={data.utilization.percent} />%</CardTitle>
          <CardDescription className="mt-1 font-bold">Fleet Utilization</CardDescription>
        </Card>

        {/* Guardian Blocks */}
        <Card 
          className="relative overflow-hidden group hover:ring-1 ring-danger/50 transition-all cursor-pointer" 
          onClick={() => {
            if (data.guardianBlocks.length > 0) {
              openGuardianModal(data.guardianBlocks[0]);
            } else {
              showToast('success', 'All Clear', 'No guardian blocks detected. Fleet is fully compliant.');
            }
          }}
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-danger">
             <AlertTriangle className="w-32 h-32" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              data.guardianBlocks.length > 0 ? "bg-danger/10 border border-danger/20" : "bg-success/10 border border-success/20"
            )}>
              {data.guardianBlocks.length > 0 
                ? <AlertTriangle className="w-6 h-6 text-danger" />
                : <ShieldCheck className="w-6 h-6 text-success" />
              }
            </div>
            <div className="text-right">
               {data.guardianBlocks.length > 0 ? (
                 <span className="text-[11px] font-black text-danger uppercase animate-pulse">CRITICAL</span>
               ) : (
                 <span className="text-[11px] font-black text-success uppercase">CLEAR</span>
               )}
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-white"><AnimatedNumber value={data.guardianBlocks.length} /></CardTitle>
          <CardDescription className="mt-1 font-bold">Guardian Blocks</CardDescription>
        </Card>

        {/* Refusal Recoverable */}
        <Card 
          className="relative overflow-hidden group hover:ring-1 ring-blue-500/50 transition-all cursor-pointer"
          onClick={() => router.push('/dashboard/waitlist')}
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-blue-500">
             <Users className="w-32 h-32" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-right">
               <p className="text-[11px] font-black text-white/60 uppercase">{data.refusal.count} Waiting</p>
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-white"><AnimatedNumber value={data.refusal.recoverable} /> <span className="text-sm text-white/40 font-bold">MAD</span></CardTitle>
          <CardDescription className="mt-1 font-bold">Refusal Recoverable</CardDescription>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* ═══════ Daily Intensity Chart ═══════ */}
          <Card className="h-96 flex flex-col justify-between group hover:ring-1 ring-white/10 transition-all">
            <CardHeader className="p-0">
               <div>
                  <CardTitle className="text-xl font-black uppercase">Daily Intensity</CardTitle>
                  <CardDescription className="font-bold">14-day booking & revenue flow</CardDescription>
               </div>
               <div className="flex items-center gap-4 bg-white/5 p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                     <span className="text-[9px] font-black text-white/40 uppercase">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                     <span className="text-[9px] font-black text-white/40 uppercase">Bookings</span>
                  </div>
               </div>
            </CardHeader>
            <div className="flex-1 flex items-end gap-2 pb-4 pt-10">
               {data.dailyIntensity.map((day, i) => (
                 <div key={i} className="group/bar relative flex-1 flex flex-col items-center justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white text-background text-[10px] font-black px-3 py-2 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-10 scale-95 group-hover/bar:scale-100 whitespace-nowrap shadow-xl">
                       <p className="text-primary">{day.revenue.toLocaleString()} MAD</p>
                       <p className="text-gray-500">{day.bookings} booking{day.bookings !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Booking count dot */}
                    {day.bookings > 0 && (
                      <div className="absolute top-0 z-20">
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[7px] font-black text-white/60">
                          {day.bookings}
                        </div>
                      </div>
                    )}
                    {/* Revenue bar */}
                    <div 
                      className="w-full bg-primary/10 group-hover/bar:bg-primary/40 rounded-t-lg transition-all duration-500" 
                      style={{ height: `${chartMax > 0 ? Math.max((day.revenue / chartMax) * 100, day.bookings > 0 ? 5 : 0) : 0}%` }} 
                    />
                 </div>
               ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
               {data.dailyIntensity.map((day, i) => (
                 <span key={i} className="text-[8px] font-black text-white/15 tracking-tighter">{day.label}</span>
               ))}
            </div>
          </Card>

          {/* ═══════ Active Compliance Queue ═══════ */}
          <div className="space-y-6">
            <CardHeader className="px-0">
               <CardTitle className="uppercase tracking-tight">Active Compliance Queue</CardTitle>
               <CardDescription className="font-bold">{data.guardianBlocks.length} issue{data.guardianBlocks.length !== 1 ? 's' : ''} requiring attention</CardDescription>
            </CardHeader>

            {data.guardianBlocks.length === 0 ? (
              <Card className="py-12 flex flex-col items-center justify-center">
                <ShieldCheck className="w-12 h-12 text-success/20 mb-4" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Fleet Fully Compliant</p>
                <p className="text-[9px] text-white/10 mt-1">All documents are valid and up to date</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.guardianBlocks.slice(0, 6).map((block, i) => (
                  <div 
                    key={block.id || i} 
                    onClick={() => openGuardianModal(block)}
                    className={cn(
                      "p-5 glass rounded-3xl flex items-center justify-between transition-all hover:translate-x-1 group cursor-pointer",
                      block.severity === 'danger' ? 'border-l-4 border-l-danger' : 'border-l-4 border-l-amber-500'
                    )}
                  >
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transition-transform group-hover:scale-110",
                        )}>
                           <Zap className={cn("w-6 h-6", block.severity === 'danger' ? 'text-danger' : 'text-amber-500')} />
                        </div>
                        <div>
                           <h4 className="font-bold text-sm text-white uppercase tracking-tight">{block.car}</h4>
                           <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{block.type} • {block.plate}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={cn("text-[11px] font-black tracking-widest uppercase", block.severity === 'danger' ? 'text-danger' : 'text-amber-500')}>
                          {block.risk}
                        </p>
                        <span className="text-[9px] font-bold text-white/20 uppercase group-hover:text-primary transition-colors">Resolve →</span>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ Right Sidebar ═══════ */}
        <div className="lg:col-span-4 space-y-8">
           {/* Star Asset */}
           <Card className="bg-primary/5 border-primary/20 relative overflow-hidden group shadow-2xl">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
              <div className="flex items-center gap-3 mb-8 relative z-10">
                 <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                    <TrendingUp className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                    <CardTitle className="text-primary uppercase tracking-tighter">Star Asset</CardTitle>
                    <CardDescription className="font-bold">Highest ROI performance</CardDescription>
                 </div>
              </div>

              {data.starAsset ? (
                <>
                  <div className="flex items-center gap-6 mb-8 relative z-10">
                     <div className="text-5xl group-hover:scale-110 transition-transform duration-500 select-none">🚗</div>
                     <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-1">
                          {data.starAsset.brand} {data.starAsset.model}
                        </h3>
                        <p className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">PL: {data.starAsset.plate}</p>
                     </div>
                  </div>
                  <div className="space-y-3 relative z-10">
                     <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                        <span className="text-white/40">ROI Score</span>
                        <span className={cn("shadow-success/40", data.starAsset.roi >= 0 ? "text-success" : "text-danger")}>
                          {data.starAsset.roi >= 0 ? '+' : ''}{data.starAsset.roi.toFixed(1)}%
                        </span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-primary shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-1000" 
                          style={{ width: `${Math.min(Math.max(data.starAsset.roi, 0), 100)}%` }}
                        />
                     </div>
                     {data.starAsset.totalRevenue > 0 && (
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                         Lifetime Revenue: {data.starAsset.totalRevenue.toLocaleString()} MAD
                       </p>
                     )}
                  </div>
                  <Button 
                    className="w-full mt-8" variant="outline" size="sm"
                    onClick={() => router.push('/dashboard/fleet')}
                  >
                    <Eye className="w-3.5 h-3.5 mr-2" />
                    Deep Analysis
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 relative z-10">
                  <Car className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No fleet data yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/fleet')}>
                    Add Your First Car
                  </Button>
                </div>
              )}
           </Card>

           {/* Live Activity */}
           <Card className="border-white/5">
              <CardHeader className="p-0 mb-8">
                 <CardTitle className="uppercase tracking-tight text-white/60">Live Activity</CardTitle>
                 <Activity className="w-4 h-4 text-white/20" />
              </CardHeader>
              <div className="space-y-6">
                 {data.liveActivity.length === 0 ? (
                   <div className="text-center py-8">
                     <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No recent activity</p>
                   </div>
                 ) : (
                   data.liveActivity.map((activity, i) => {
                     const colorMap: Record<string, string> = {
                       'New Booking': 'bg-success',
                       'Car Added': 'bg-primary',
                       'Car Updated': 'bg-blue-500',
                       'Price Updated': 'bg-amber-500',
                       'Booking Status Changed': 'bg-blue-500',
                       'Car Removed': 'bg-danger',
                     };
                     const dotColor = colorMap[activity.action] || 'bg-white/20';

                     return (
                       <div key={activity.id || i} className="flex gap-4 group cursor-pointer" onClick={() => {
                         // AuditLog stores entityType in UPPERCASE (BOOKING, CAR, ...);
                         // normalize defensively so routing never silently breaks.
                         const entity = (activity.entityType || '').toUpperCase();
                         if (entity === 'BOOKING') router.push('/dashboard/bookings');
                         else if (entity === 'CAR') router.push('/dashboard/fleet');
                         else if (entity === 'CUSTOMER') router.push('/dashboard/customers');
                         else showToast('info', activity.action, `By ${activity.user} • ${activity.time} ago`);
                       }}>
                          <div className="relative shrink-0">
                             <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 border border-white/5 group-hover:border-primary/40 transition-colors">
                               {activity.user?.[0] || 'S'}
                             </div>
                             <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", dotColor)} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                             <p className="text-xs font-black text-white/90 truncate uppercase tracking-tight group-hover:text-primary transition-colors">{activity.user}</p>
                             <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{activity.action}</p>
                          </div>
                          <span className="text-[9px] font-black text-white/10 uppercase mt-1.5 shrink-0">{activity.time}</span>
                       </div>
                     );
                   })
                 )}
              </div>
           </Card>

           {/* Operations Summary */}
           <Card className="border-white/5">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="uppercase tracking-tight text-white/60">Operations Overview</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-black text-success">{data.fleet.available}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Available</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push('/dashboard/bookings')}>
                  <p className="text-lg font-black text-primary">{data.fleet.rented}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Rented</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-black text-amber-500">{data.fleet.maintenance}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Maintenance</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push('/dashboard/fleet')}>
                  <p className="text-lg font-black text-danger">{data.fleet.outOfService}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Out of Service</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5">
                <div
                  className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors group"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white leading-none">{data.activeRentals}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Active Rentals</p>
                  </div>
                </div>
                <div
                  className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-500/10 transition-colors group"
                  onClick={() => router.push('/dashboard/customers')}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white leading-none">{data.totalCustomers}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Customers</p>
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
        title="Initialize Booking"
        description="Forensic Transaction Protocol"
        size="lg"
      >
        <form onSubmit={handleNewBooking} className="space-y-8">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Customer <span className="text-danger">*</span></p>
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen((v) => !v)}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors"
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
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Asset Allocation</p>
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
             <div className="p-5 glass rounded-3xl border border-primary/20 bg-primary/[0.03] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Walk-in Registration</p>
                <div className="grid grid-cols-2 gap-4">
                   <input
                     value={walkIn.firstName}
                     onChange={(e) => setWalkIn((w) => ({ ...w, firstName: e.target.value }))}
                     placeholder="First Name *"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
                   />
                   <input
                     value={walkIn.lastName}
                     onChange={(e) => setWalkIn((w) => ({ ...w, lastName: e.target.value }))}
                     placeholder="Last Name *"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
                   />
                   <input
                     value={walkIn.phone}
                     onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))}
                     placeholder="Phone *"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
                   />
                   <input
                     value={walkIn.identityNumber}
                     onChange={(e) => setWalkIn((w) => ({ ...w, identityNumber: e.target.value }))}
                     placeholder="CIN / ID Number *"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
                   />
                </div>
                <Button type="button" size="sm" className="w-full" onClick={handleQuickRegister} disabled={isRegistering}>
                   {isRegistering
                     ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                     : <Plus className="w-3.5 h-3.5 mr-2" />}
                   Register & Select
                </Button>
             </div>
           )}

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Start Date</p>
                 <input name="startDate" type="date" required min={new Date().toISOString().slice(0, 10)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Return Date</p>
                 <input name="endDate" type="date" required min={new Date().toISOString().slice(0, 10)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all" />
              </div>
           </div>

           <div className="p-6 glass rounded-3xl flex items-center justify-between border-primary/20 bg-primary/[0.03] shadow-lg">
              <div>
                 <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Pricing Vector</p>
                 <p className="text-3xl font-black text-white tracking-tighter">
                   {bookingPrice > 0 ? `${bookingPrice.toLocaleString()}` : '—'} <span className="text-sm text-white/40">MAD/day</span>
                 </p>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Tax & Escrow Included</p>
                 {risk.data && risk.data.depositMultiplier && risk.data.depositMultiplier > 1 ? (
                   <p className="text-[10px] font-black text-amber-500 uppercase mt-1 tracking-widest border border-amber-500/25 px-2 py-0.5 rounded-full inline-block">
                     Deposit ×{risk.data.depositMultiplier} · Risk Uplift
                   </p>
                 ) : bookingPrice > 0 && (
                   <p className="text-[10px] font-black text-success uppercase mt-1 tracking-widest border border-success/20 px-2 py-0.5 rounded-full inline-block">Live Rate</p>
                 )}
              </div>
           </div>

           <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeBookingModal}>Abort</Button>
              {risk.data?.blocked ? (
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 py-4"
                >
                  {overrideReason.trim() ? 'Override & Deploy' : 'Booking Locked — Override Required'}
                </Button>
              ) : (
                <Button type="submit" className="flex-1 py-4">
                  Execute Reservation
                </Button>
              )}
           </div>
        </form>
      </Modal>

      {/* ═══════ Guardian Intervention Modal ═══════ */}
      <Modal
        isOpen={isGuardianModalOpen}
        onClose={() => setIsGuardianModalOpen(false)}
        title="Guardian Intervention"
        description="Resolve critical asset compliance issue"
      >
         {selectedBlock && (
           <div className="space-y-6">
              <div className={cn(
                "p-4 border rounded-2xl",
                selectedBlock.severity === 'danger' ? 'bg-danger/10 border-danger/20' : 'bg-amber-500/10 border-amber-500/20'
              )}>
                 <p className={cn(
                   "text-xs font-black uppercase tracking-widest mb-1",
                   selectedBlock.severity === 'danger' ? 'text-danger' : 'text-amber-500'
                 )}>
                   {selectedBlock.severity === 'danger' ? 'Critical Block Detected' : 'Warning: Action Required'}
                 </p>
                 <p className="text-xs text-white/60 leading-relaxed">
                   <strong>{selectedBlock.type}</strong> for <strong>{selectedBlock.car}</strong> ({selectedBlock.plate}) has status: <strong>{selectedBlock.risk}</strong>. 
                   {selectedBlock.severity === 'danger' 
                     ? ' The system has hard-locked this asset from bookings.'
                     : ' The document will expire soon — renew to avoid a booking lock.'}
                 </p>
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Quick Actions</p>
                 <Button 
                   className="w-full justify-between" 
                   onClick={() => { 
                     setIsGuardianModalOpen(false); 
                     router.push('/dashboard/fleet');
                   }}
                 >
                   View Vehicle Details
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
                     Assign Renewal Task
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
