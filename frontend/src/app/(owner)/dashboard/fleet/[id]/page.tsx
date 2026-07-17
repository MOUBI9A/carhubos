"use client";

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Car as CarIcon,
  ShieldCheck,
  Wrench,
  TrendingUp,
  History,
  AlertTriangle,
  Clock,
  FileText,
  ChevronLeft,
  Plus,
  Zap,
  Trash2,
  DollarSign,
  Fuel,
  Cog,
  Gauge,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useCarDetail } from './useCarDetail';
import {
  CAR_STATUSES,
  STATUS_STYLES,
  HEALTH_STYLES,
  DOC_STATUS_HEALTH,
  DOC_TYPES,
  MAINTENANCE_TYPES,
  complianceScore,
  complianceHealth,
  daysUntil,
  formatDate,
  formatDocType,
  type CarDocument,
  type CarStatus,
} from '../types';

type TabId = 'overview' | 'guardian' | 'maintenance' | 'analytics';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: History },
  { id: 'guardian', label: 'Guardian', icon: ShieldCheck },
  { id: 'maintenance', label: 'Mechanical', icon: Wrench },
  { id: 'analytics', label: 'Financial', icon: TrendingUp },
];

const BOOKING_STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'text-white/40 bg-white/5 border-white/10',
  APPROVED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ACTIVE: 'text-primary bg-primary/10 border-primary/20',
  COMPLETED: 'text-success bg-success/10 border-success/20',
  CANCELLED: 'text-danger bg-danger/10 border-danger/20',
};

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20';

export default function CarProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { data: car, isLoading, error, refetch } = useCarDetail(id);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [renewingDoc, setRenewingDoc] = useState<CarDocument | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus: CarStatus) => {
    if (!car || newStatus === car.status) {
      setIsStatusModalOpen(false);
      return;
    }
    setIsMutating(true);
    try {
      await api.patch(`/cars/${car.id}`, { status: newStatus });
      setIsStatusModalOpen(false);
      showToast('info', 'Asset Status Modified', `Vehicle marked as ${newStatus.replace(/_/g, ' ')} in the fleet ledger.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update status';
      showToast('danger', 'Update Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const type = formData.get('type') as string;
    const description = (formData.get('description') as string)?.trim();
    const cost = parseFloat(formData.get('cost') as string);
    const mileageRaw = (formData.get('mileage') as string)?.trim();
    const garageName = (formData.get('garage') as string)?.trim();

    if (!description) {
      showToast('danger', 'Missing Description', 'Describe the mechanical intervention.');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      showToast('danger', 'Invalid Cost', 'Enter a valid cost (0 or more).');
      return;
    }
    const mileage = mileageRaw ? parseInt(mileageRaw, 10) : undefined;
    if (mileageRaw && (!Number.isInteger(mileage) || (mileage as number) < 0)) {
      showToast('danger', 'Invalid Mileage', 'Mileage must be a positive number.');
      return;
    }

    setIsMutating(true);
    try {
      await api.post('/maintenance', {
        carId: car.id,
        type,
        description,
        cost,
        ...(mileage !== undefined ? { mileage } : {}),
        ...(garageName ? { garageName } : {}),
      });
      setIsMaintenanceModalOpen(false);
      showToast('success', 'Mechanical Log Updated', 'Maintenance record synchronized — ROI recalculated.');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to log maintenance';
      showToast('danger', 'Sync Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const type = formData.get('type') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const issueDate = formData.get('issueDate') as string;

    if (!expiryDate) {
      showToast('danger', 'Missing Expiry', 'The expiry date is required for compliance tracking.');
      return;
    }

    setIsMutating(true);
    try {
      await api.post('/documents', {
        carId: car.id,
        type,
        expiryDate,
        ...(issueDate ? { issueDate } : {}),
      });
      setIsDocModalOpen(false);
      showToast('success', 'Document Registered', `${formatDocType(type)} is now tracked by Guardian.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to register document';
      showToast('danger', 'Registration Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRenewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingDoc) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const expiryDate = formData.get('expiryDate') as string;
    if (!expiryDate) {
      showToast('danger', 'Missing Expiry', 'Select the new expiry date.');
      return;
    }

    setIsMutating(true);
    try {
      await api.patch(`/documents/${renewingDoc.id}`, { expiryDate });
      setRenewingDoc(null);
      showToast('success', 'Document Renewed', `${formatDocType(renewingDoc.type)} compliance window extended.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to renew document';
      showToast('danger', 'Renewal Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!car) return;
    setIsMutating(true);
    try {
      await api.delete(`/cars/${car.id}`);
      showToast('success', 'Asset Decommissioned', `${car.brand} ${car.model} removed from the fleet.`);
      router.push('/dashboard/fleet');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete vehicle';
      showToast('danger', 'Deletion Blocked', Array.isArray(msg) ? msg.join(' ') : String(msg));
      setIsDeleteModalOpen(false);
      setIsMutating(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
          <Skeleton className="w-32 h-4" />
          <div className="flex gap-3">
            <Skeleton className="w-28 h-9 rounded-xl" />
            <Skeleton className="w-36 h-9 rounded-xl" />
          </div>
        </div>
        <div className="glass rounded-2xl p-6 flex items-center gap-8">
          <Skeleton className="w-24 h-24 rounded-3xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="w-1/2 h-7" />
            <Skeleton className="w-1/3 h-3.5" />
          </div>
          <Skeleton className="w-40 h-14 rounded-2xl" />
        </div>
        <div className="flex gap-8 border-b border-white/5 pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <SkeletonRows rows={5} />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error || !car) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Asset Unreachable</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error || 'Vehicle not found'}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/fleet">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Fleet
            </Button>
          </Link>
          <Button onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[car.status];
  const score = complianceScore(car.documents);
  const health = complianceHealth(score);
  const kmToService =
    car.nextServiceKm !== null ? car.nextServiceKm - car.mileage : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Breadcrumb & Actions ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link href="/dashboard/fleet" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group w-fit">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Fleet Assets</span>
        </Link>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2 text-danger" />
            <span className="text-danger">Decommission</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(true)}>
            <Zap className="w-4 h-4 mr-2" />
            Set Status
          </Button>
          <Button size="sm" onClick={() => setIsMaintenanceModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Maintenance
          </Button>
        </div>
      </div>

      {/* ═══════ Hero Card ═══════ */}
      <Card className="relative overflow-hidden border-primary/20 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 pointer-events-none">
          <span className="text-[60px] font-black text-white/[0.03] uppercase select-none leading-none">{car.model}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-8 relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shrink-0">
            <CarIcon className="w-12 h-12 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-black text-white uppercase tracking-tight">
                {car.brand} {car.model}
              </h1>
              <span className={cn(
                'text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1.5',
                statusStyle.text, statusStyle.bg, statusStyle.border,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', statusStyle.dot)} />
                {car.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
              {car.licensePlate} • {car.year} Model • {car.mileage.toLocaleString()} km
            </p>
          </div>
          <div className="flex gap-12 md:border-l border-white/5 md:pl-12">
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 md:text-right">Net ROI</p>
              <p className={cn('text-2xl font-black', car.currentRoi >= 0 ? 'text-success' : 'text-danger')}>
                {car.currentRoi >= 0 ? '+' : ''}{car.currentRoi.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 md:text-right">Verified Revenue</p>
              <p className="text-2xl font-black text-white">
                {car.financials.totalRevenue.toLocaleString()} <span className="text-xs text-white/40">MAD</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════ Tabs ═══════ */}
      <div className="flex gap-8 border-b border-white/5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap',
              activeTab === tab.id ? 'text-primary' : 'text-white/40 hover:text-white/60',
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.id === 'guardian' && car.documents.some((d) => d.status !== 'VALID') && (
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-primary/40" />
            )}
          </button>
        ))}
      </div>

      {/* ═══════ Tab Content ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <div className="lg:col-span-2 space-y-6">
              <CardHeader className="px-0">
                <CardTitle>Rental History</CardTitle>
                <CardDescription>{car.bookings.length} recent session{car.bookings.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              {car.bookings.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No Rentals Yet"
                  description="This asset has no booking history. Sessions will appear here once the vehicle is reserved."
                />
              ) : (
                <div className="space-y-4">
                  {car.bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 glass-card group hover:translate-x-1 transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                          <History className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white uppercase tracking-tight truncate">
                            {booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : 'Unassigned Customer'}
                          </p>
                          <p className="text-[10px] font-medium text-white/40">
                            {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <p className="text-xs font-black text-white hidden sm:block">
                          {booking.totalPrice.toLocaleString()} <span className="text-white/40 text-[9px]">MAD</span>
                        </p>
                        <span className={cn(
                          'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border',
                          BOOKING_STATUS_STYLES[booking.status] || BOOKING_STATUS_STYLES.REQUESTED,
                        )}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-6">
              <Card>
                <CardTitle className="mb-4">Compliance Score</CardTitle>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/5" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="16" fill="none"
                      className={cn('transition-all duration-1000', {
                        'stroke-success': health === 'success',
                        'stroke-amber-500': health === 'warning',
                        'stroke-danger': health === 'danger',
                      })}
                      strokeWidth="3"
                      strokeDasharray={`${score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{score}</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Integrity</span>
                  </div>
                </div>
                <p className="text-[9px] text-white/40 text-center mt-6 uppercase font-bold tracking-widest">
                  {car.documents.length === 0
                    ? 'No documents registered yet.'
                    : `${car.documents.filter((d) => d.status === 'VALID').length}/${car.documents.length} documents fully valid.`}
                </p>
              </Card>
              <Card>
                <CardTitle className="mb-5">Asset Specs</CardTitle>
                <div className="space-y-4">
                  {[
                    { icon: Fuel, label: 'Fuel Type', value: car.fuelType },
                    { icon: Cog, label: 'Gearbox', value: car.gearbox },
                    { icon: Gauge, label: 'Odometer', value: `${car.mileage.toLocaleString()} km` },
                    { icon: DollarSign, label: 'Daily Rate', value: `${car.pricePerDay.toLocaleString()} MAD` },
                  ].map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <spec.icon className="w-4 h-4 text-white/20" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{spec.label}</span>
                      </div>
                      <span className="text-xs font-black text-white uppercase">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── GUARDIAN ── */}
        {activeTab === 'guardian' && (
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Compliance Vault</CardTitle>
                <CardDescription className="mt-1">Legal documents with live expiry tracking</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsDocModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Register Document
              </Button>
            </div>
            {car.documents.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No Documents Tracked"
                description="Register insurance, carte grise, technical inspection and vignette to activate Guardian hard-lock protection."
                action={
                  <Button size="sm" onClick={() => setIsDocModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Register First Document
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {car.documents.map((doc) => {
                  const docHealth = DOC_STATUS_HEALTH[doc.status] ?? 'success';
                  const days = daysUntil(doc.expiryDate);
                  const timerLabel =
                    days < 0
                      ? `EXPIRED ${Math.abs(days)}D AGO`
                      : days === 0
                        ? 'EXPIRES TODAY'
                        : `${days} DAYS LEFT`;
                  return (
                    <Card
                      key={doc.id}
                      className={cn('border-l-4 group transition-all', HEALTH_STYLES[docHealth].borderL)}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center border',
                          docHealth === 'danger' && 'bg-danger/10 text-danger border-danger/20',
                          docHealth === 'warning' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                          docHealth === 'success' && 'bg-success/10 text-success border-success/20',
                        )}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setRenewingDoc(doc)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Renew
                        </Button>
                      </div>
                      <h3 className="font-black text-white uppercase tracking-tight">{formatDocType(doc.type)}</h3>
                      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mt-1">
                        Expires {formatDate(doc.expiryDate)}{doc.isMandatory ? ' • Mandatory' : ''}
                      </p>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Live Timer</p>
                          <p className={cn(
                            'text-xl font-black',
                            HEALTH_STYLES[docHealth].text,
                            docHealth === 'danger' && 'animate-pulse',
                          )}>
                            {timerLabel}
                          </p>
                        </div>
                        {docHealth === 'danger' && <AlertTriangle className="w-5 h-5 text-danger mb-1" />}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MECHANICAL ── */}
        {activeTab === 'maintenance' && (
          <div className="lg:col-span-3 space-y-6">
            {car.maintenance.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No Mechanical History"
                description="Workshop interventions will appear here. Logging maintenance keeps the ROI engine accurate."
                action={
                  <Button size="sm" onClick={() => setIsMaintenanceModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Log First Intervention
                  </Button>
                }
              />
            ) : (
              <Card padding="none" className="overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Intervention</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Garage</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Expenditure</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {car.maintenance.map((record) => (
                        <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-xs font-bold text-white/60 whitespace-nowrap">
                            {formatDate(record.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                              {record.type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-[9px] font-black text-white/20 uppercase">
                              {record.description}
                              {record.mileage ? ` • ${record.mileage.toLocaleString()} km` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-white/40 uppercase">
                            {record.garageName || '—'}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-white whitespace-nowrap">
                            {record.cost.toLocaleString()} MAD
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border',
                              record.status === 'COMPLETED'
                                ? 'text-success bg-success/10 border-success/20'
                                : record.status === 'IN_GARAGE'
                                  ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                  : 'text-white/40 bg-white/5 border-white/10',
                            )}>
                              {record.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card className="bg-primary/5 border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-primary text-xs uppercase tracking-tighter">Next Service Predictor</CardTitle>
                  <p className="text-xs text-white/60 leading-relaxed mt-1">
                    {car.nextServiceKm !== null ? (
                      <>Predictive maintenance scheduled at <span className="text-white font-bold">{car.nextServiceKm.toLocaleString()} km</span>.</>
                    ) : (
                      'No service threshold configured for this asset.'
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {kmToService !== null ? (
                  <>
                    <p className={cn('text-xl font-black uppercase tracking-tighter', kmToService <= 0 ? 'text-danger' : 'text-white')}>
                      {kmToService <= 0 ? 'OVERDUE' : `${kmToService.toLocaleString()} KM`}
                    </p>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                      {kmToService <= 0 ? 'Service immediately' : 'Until service'}
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-black text-white/20 uppercase tracking-tighter">—</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── FINANCIAL ── */}
        {activeTab === 'analytics' && (
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="flex flex-col justify-between group hover:ring-1 ring-primary/30 transition-all">
              <CardHeader className="p-0">
                <div>
                  <CardTitle className="uppercase tracking-tight">Verified Cash Flow</CardTitle>
                  <CardDescription>Real payments only — no quoted prices</CardDescription>
                </div>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 mt-8">
                <div className="p-5 bg-success/5 border border-success/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-success uppercase tracking-widest mb-1">Verified Revenue</p>
                    <p className="text-2xl font-black text-white">{car.financials.totalRevenue.toLocaleString()} <span className="text-xs text-white/40">MAD</span></p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-success/30" />
                </div>
                <div className="p-5 bg-danger/5 border border-danger/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-danger uppercase tracking-widest mb-1">Maintenance Spend</p>
                    <p className="text-2xl font-black text-white">{car.financials.totalMaintenanceCost.toLocaleString()} <span className="text-xs text-white/40">MAD</span></p>
                  </div>
                  <Wrench className="w-8 h-8 text-danger/30" />
                </div>
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Net Position</p>
                    <p className={cn('text-2xl font-black', car.financials.netProfit >= 0 ? 'text-success' : 'text-danger')}>
                      {car.financials.netProfit >= 0 ? '+' : ''}{car.financials.netProfit.toLocaleString()} <span className="text-xs text-white/40">MAD</span>
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary/30" />
                </div>
              </div>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader className="p-0 mb-8">
                <div>
                  <CardTitle className="uppercase tracking-tighter">Asset Intelligence</CardTitle>
                  <CardDescription>ROI engine classification</CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-8">
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 relative overflow-hidden">
                  <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-primary opacity-10" />
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">
                    {car.currentRoi >= 50 ? 'Alpha Performance' : car.currentRoi >= 0 ? 'Stable Asset' : 'Underperforming'}
                  </p>
                  <p className="text-xs text-white/70 leading-relaxed font-medium">
                    {car.currentRoi >= 50 ? (
                      <>This vehicle is a <span className="text-white font-black italic">Star Asset</span> — it returns {car.currentRoi.toFixed(0)}% over its maintenance base with strong turnaround.</>
                    ) : car.currentRoi >= 0 ? (
                      <>This vehicle is profitable at <span className="text-white font-black">{car.currentRoi.toFixed(1)}%</span> ROI. Increase utilization or optimize rates to reach Star Asset tier.</>
                    ) : (
                      <>This vehicle is running at a <span className="text-danger font-black">negative ROI</span>. Review maintenance costs and pricing before the next rental cycle.</>
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="text-white/40">ROI Score</span>
                    <span className={car.currentRoi >= 0 ? 'text-success' : 'text-danger'}>
                      {car.currentRoi >= 0 ? '+' : ''}{car.currentRoi.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={cn('h-full transition-all duration-1000', car.currentRoi >= 0 ? 'bg-success shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-danger')}
                      style={{ width: `${Math.min(Math.max(car.currentRoi, 0), 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    Based on {car.bookings.length} recent session{car.bookings.length !== 1 ? 's' : ''} and {car.maintenance.length} maintenance record{car.maintenance.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ═══════ Maintenance Modal ═══════ */}
      <Modal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        title="Record Mechanical Intervention"
        description="Sync workshop bill to asset ledger"
      >
        <form onSubmit={handleLogMaintenance} className="space-y-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Intervention Type</p>
            <select name="type" className={cn(inputCls, 'appearance-none')}>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Description *</p>
            <input name="description" required placeholder="e.g. Full synthetic oil change + filter" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Cost (MAD) *</p>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input name="cost" type="number" min={0} step="0.01" required placeholder="0.00" className={cn(inputCls, 'pl-11')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Odometer (km)</p>
              <input name="mileage" type="number" min={0} placeholder={car.mileage.toLocaleString()} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Garage Entity</p>
            <input name="garage" placeholder="Workshop name" className={inputCls} />
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsMaintenanceModalOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={isMutating}>
              {isMutating ? 'Syncing...' : 'Sync Mechanical Data'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Status Modal ═══════ */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Asset Status Control"
        description="Manually override vehicle availability"
      >
        <div className="grid grid-cols-2 gap-4">
          {CAR_STATUSES.map((status) => {
            const style = STATUS_STYLES[status];
            const isActive = car.status === status;
            return (
              <button
                key={status}
                disabled={isMutating}
                onClick={() => handleUpdateStatus(status)}
                className={cn(
                  'p-5 rounded-2xl border transition-all hover:scale-[1.03] active:scale-[0.98] text-center disabled:opacity-50',
                  isActive
                    ? cn(style.bg, style.border, 'ring-1', style.ring)
                    : 'bg-white/5 border-white/5 hover:border-white/10',
                )}
              >
                <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', isActive ? style.text : 'text-white/20')}>
                  {status.replace(/_/g, ' ')}
                </p>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* ═══════ Add Document Modal ═══════ */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Register Document"
        description="Track a legal document in the Guardian vault"
      >
        <form onSubmit={handleAddDocument} className="space-y-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Document Type</p>
            <select name="type" className={cn(inputCls, 'appearance-none')}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{formatDocType(t)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Issue Date</p>
              <input name="issueDate" type="date" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Expiry Date *</p>
              <input name="expiryDate" type="date" required className={inputCls} />
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDocModalOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={isMutating}>
              {isMutating ? 'Registering...' : 'Activate Tracking'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Renew Document Modal ═══════ */}
      <Modal
        isOpen={renewingDoc !== null}
        onClose={() => setRenewingDoc(null)}
        title="Renew Document"
        description={renewingDoc ? `Extend ${formatDocType(renewingDoc.type)} compliance window` : ''}
      >
        {renewingDoc && (
          <form onSubmit={handleRenewDocument} className="space-y-6">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Expiry</p>
              <p className="text-sm font-black text-white mt-1">{formatDate(renewingDoc.expiryDate)}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">New Expiry Date *</p>
              <input name="expiryDate" type="date" required className={inputCls} />
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRenewingDoc(null)} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" isLoading={isMutating}>
                {isMutating ? 'Renewing...' : 'Confirm Renewal'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════ Delete Confirmation Modal ═══════ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Decommission Asset"
        description="This action is permanent"
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl">
            <p className="text-xs text-white/70 leading-relaxed">
              You are about to permanently remove <strong className="text-white">{car.brand} {car.model} ({car.licensePlate})</strong> from
              your fleet. Vehicles with booking history cannot be deleted — set them to <strong className="text-white">OUT OF SERVICE</strong> instead
              to preserve financial records.
            </p>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)} disabled={isMutating}>
              Keep Asset
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleDelete} isLoading={isMutating}>
              <Trash2 className="w-4 h-4 mr-2" />
              {isMutating ? 'Removing...' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
