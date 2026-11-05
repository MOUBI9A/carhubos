"use client";

import { useTranslations } from 'next-intl';
import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { CarPhoto } from '@/components/ui/AgencyImage';
import { Avatar } from '@/components/ui/Avatar';
import { TrustSeal } from '@/components/ui/Seal';
import {
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
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { getVaultDownloadUrl } from '@/lib/vault';
import { useCarDetail } from './useCarDetail';
import { VaultFileAttachment, type AttachedVaultFile } from './VaultFileAttachment';
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
  REQUESTED: 'text-text-faint bg-surface-raised border-hairline',
  APPROVED: 'text-info bg-info/10 border-info/20',
  ACTIVE: 'text-primary bg-primary/10 border-primary/20',
  OVERDUE: 'text-warning bg-warning/10 border-warning/20',
  COMPLETED: 'text-success bg-success/10 border-success/20',
  CANCELLED: 'text-danger bg-danger/10 border-danger/20',
};

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

export default function CarProfile({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('ownerPages');
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
  const [attachedFile, setAttachedFile] = useState<AttachedVaultFile | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

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
        ...(attachedFile ? { vaultFileId: attachedFile.id } : {}),
      });
      setIsDocModalOpen(false);
      setAttachedFile(null);
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
      await api.patch(`/documents/${renewingDoc.id}`, {
        expiryDate,
        ...(attachedFile ? { vaultFileId: attachedFile.id } : {}),
      });
      setRenewingDoc(null);
      setAttachedFile(null);
      showToast('success', 'Document Renewed', `${formatDocType(renewingDoc.type)} compliance window extended.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to renew document';
      showToast('danger', 'Renewal Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const closeDocModal = () => {
    setIsDocModalOpen(false);
    setAttachedFile(null);
  };

  const closeRenewModal = () => {
    setRenewingDoc(null);
    setAttachedFile(null);
  };

  const handleViewDocument = async (doc: CarDocument) => {
    if (!doc.vaultFileId) return;
    setViewingDocId(doc.id);
    try {
      const url = await getVaultDownloadUrl(doc.vaultFileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      const msg =
        err?.response?.status === 503
          ? 'Vault storage isn’t configured yet.'
          : err?.response?.data?.message || 'Could not generate a download link.';
      showToast('danger', 'View Failed', msg);
    } finally {
      setViewingDocId(null);
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
        <div className="rounded-2xl bg-surface border border-hairline p-6 flex items-center gap-8">
          <Skeleton className="w-24 h-24 rounded-3xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="w-1/2 h-7" />
            <Skeleton className="w-1/3 h-3.5" />
          </div>
          <Skeleton className="w-40 h-14 rounded-2xl" />
        </div>
        <div className="flex gap-8 border-b border-hairline pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-2xl bg-surface border border-hairline p-6">
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
          <p className="text-base font-semibold tracking-tight text-foreground">Asset unreachable</p>
          <p className="mt-2 max-w-sm text-sm text-text-muted">{error || 'Vehicle not found'}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/fleet">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 me-2" /> Back to fleet
            </Button>
          </Link>
          <Button onClick={refetch}>
            <RefreshCw className="w-4 h-4 me-2" /> Retry
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
        <Link href="/dashboard/fleet" className="group flex w-fit items-center gap-2 text-text-muted transition-colors hover:text-foreground">
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="eyebrow">Fleet assets</span>
        </Link>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="w-4 h-4 me-2 text-danger" />
            <span className="text-danger">Decommission</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(true)}>
            <Zap className="w-4 h-4 me-2" />
            Set status
          </Button>
          <Button size="sm" onClick={() => setIsMaintenanceModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Log maintenance
          </Button>
        </div>
      </div>

      {/* ═══════ Hero Card ═══════ */}
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-80 lg:w-96 shrink-0">
            <CarPhoto
              src={car.imageUrl}
              alt={`${car.brand} ${car.model}`}
              plate={car.licensePlate}
              price={`${car.pricePerDay.toLocaleString()} MAD/day`}
              rounded="rounded-none"
              className="h-full"
            />
          </div>
          <div className="flex flex-1 flex-col justify-between gap-6 p-6 md:p-8">
            <div>
              <p className="eyebrow mb-2">{t('fleet')}</p>
              <div className="mb-1.5 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                  {car.brand} {car.model}
                </h1>
                <span className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
                  statusStyle.text, statusStyle.bg, statusStyle.border,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                  {car.status.replace(/_/g, ' ').toLowerCase()}
                </span>
                {score === 100 && <TrustSeal size={30} label="Fully compliant" />}
              </div>
              <p className="text-sm text-text-muted">
                <span className="font-mono tabular">{car.licensePlate}</span>
                <span className="mx-1.5 text-text-faint">·</span>
                <span className="font-mono tabular">{car.year}</span>
                <span className="mx-1.5 text-text-faint">·</span>
                <span className="font-mono tabular">{car.mileage.toLocaleString()}</span> km
              </p>
            </div>
            <div className="flex gap-10">
              <div>
                <p className="eyebrow">Net ROI</p>
                <p className={cn('mt-1 text-2xl font-semibold tracking-tight font-mono tabular', car.currentRoi >= 0 ? 'text-success' : 'text-danger')}>
                  {car.currentRoi >= 0 ? '+' : ''}{car.currentRoi.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="eyebrow">Verified revenue</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  <span className="font-mono tabular metal-text">{car.financials.totalRevenue.toLocaleString()}</span>
                  <span className="ms-1.5 text-sm font-normal text-text-faint">MAD</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════ Tabs ═══════ */}
      <div className="flex gap-8 border-b border-hairline overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap pb-4 text-sm font-medium transition-colors',
              activeTab === tab.id ? 'text-primary' : 'text-text-muted hover:text-foreground',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'guardian' && car.documents.some((d) => d.status !== 'VALID') && (
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 start-0 end-0 h-0.5 rounded-t-full bg-primary" />
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
                <CardTitle>Rental history</CardTitle>
                <CardDescription>{car.bookings.length} recent session{car.bookings.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              {car.bookings.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No rentals yet"
                  description="This asset has no booking history. Sessions will appear here once the vehicle is reserved."
                />
              ) : (
                <div className="space-y-4">
                  {car.bookings.map((booking) => {
                    const renterName = booking.customer
                      ? `${booking.customer.firstName} ${booking.customer.lastName}`
                      : 'Unassigned customer';
                    return (
                    <div key={booking.id} className="group flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface p-4 transition-colors hover:bg-surface-raised">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar name={booking.customer ? renterName : undefined} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {renterName}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">
                            <span className="font-mono tabular">{formatDate(booking.startDate)}</span> → <span className="font-mono tabular">{formatDate(booking.endDate)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <p className="hidden text-xs text-foreground sm:block">
                          <span className="font-mono tabular font-medium">{booking.totalPrice.toLocaleString()}</span> <span className="text-[10px] text-text-faint">MAD</span>
                        </p>
                        <span className={cn(
                          'rounded-md border px-2 py-0.5 text-xs font-medium',
                          BOOKING_STATUS_STYLES[booking.status] || BOOKING_STATUS_STYLES.REQUESTED,
                        )}>
                          {booking.status.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-6">
              <Card>
                <CardTitle className="mb-4">Compliance score</CardTitle>
                <div className="relative w-32 h-32 mx-auto">
                  {/* Decorative gauge — the score is announced via the visible text below. */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-hairline" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="16" fill="none"
                      className={cn('transition-all duration-1000', {
                        'stroke-success': health === 'success',
                        'stroke-warning': health === 'warning',
                        'stroke-danger': health === 'danger',
                      })}
                      strokeWidth="3"
                      strokeDasharray={`${score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">{score}</span>
                    <span className="eyebrow">Integrity</span>
                  </div>
                </div>
                <p className="mt-6 text-center text-xs text-text-muted">
                  {car.documents.length === 0
                    ? 'No documents registered yet.'
                    : `${car.documents.filter((d) => d.status === 'VALID').length}/${car.documents.length} documents fully valid.`}
                </p>
              </Card>
              <Card>
                <CardTitle className="mb-5">Asset specs</CardTitle>
                <div className="space-y-4">
                  {[
                    { icon: Fuel, label: 'Fuel type', value: car.fuelType },
                    { icon: Cog, label: 'Gearbox', value: car.gearbox },
                    { icon: Gauge, label: 'Odometer', value: `${car.mileage.toLocaleString()} km` },
                    { icon: DollarSign, label: 'Daily rate', value: `${car.pricePerDay.toLocaleString()} MAD` },
                  ].map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <spec.icon className="w-4 h-4 text-text-faint" />
                        <span className="eyebrow">{spec.label}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground font-mono tabular">{spec.value}</span>
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
                <CardTitle>Compliance vault</CardTitle>
                <CardDescription className="mt-1">Legal documents with live expiry tracking</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsDocModalOpen(true)}>
                <Plus className="w-4 h-4 me-2" />
                Register document
              </Button>
            </div>
            {car.documents.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No documents tracked"
                description="Register insurance, carte grise, technical inspection and vignette to activate Guardian hard-lock protection."
                action={
                  <Button size="sm" onClick={() => setIsDocModalOpen(true)}>
                    <Plus className="w-4 h-4 me-2" /> Register first document
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
                      ? `Expired ${Math.abs(days)}d ago`
                      : days === 0
                        ? 'Expires today'
                        : `${days} days left`;
                  return (
                    <Card
                      key={doc.id}
                      className={cn('border-l-4 group transition-all', HEALTH_STYLES[docHealth].borderL)}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center border',
                          docHealth === 'danger' && 'bg-danger/10 text-danger border-danger/20',
                          docHealth === 'warning' && 'bg-warning/10 text-warning border-warning/20',
                          docHealth === 'success' && 'bg-success/10 text-success border-success/20',
                        )}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.vaultFileId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0"
                              disabled={viewingDocId === doc.id}
                              onClick={() => handleViewDocument(doc)}
                              aria-label={`View ${formatDocType(doc.type)} file`}
                            >
                              {viewingDocId === doc.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-text-muted" />
                              )}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setRenewingDoc(doc)}>
                            <RefreshCw className="w-3.5 h-3.5 me-1.5" />
                            Renew
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold tracking-tight text-foreground">{formatDocType(doc.type)}</h3>
                      <p className="mt-1 text-xs text-text-faint">
                        Expires <span className="font-mono tabular">{formatDate(doc.expiryDate)}</span>{doc.isMandatory ? ' · Mandatory' : ''}
                      </p>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="eyebrow">Live timer</p>
                          <p className={cn(
                            'mt-0.5 text-lg font-semibold font-mono tabular',
                            HEALTH_STYLES[docHealth].text,
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
                title="No mechanical history"
                description="Workshop interventions will appear here. Logging maintenance keeps the ROI engine accurate."
                action={
                  <Button size="sm" onClick={() => setIsMaintenanceModalOpen(true)}>
                    <Plus className="w-4 h-4 me-2" /> Log first intervention
                  </Button>
                }
              />
            ) : (
              <Card padding="none" className="overflow-hidden">
                <div className="relative w-full overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-surface-raised border-b border-hairline">
                      <tr>
                        <th className="px-6 py-3 eyebrow">Date</th>
                        <th className="px-6 py-3 eyebrow">Intervention</th>
                        <th className="px-6 py-3 eyebrow">Garage</th>
                        <th className="px-6 py-3 eyebrow">Cost</th>
                        <th className="px-6 py-3 eyebrow text-end">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {car.maintenance.map((record) => (
                        <tr key={record.id} className="group transition-colors hover:bg-surface-raised">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted font-mono tabular">
                            {formatDate(record.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-foreground">
                              {record.type.replace(/_/g, ' ').toLowerCase()}
                            </p>
                            <p className="text-xs text-text-faint">
                              {record.description}
                              {record.mileage ? <> · <span className="font-mono tabular">{record.mileage.toLocaleString()}</span> km</> : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs text-text-muted">
                            {record.garageName || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground font-mono tabular">
                            {record.cost.toLocaleString()} MAD
                          </td>
                          <td className="px-6 py-4 text-end">
                            <span className={cn(
                              'rounded-md border px-2 py-0.5 text-xs font-medium',
                              record.status === 'COMPLETED'
                                ? 'text-success bg-success/10 border-success/20'
                                : record.status === 'IN_GARAGE'
                                  ? 'text-warning bg-warning/10 border-warning/20'
                                  : 'text-text-faint bg-surface-raised border-hairline',
                            )}>
                              {record.status.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-surface-raised">
                  <Clock className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <CardTitle>Next service predictor</CardTitle>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {car.nextServiceKm !== null ? (
                      <>Predictive maintenance scheduled at <span className="font-medium text-foreground font-mono tabular">{car.nextServiceKm.toLocaleString()} km</span>.</>
                    ) : (
                      'No service threshold configured for this asset.'
                    )}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-end">
                {kmToService !== null ? (
                  <>
                    <p className={cn('text-xl font-semibold tracking-tight', kmToService <= 0 ? 'text-danger' : 'text-foreground')}>
                      {kmToService <= 0 ? 'Overdue' : <><span className="font-mono tabular">{kmToService.toLocaleString()}</span> km</>}
                    </p>
                    <p className="eyebrow">
                      {kmToService <= 0 ? 'Service immediately' : 'Until service'}
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-semibold text-text-faint">—</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── FINANCIAL ── */}
        {activeTab === 'analytics' && (
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="flex flex-col justify-between">
              <CardHeader className="p-0">
                <div>
                  <CardTitle>Verified cash flow</CardTitle>
                  <CardDescription>Real payments only — no quoted prices</CardDescription>
                </div>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 mt-8">
                <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface-raised p-5">
                  <div>
                    <p className="eyebrow">Verified revenue</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground"><span className="font-mono tabular">{car.financials.totalRevenue.toLocaleString()}</span> <span className="text-sm font-normal text-text-faint">MAD</span></p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-text-faint" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface-raised p-5">
                  <div>
                    <p className="eyebrow">Maintenance spend</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground"><span className="font-mono tabular">{car.financials.totalMaintenanceCost.toLocaleString()}</span> <span className="text-sm font-normal text-text-faint">MAD</span></p>
                  </div>
                  <Wrench className="w-6 h-6 text-text-faint" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface-raised p-5">
                  <div>
                    <p className="eyebrow">Net position</p>
                    <p className={cn('mt-1 text-2xl font-semibold tracking-tight', car.financials.netProfit >= 0 ? 'text-success' : 'text-danger')}>
                      <span className="font-mono tabular">{car.financials.netProfit >= 0 ? '+' : ''}{car.financials.netProfit.toLocaleString()}</span> <span className="text-sm font-normal text-text-faint">MAD</span>
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-text-faint" />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader className="p-0 mb-8">
                <div>
                  <CardTitle>Asset intelligence</CardTitle>
                  <CardDescription>ROI engine classification</CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-8">
                <div className="p-5 rounded-2xl border border-hairline bg-surface-raised">
                  <p className={cn(
                    'text-[11px] font-semibold uppercase tracking-[0.08em] mb-2',
                    car.currentRoi >= 50 ? 'text-success' : car.currentRoi >= 0 ? 'text-text-muted' : 'text-danger',
                  )}>
                    {car.currentRoi >= 50 ? 'Alpha performance' : car.currentRoi >= 0 ? 'Stable asset' : 'Underperforming'}
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {car.currentRoi >= 50 ? (
                      <>This vehicle is a <span className="font-medium text-foreground">star asset</span> — it returns <span className="font-mono tabular text-foreground">{car.currentRoi.toFixed(0)}%</span> over its maintenance base with strong turnaround.</>
                    ) : car.currentRoi >= 0 ? (
                      <>This vehicle is profitable at <span className="font-mono tabular text-foreground">{car.currentRoi.toFixed(1)}%</span> ROI. Increase utilization or optimize rates to reach star-asset tier.</>
                    ) : (
                      <>This vehicle is running at a <span className="font-medium text-danger">negative ROI</span>. Review maintenance costs and pricing before the next rental cycle.</>
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">ROI score</span>
                    <span className={cn('text-xs font-medium font-mono tabular', car.currentRoi >= 0 ? 'text-success' : 'text-danger')}>
                      {car.currentRoi >= 0 ? '+' : ''}{car.currentRoi.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden border border-hairline bg-surface-raised">
                    <div
                      className={cn('h-full transition-all duration-1000', car.currentRoi >= 0 ? 'bg-success' : 'bg-danger')}
                      style={{ width: `${Math.min(Math.max(car.currentRoi, 0), 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-faint">
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
        title="Record mechanical intervention"
        description="Sync workshop bill to asset ledger"
      >
        <form onSubmit={handleLogMaintenance} className="space-y-6">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Intervention type</p>
            <select name="type" className={cn(inputCls, 'appearance-none')}>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Description *</p>
            <input name="description" required placeholder="e.g. Full synthetic oil change + filter" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Cost (MAD) *</p>
              <div className="relative">
                <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
                <input name="cost" type="number" min={0} step="0.01" required placeholder="0.00" className={cn(inputCls, 'ps-11')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Odometer (km)</p>
              <input name="mileage" type="number" min={0} placeholder={car.mileage.toLocaleString()} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Garage</p>
            <input name="garage" placeholder="Workshop name" className={inputCls} />
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsMaintenanceModalOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={isMutating}>
              {isMutating ? 'Syncing...' : 'Sync mechanical data'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Status Modal ═══════ */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Asset status control"
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
                    : 'bg-surface border-hairline hover:border-border',
                )}
              >
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', isActive ? style.text : 'text-text-faint')}>
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
        onClose={closeDocModal}
        title="Register document"
        description="Track a legal document in the Guardian vault"
      >
        <form onSubmit={handleAddDocument} className="space-y-6">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Document type</p>
            <select name="type" className={cn(inputCls, 'appearance-none')}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{formatDocType(t)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Issue date</p>
              <input name="issueDate" type="date" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Expiry date *</p>
              <input name="expiryDate" type="date" required className={inputCls} />
            </div>
          </div>
          <VaultFileAttachment
            value={attachedFile}
            onChange={setAttachedFile}
            disabled={isMutating}
            helperText="Attach a scan (optional)"
          />
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={closeDocModal} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={isMutating}>
              {isMutating ? 'Registering...' : 'Activate tracking'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Renew Document Modal ═══════ */}
      <Modal
        isOpen={renewingDoc !== null}
        onClose={closeRenewModal}
        title="Renew document"
        description={renewingDoc ? `Extend ${formatDocType(renewingDoc.type)} compliance window` : ''}
      >
        {renewingDoc && (
          <form onSubmit={handleRenewDocument} className="space-y-6">
            <div className="p-4 rounded-2xl border border-hairline bg-surface-raised">
              <p className="eyebrow">Current expiry</p>
              <p className="mt-1 text-sm font-medium text-foreground font-mono tabular">{formatDate(renewingDoc.expiryDate)}</p>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">New expiry date *</p>
              <input name="expiryDate" type="date" required className={inputCls} />
            </div>
            <VaultFileAttachment
              value={attachedFile}
              onChange={setAttachedFile}
              disabled={isMutating}
              helperText="Attach a new scan (optional — keeps the existing file if skipped)"
            />
            <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={closeRenewModal} disabled={isMutating}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" isLoading={isMutating}>
                {isMutating ? 'Renewing...' : 'Confirm renewal'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════ Delete Confirmation Modal ═══════ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Decommission asset"
        description="This action is permanent"
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl">
            <p className="text-xs text-text-muted leading-relaxed">
              You are about to permanently remove <strong className="font-medium text-foreground">{car.brand} {car.model} (<span className="font-mono tabular">{car.licensePlate}</span>)</strong> from
              your fleet. Vehicles with booking history cannot be deleted — set them to <strong className="font-medium text-foreground">out of service</strong> instead
              to preserve financial records.
            </p>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)} disabled={isMutating}>
              Keep asset
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleDelete} isLoading={isMutating}>
              <Trash2 className="w-4 h-4 me-2" />
              {isMutating ? 'Removing...' : 'Delete forever'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
