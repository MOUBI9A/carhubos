"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Mail,
  ChevronRight,
  Plus,
  Download,
  RefreshCw,
  CalendarDays,
  SearchX,
  Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useCustomers } from './useCustomers';
import {
  CUSTOMER_STATUS_STYLES,
  fullName,
  initials,
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
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20';

export default function CustomersPage() {
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Directory Offline</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* ═══════ Header ═══════ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
            Customer <span className="text-primary">CRM</span>
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2">
            Identity Registry & Rental Relationship Intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="glass h-12" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="h-12 bg-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* ═══════ Stats row ═══════ */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Directory Size</p>
                <p className="text-2xl font-black text-white">{stats.total}</p>
              </div>
              <Users className="w-6 h-6 text-primary/40" />
            </div>
          </Card>
          <button
            className={cn(
              'glass border-white/5 rounded-2xl p-6 text-left transition-all hover:bg-white/[0.07]',
              statusFilter === 'ACTIVE' && 'ring-1 ring-success/30',
            )}
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Active Clients</p>
                <p className="text-2xl font-black text-success">{stats.active}</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-success/40" />
            </div>
          </button>
          <button
            className={cn(
              'glass border-white/5 rounded-2xl p-6 text-left transition-all hover:bg-white/[0.07]',
              statusFilter === 'BLACKLISTED' && 'ring-1 ring-danger/30',
            )}
            onClick={() => setStatusFilter(statusFilter === 'BLACKLISTED' ? 'ALL' : 'BLACKLISTED')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Blacklisted</p>
                <p className="text-2xl font-black text-danger">{stats.blacklisted}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-danger/40" />
            </div>
          </button>
          <Card className="glass border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total Rentals</p>
                <p className="text-2xl font-black text-white">{stats.totalBookings}</p>
              </div>
              <CalendarDays className="w-6 h-6 text-primary/40" />
            </div>
          </Card>
        </div>
      )}

      {/* ═══════ Search ═══════ */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, email or identity number..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
        />
      </div>

      {/* ═══════ Directory ═══════ */}
      {isLoading ? (
        <Card padding="none" className="glass border-white/5 p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/4 h-3" />
              </div>
              <Skeleton className="w-24 h-6 rounded-lg shrink-0" />
            </div>
          ))}
        </Card>
      ) : (customers?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title="No Clients Registered"
          description="Your customer directory is empty. Register your first client to start booking rentals and building trust history."
          action={
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Register First Client
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No Matching Clients"
          description="No clients match your current search or filter."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="glass border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {filtered.map((customer) => {
              const style = CUSTOMER_STATUS_STYLES[customer.status];
              return (
                <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}>
                  <div className="flex items-center gap-5 px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="text-sm font-black text-primary">{initials(customer)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                        {fullName(customer)}
                      </p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold text-white/40 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </span>
                        {customer.email && (
                          <span className="text-[10px] font-bold text-white/40 items-center gap-1 hidden sm:flex">
                            <Mail className="w-3 h-3" /> {customer.email}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-white/25 items-center gap-1 hidden md:flex">
                          <Fingerprint className="w-3 h-3" /> {customer.identityType} • {customer.identityNumber}
                        </span>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block shrink-0">
                      <p className="text-sm font-black text-white">{customer._count?.bookings ?? 0}</p>
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Rentals</p>
                    </div>
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border flex items-center gap-1.5 shrink-0',
                      style.chip,
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                      {style.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
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
        title="Register Client"
        description="Add a customer to the identity registry"
      >
        <form onSubmit={handleAddCustomer} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">First Name *</p>
              <input value={form.firstName} onChange={setField('firstName')} placeholder="Ahmed" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Last Name *</p>
              <input value={form.lastName} onChange={setField('lastName')} placeholder="Benali" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Phone *</p>
              <input value={form.phone} onChange={setField('phone')} placeholder="+212 6..." className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email</p>
              <input value={form.email} onChange={setField('email')} type="email" placeholder="Optional" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">ID Type</p>
              <select value={form.identityType} onChange={setField('identityType')} className={cn(inputCls, 'appearance-none')}>
                <option value="CIN">CIN</option>
                <option value="PASSPORT">Passport</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">ID Number *</p>
              <input value={form.identityNumber} onChange={setField('identityNumber')} placeholder="AB123456" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Nationality</p>
              <input value={form.nationality} onChange={setField('nationality')} placeholder="MA" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeAddModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Client'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
