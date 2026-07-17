"use client";

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
  Car as CarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useCustomerDetail } from './useCustomerDetail';
import {
  CUSTOMER_STATUS_STYLES,
  formatDocType,
  fullName,
  initials,
} from '../types';

const BOOKING_CHIP: Record<string, string> = {
  REQUESTED: 'text-white/60 bg-white/5 border-white/10',
  APPROVED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ACTIVE: 'text-primary bg-primary/10 border-primary/20',
  COMPLETED: 'text-success bg-success/10 border-success/20',
  CANCELLED: 'text-danger bg-danger/10 border-danger/20',
};

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
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
      showToast('danger', 'Missing Fields', 'Name and phone are required.');
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
      showToast('success', 'Profile Updated', 'Client identity record synchronized.');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update client';
      showToast('danger', 'Update Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
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
        next === 'BLACKLISTED' ? 'Client Blacklisted' : 'Client Reinstated',
        next === 'BLACKLISTED'
          ? `${fullName(customer)} is now blocked from new bookings.`
          : `${fullName(customer)} can book rentals again.`,
      );
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to change status';
      showToast('danger', 'Action Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setIsMutating(true);
    try {
      await api.delete(`/customers/${customer.id}`);
      showToast('success', 'Client Removed', `${fullName(customer)} deleted from the directory.`);
      router.push('/dashboard/customers');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete client';
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
          <Skeleton className="w-40 h-4" />
          <div className="flex gap-3">
            <Skeleton className="w-24 h-9 rounded-xl" />
            <Skeleton className="w-28 h-9 rounded-xl" />
          </div>
        </div>
        <div className="glass rounded-2xl p-6 flex items-center gap-8">
          <Skeleton className="w-24 h-24 rounded-3xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="w-1/2 h-7" />
            <Skeleton className="w-2/3 h-3.5" />
          </div>
          <Skeleton className="w-36 h-14 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Client Unreachable</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error || 'Customer not found'}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/customers">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Directory
            </Button>
          </Link>
          <Button onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = CUSTOMER_STATUS_STYLES[customer.status];
  const isBlacklisted = customer.status === 'BLACKLISTED';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Breadcrumb & Actions ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link href="/dashboard/customers" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group w-fit">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Client Directory</span>
        </Link>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2 text-danger" />
            <span className="text-danger">Delete</span>
          </Button>
          <Button
            variant={isBlacklisted ? 'primary' : 'outline'}
            size="sm"
            onClick={() => (isBlacklisted ? handleStatusToggle() : setIsBlacklistModalOpen(true))}
            disabled={isMutating}
          >
            {isBlacklisted ? (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" /> Reinstate Client
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4 mr-2" /> Blacklist
              </>
            )}
          </Button>
          <Button size="sm" onClick={openEditModal}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* ═══════ Hero ═══════ */}
      <Card className={cn(
        'relative overflow-hidden shadow-2xl',
        isBlacklisted ? 'border-danger/30' : 'border-primary/20',
      )}>
        {isBlacklisted && (
          <div className="absolute inset-x-0 top-0 h-1 bg-danger/60" />
        )}
        <div className="flex flex-col md:flex-row md:items-center gap-8 relative z-10">
          <div className={cn(
            'w-24 h-24 rounded-3xl border flex items-center justify-center shadow-lg shrink-0',
            isBlacklisted ? 'bg-danger/10 border-danger/20' : 'bg-primary/10 border-primary/20',
          )}>
            <span className={cn('text-3xl font-black', isBlacklisted ? 'text-danger' : 'text-primary')}>
              {initials(customer)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-black text-white uppercase tracking-tight">{fullName(customer)}</h1>
              <span className={cn(
                'text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1.5',
                statusStyle.chip,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                {statusStyle.label}
              </span>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </span>
              {customer.email && (
                <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </span>
              )}
              <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" /> {customer.identityType} • {customer.identityNumber}
              </span>
              <span className="text-[11px] font-bold text-white/40 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> {customer.nationality}
              </span>
            </div>
          </div>
          <div className="flex gap-12 md:border-l border-white/5 md:pl-12 shrink-0">
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 md:text-right">Verified Spend</p>
              <p className="text-2xl font-black text-white md:text-right">
                {customer.lifetimeSpend.toLocaleString()} <span className="text-xs text-white/40">MAD</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 md:text-right">Rentals</p>
              <p className="text-2xl font-black text-primary md:text-right">{customer.bookings.length}</p>
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
              <CardTitle>Rental History</CardTitle>
              <CardDescription className="mt-1">
                {customer.bookings.length} session{customer.bookings.length !== 1 ? 's' : ''} on record
              </CardDescription>
            </div>
          </CardHeader>
          {customer.bookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No Rentals Yet"
              description="This client has no booking history. Their sessions will appear here once they rent a vehicle."
            />
          ) : (
            <div className="space-y-4">
              {customer.bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 glass-card group hover:translate-x-1 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      <CarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/fleet/${booking.car.id}`}
                        className="text-sm font-bold text-white uppercase tracking-tight truncate hover:text-primary transition-colors"
                      >
                        {booking.car.brand} {booking.car.model}
                        <span className="text-white/30 text-[10px] ml-2">{booking.car.licensePlate}</span>
                      </Link>
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
                <CardTitle>Identity Vault</CardTitle>
                <CardDescription className="mt-1">
                  {customer.documents.length} document{customer.documents.length !== 1 ? 's' : ''} on file
                </CardDescription>
              </div>
            </CardHeader>
            {customer.documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No documents scanned</p>
                <p className="text-[9px] text-white/15 mt-1 max-w-[200px] mx-auto">
                  Driving license and ID scans will be listed here once uploaded.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                          {formatDocType(doc.type)}
                        </p>
                        {doc.expiryDate && (
                          <p className="text-[9px] font-bold text-white/30 uppercase">
                            Expires {formatDate(doc.expiryDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors shrink-0"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader className="p-0 mb-5">
              <CardTitle>Account Meta</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {[
                { icon: History, label: 'Registered', value: formatDate(customer.createdAt) },
                { icon: Wallet, label: 'Verified Spend', value: `${customer.lifetimeSpend.toLocaleString()} MAD` },
                { icon: CalendarDays, label: 'Total Rentals', value: String(customer.bookings.length) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <row.icon className="w-4 h-4 text-white/20" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{row.label}</span>
                  </div>
                  <span className="text-xs font-black text-white">{row.value}</span>
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
        title="Edit Profile"
        description="Update client identity record"
      >
        <form onSubmit={handleEdit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">First Name *</p>
              <input
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Last Name *</p>
              <input
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Phone *</p>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email</p>
              <input
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                type="email"
                placeholder="Optional"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={() => setIsEditModalOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isMutating}>
              {isMutating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══════ Blacklist Confirmation ═══════ */}
      <Modal
        isOpen={isBlacklistModalOpen}
        onClose={() => setIsBlacklistModalOpen(false)}
        title="Blacklist Client"
        description="Block this client from future bookings"
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl">
            <p className="text-xs text-white/70 leading-relaxed">
              <strong className="text-white">{fullName(customer)}</strong> will be excluded from the booking
              selector across your agency. Their rental and payment history stays intact, and you can
              reinstate them at any time.
            </p>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsBlacklistModalOpen(false)} disabled={isMutating}>
              Keep Active
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleStatusToggle} isLoading={isMutating}>
              <ShieldOff className="w-4 h-4 mr-2" />
              {isMutating ? 'Blocking...' : 'Confirm Blacklist'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════ Delete Confirmation ═══════ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Client"
        description="This action is permanent"
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl">
            <p className="text-xs text-white/70 leading-relaxed">
              You are about to permanently remove <strong className="text-white">{fullName(customer)}</strong> from
              the directory. Clients with rental history cannot be deleted — use{' '}
              <strong className="text-white">Blacklist</strong> instead to preserve financial records.
            </p>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)} disabled={isMutating}>
              Keep Client
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
