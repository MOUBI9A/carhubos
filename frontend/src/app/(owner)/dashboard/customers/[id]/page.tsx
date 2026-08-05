"use client";

import { useTranslations } from 'next-intl';
import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Phone,
  Mail,
  Fingerprint,
  Globe,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  Pencil,
  Trash2,
  RefreshCw,
  CalendarDays,
  FileText,
  Wallet,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useCustomerDetail } from './useCustomerDetail';
import { VaultAccessPanel } from './VaultAccessPanel';
import {
  CUSTOMER_STATUS_STYLES,
  formatDocType,
  fullName,
} from '../types';

const BOOKING_CHIP: Record<string, string> = {
  REQUESTED: 'text-text-muted bg-surface border-hairline',
  APPROVED: 'text-info bg-info/10 border-info/20',
  ACTIVE: 'text-primary bg-primary/10 border-primary/20',
  OVERDUE: 'text-warning bg-warning/10 border-warning/20',
  COMPLETED: 'text-success bg-success/10 border-success/20',
  CANCELLED: 'text-danger bg-danger/10 border-danger/20',
};

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('ownerPages');
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { data: customer, isLoading, error, refetch } = useCustomerDetail(id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });

  const openEditModal = () => {
    if (!customer) return;
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email ?? '',
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.phone.trim()) {
      showToast('danger', t('missingFieldsTitle'), t('nameAndPhoneRequired'));
      return;
    }
    setIsMutating(true);
    try {
      await api.patch(`/customers/${customer.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        ...(editForm.email.trim() ? { email: editForm.email.trim() } : {}),
      });
      setIsEditModalOpen(false);
      showToast('success', t('profileUpdatedTitle'), t('clientRecordSynced'));
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('failedToUpdateClient');
      showToast('danger', t('updateFailedTitle'), Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!customer) return;
    const next = customer.status === 'ACTIVE' ? 'BLACKLISTED' : 'ACTIVE';
    setIsMutating(true);
    try {
      await api.patch(`/customers/${customer.id}`, { status: next });
      setIsBlacklistModalOpen(false);
      showToast(
        next === 'BLACKLISTED' ? 'warning' : 'success',
        next === 'BLACKLISTED' ? t('clientBlacklistedTitle') : t('clientReinstatedTitle'),
        next === 'BLACKLISTED'
          ? `${fullName(customer)} ${t('blockedFromNewBookings')}`
          : `${fullName(customer)} ${t('canBookAgain')}`,
      );
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('failedToChangeStatus');
      showToast('danger', t('actionFailedTitle'), Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setIsMutating(true);
    try {
      await api.delete(`/customers/${customer.id}`);
      showToast('success', t('clientRemovedTitle'), `${fullName(customer)} ${t('deletedFromDirectory')}`);
      router.push('/dashboard/customers');
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('failedToDeleteClient');
      showToast('danger', t('deletionBlockedTitle'), Array.isArray(msg) ? msg.join(' ') : String(msg));
      setIsDeleteModalOpen(false);
      setIsMutating(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
          <Skeleton className="w-40 h-4" />
          <div className="flex gap-3">
            <Skeleton className="w-24 h-9 rounded-xl" />
            <Skeleton className="w-28 h-9 rounded-xl" />
          </div>
        </div>
        <div className="bg-surface border border-hairline rounded-2xl p-6 flex items-center gap-8">
          <Skeleton className="w-24 h-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="w-1/2 h-7" />
            <Skeleton className="w-2/3 h-3.5" />
          </div>
          <Skeleton className="w-36 h-14 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-surface border border-hairline rounded-2xl p-6">
            <SkeletonRows rows={5} />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{t('clientUnreachable')}</p>
          <p className="text-xs text-text-muted mt-2 max-w-sm">{error || t('customerNotFound')}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/customers">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 me-2" /> {t('backToDirectory')}
            </Button>
          </Link>
          <Button onClick={refetch}>
            <RefreshCw className="w-4 h-4 me-2" /> {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = CUSTOMER_STATUS_STYLES[customer.status];
  const isBlacklisted = customer.status === 'BLACKLISTED';
  const isVerified = !isBlacklisted && customer.documents.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Breadcrumb & Actions ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link href="/dashboard/customers" className="flex items-center gap-2 text-text-faint hover:text-foreground transition-colors group w-fit">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="eyebrow">{t('clientDirectory')}</span>
        </Link>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="w-4 h-4 me-2 text-danger" />
            <span className="text-danger">{t('delete')}</span>
          </Button>
          <Button
            variant={isBlacklisted ? 'primary' : 'outline'}
            size="sm"
            onClick={() => (isBlacklisted ? handleStatusToggle() : setIsBlacklistModalOpen(true))}
            disabled={isMutating}
          >
            {isBlacklisted ? (
              <>
                <ShieldCheck className="w-4 h-4 me-2" /> {t('reinstateClient')}
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4 me-2" /> {t('blacklistClient')}
              </>
            )}
          </Button>
          <Button size="sm" onClick={openEditModal}>
            <Pencil className="w-4 h-4 me-2" />
            {t('editProfile')}
          </Button>
        </div>
      </div>

      {/* ═══════ Hero ═══════ */}
      <Card className={cn(
        'relative overflow-hidden',
        isBlacklisted && 'border border-danger/30',
      )}>
        {isBlacklisted && (
          <div className="absolute inset-x-0 top-0 h-1 bg-danger/60" />
        )}
        <div className="flex flex-col md:flex-row md:items-center gap-8 relative z-10">
          <Avatar name={fullName(customer)} size={96} verified={isVerified} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <p className="eyebrow w-full">{t('customerProfile')}</p>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{fullName(customer)}</h1>
              <span className={cn(
                'text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5',
                statusStyle.chip,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                {t(isBlacklisted ? 'blacklisted' : 'active')}
              </span>
              {isVerified && <Badge variant="trust">{t('verified')}</Badge>}
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <span className="text-xs text-text-muted flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </span>
              {customer.email && (
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </span>
              )}
              <span className="text-xs text-text-muted flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" /> {customer.identityType} · <span className="font-mono tabular">{customer.identityNumber}</span>
              </span>
              <span className="text-xs text-text-muted flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> {customer.nationality}
              </span>
            </div>
          </div>
          <div className="flex gap-12 md:border-s border-hairline md:ps-12 shrink-0">
            <div>
              <p className="eyebrow mb-1 md:text-end">{t('verifiedSpend')}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground md:text-end">
                <span className="font-mono tabular">{customer.lifetimeSpend.toLocaleString()}</span> <span className="text-xs text-text-faint">MAD</span>
              </p>
            </div>
            <div>
              <p className="eyebrow mb-1 md:text-end">{t('rentalCount')}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground md:text-end font-mono tabular">{customer.bookings.length}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════ Content ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rental history */}
        <div className="lg:col-span-2 space-y-6">
          <CardHeader className="px-0">
            <div>
              <CardTitle>{t('rentalHistory')}</CardTitle>
              <CardDescription className="mt-1">
                {customer.bookings.length} {t(customer.bookings.length !== 1 ? 'sessionsOnRecord' : 'sessionOnRecord')}
              </CardDescription>
            </div>
          </CardHeader>
          {customer.bookings.length === 0 ? (
            <Card className="flex flex-col items-center gap-5 py-14 text-center">
              <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
              <div>
                <p className="font-medium text-foreground">{t('noRentalsYet')}</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
                  {t('noBookingHistoryDesc')}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {customer.bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between gap-4 p-4 bg-surface border border-hairline rounded-2xl hover:bg-surface-raised transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <AgencyImage
                      slot="car"
                      alt={`${booking.car.brand} ${booking.car.model}`}
                      ratio="3 / 2"
                      rounded="rounded-lg"
                      className="w-16 shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/fleet/${booking.car.id}`}
                        className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors"
                      >
                        {booking.car.brand} {booking.car.model}
                        <span className="font-mono tabular text-text-faint text-[11px] ms-2">{booking.car.licensePlate}</span>
                      </Link>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <p className="text-sm font-mono tabular text-foreground hidden sm:block">
                      {booking.totalPrice.toLocaleString()} <span className="text-text-faint text-[10px]">MAD</span>
                    </p>
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-md border',
                      BOOKING_CHIP[booking.status] || BOOKING_CHIP.REQUESTED,
                    )}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-0 mb-5">
              <div>
                <CardTitle>{t('identityVault')}</CardTitle>
                <CardDescription className="mt-1">
                  {customer.documents.length} {t(customer.documents.length !== 1 ? 'documentsOnFile' : 'documentOnFile')}
                </CardDescription>
              </div>
            </CardHeader>
            {customer.documents.length === 0 ? (
              <div className="text-center py-8">
                <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-xl" className="w-14 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{t('noDocumentsScanned')}</p>
                <p className="text-xs text-text-muted mt-1 max-w-[220px] mx-auto">
                  {t('documentsWillBeListed')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-hairline">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-text-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {formatDocType(doc.type)}
                        </p>
                        {doc.expiryDate && (
                          <p className="text-[11px] text-text-faint">
                            {t('expiresLabel')} {formatDate(doc.expiryDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                    >
                      {t('view')}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <VaultAccessPanel
            customerId={customer.id}
            customerName={fullName(customer)}
            customerIdentity={`${customer.identityType} · ${customer.identityNumber}`}
          />

          <Card>
            <CardHeader className="p-0 mb-5">
              <CardTitle>{t('accountMeta')}</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {[
                { icon: History, label: t('registered'), value: formatDate(customer.createdAt) },
                { icon: Wallet, label: t('verifiedSpend'), value: `${customer.lifetimeSpend.toLocaleString()} MAD` },
                { icon: CalendarDays, label: t('totalRentals'), value: String(customer.bookings.length) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <row.icon className="w-4 h-4 text-text-faint" />
                    <span className="eyebrow">{row.label}</span>
                  </div>
                  <span className="text-xs font-mono tabular text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════ Edit Modal ═══════ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('editProfile')}
        description={t('updateClientRecord')}
      >
        <form onSubmit={handleEdit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('firstName')} *</p>
              <input
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('lastName')} *</p>
              <input
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('phone')} *</p>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('email')}</p>
              <input
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                type="email"
                placeholder={t('optional')}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={() => setIsEditModalOpen(false)} disabled={isMutating}>
              {t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isMutating}>
              {isMutating ? t('savingEllipsis') : t('saveChanges')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Blacklist Confirmation ═══════ */}
      <Modal
        isOpen={isBlacklistModalOpen}
        onClose={() => setIsBlacklistModalOpen(false)}
        title={t('blacklistClientModal')}
        description={t('blockFromBookings')}
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl">
            <p className="text-xs text-text-muted leading-relaxed">
              <strong className="text-foreground">{fullName(customer)}</strong> {t('blacklistWarningText')}
            </p>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsBlacklistModalOpen(false)} disabled={isMutating}>
              {t('keepActive')}
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleStatusToggle} isLoading={isMutating}>
              <ShieldOff className="w-4 h-4 me-2" />
              {isMutating ? t('blockingEllipsis') : t('confirmBlacklist')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════ Delete Confirmation ═══════ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('deleteClientModal')}
        description={t('actionIsPermanent')}
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl">
            <p className="text-xs text-text-muted leading-relaxed">
              {t('deleteWarningPre')} <strong className="text-foreground">{fullName(customer)}</strong>{' '}
              {t('deleteWarningMid')}{' '}
              <strong className="text-foreground">{t('blacklistClient')}</strong> {t('deleteWarningPost')}
            </p>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)} disabled={isMutating}>
              {t('keepClient')}
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleDelete} isLoading={isMutating}>
              <Trash2 className="w-4 h-4 me-2" />
              {isMutating ? t('removingEllipsis') : t('deleteForever')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
