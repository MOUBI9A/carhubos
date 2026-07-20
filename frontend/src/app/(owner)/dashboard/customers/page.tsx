"use client";

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  AlertTriangle,
  Phone,
  Mail,
  ChevronRight,
  Plus,
  Download,
  RefreshCw,
  SearchX,
  Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useCustomers } from './useCustomers';
import {
  CUSTOMER_STATUS_STYLES,
  fullName,
  type CustomerStatus,
} from './types';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  identityType: 'CIN',
  identityNumber: '',
  nationality: 'MA',
};

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

export default function CustomersPage() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const { data: customers, isLoading, error, refetch } = useCustomers();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const setField = (key: keyof typeof INITIAL_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (!q) return true;
      return `${c.firstName} ${c.lastName} ${c.phone} ${c.email ?? ''} ${c.identityNumber}`
        .toLowerCase()
        .includes(q);
    });
  }, [customers, query, statusFilter]);

  const stats = useMemo(() => {
    const list = customers ?? [];
    return {
      total: list.length,
      active: list.filter((c) => c.status === 'ACTIVE').length,
      blacklisted: list.filter((c) => c.status === 'BLACKLISTED').length,
      totalBookings: list.reduce((sum, c) => sum + (c._count?.bookings ?? 0), 0),
    };
  }, [customers]);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setForm(INITIAL_FORM);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.identityNumber.trim()) {
      showToast('danger', 'Missing Fields', 'Name, phone and identity number are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/customers', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        identityType: form.identityType,
        identityNumber: form.identityNumber.trim(),
        nationality: form.nationality.trim() || 'MA',
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      });
      closeAddModal();
      showToast('success', 'Client Registered', `${form.firstName} ${form.lastName} added to your directory.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to register client';
      showToast('danger', 'Registration Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCsv = () => {
    const list = customers ?? [];
    if (list.length === 0) {
      showToast('info', 'Nothing to Export', 'Register clients first, then export the directory.');
      return;
    }
    const header = ['First Name', 'Last Name', 'Phone', 'Email', 'Identity Type', 'Identity Number', 'Nationality', 'Status', 'Bookings', 'Registered'];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = list.map((c) =>
      [
        c.firstName,
        c.lastName,
        c.phone,
        c.email ?? '',
        c.identityType,
        c.identityNumber,
        c.nationality,
        c.status,
        c._count?.bookings ?? 0,
        new Date(c.createdAt).toLocaleDateString('en-GB'),
      ].map(escape).join(','),
    );
    const csv = [header.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('success', 'Directory Exported', `${list.length} client record${list.length !== 1 ? 's' : ''} exported to CSV.`);
  };

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">Directory offline</p>
          <p className="text-sm text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 me-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('customerDirectory')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Directory, rental history and trust signals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 me-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Add customer
          </Button>
        </div>
      </header>

      {/* ═══════ Stats strip ═══════ */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-surface border border-hairline p-4">
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{stats.total}</p>
            <p className="eyebrow mt-1">Directory size</p>
          </div>
          <button
            className={cn(
              'rounded-2xl bg-surface border border-hairline p-4 text-start transition-all hover:bg-surface-raised',
              statusFilter === 'ACTIVE' && 'ring-1 ring-primary/40',
            )}
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          >
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{stats.active}</p>
            <p className="eyebrow mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Active clients
            </p>
          </button>
          <button
            className={cn(
              'rounded-2xl bg-surface border border-hairline p-4 text-start transition-all hover:bg-surface-raised',
              statusFilter === 'BLACKLISTED' && 'ring-1 ring-primary/40',
            )}
            onClick={() => setStatusFilter(statusFilter === 'BLACKLISTED' ? 'ALL' : 'BLACKLISTED')}
          >
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{stats.blacklisted}</p>
            <p className="eyebrow mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              Blacklisted
            </p>
          </button>
          <div className="rounded-2xl bg-surface border border-hairline p-4">
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{stats.totalBookings}</p>
            <p className="eyebrow mt-1">Total rentals</p>
          </div>
        </div>
      )}

      {/* ═══════ Search ═══════ */}
      <div className="relative">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, email or identity number..."
          className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
        />
      </div>

      {/* ═══════ Directory ═══════ */}
      {isLoading ? (
        <Card padding="none" className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/4 h-3" />
              </div>
              <Skeleton className="w-24 h-6 rounded-lg shrink-0" />
            </div>
          ))}
        </Card>
      ) : (customers?.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="font-medium text-foreground">No customers yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              Register your first client to start booking rentals and building trust history.
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" /> Add customer
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching clients"
          description="No clients match your current search or filter."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {/* Column headers */}
          <div className="hidden sm:flex items-center gap-5 px-5 py-3 border-b border-hairline">
            <p className="eyebrow flex-1">Client</p>
            <p className="eyebrow w-16 text-end">Rentals</p>
            <p className="eyebrow w-24 text-end">Status</p>
            <span className="w-4 shrink-0" aria-hidden />
          </div>
          <div className="divide-y divide-hairline">
            {filtered.map((customer) => {
              const style = CUSTOMER_STATUS_STYLES[customer.status];
              return (
                <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}>
                  <div className="flex items-center gap-5 px-5 py-4 hover:bg-surface-raised transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar name={fullName(customer)} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {fullName(customer)}
                        </p>
                        <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {customer.phone}
                          </span>
                          {customer.email && (
                            <span className="hidden sm:flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {customer.email}
                            </span>
                          )}
                          <span className="hidden md:flex items-center gap-1 font-mono tabular text-text-faint">
                            <Fingerprint className="w-3 h-3" /> {customer.identityType} · {customer.identityNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block w-16 text-end shrink-0">
                      <p className="text-sm font-mono tabular text-foreground">{customer._count?.bookings ?? 0}</p>
                    </div>
                    <span className="flex sm:w-24 justify-end shrink-0">
                      <Badge variant={customer.status === 'BLACKLISTED' ? 'destructive' : 'outline'}>
                        <span className={cn('me-1 w-1.5 h-1.5 rounded-full', style.dot)} />
                        {style.label}
                      </Badge>
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-faint group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* ═══════ Add Client Modal ═══════ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Register client"
        description="Add a customer to the identity registry"
      >
        <form onSubmit={handleAddCustomer} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">First name *</p>
              <input value={form.firstName} onChange={setField('firstName')} placeholder="Ahmed" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Last name *</p>
              <input value={form.lastName} onChange={setField('lastName')} placeholder="Benali" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Phone *</p>
              <input value={form.phone} onChange={setField('phone')} placeholder="+212 6..." className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Email</p>
              <input value={form.email} onChange={setField('email')} type="email" placeholder="Optional" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">ID type</p>
              <select value={form.identityType} onChange={setField('identityType')} className={cn(inputCls, 'appearance-none')}>
                <option value="CIN">CIN</option>
                <option value="PASSPORT">Passport</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">ID number *</p>
              <input value={form.identityNumber} onChange={setField('identityNumber')} placeholder="AB123456" className={cn(inputCls, 'font-mono tabular')} />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Nationality</p>
              <input value={form.nationality} onChange={setField('nationality')} placeholder="MA" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeAddModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register client'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
