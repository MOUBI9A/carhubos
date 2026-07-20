"use client";

import { useTranslations } from 'next-intl';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  UserX,
  Search,
  SearchX,
  Globe,
  ShieldCheck,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface BlacklistedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  identityType: string;
  identityNumber: string;
  nationality: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const BLACKLIST_REASONS = [
  'VEHICLE_THEFT_ATTEMPT',
  'FRAUDULENT_DOCUMENTS',
  'MAJOR_UNPAID_FINES',
  'EXTREME_RECKLESS_DRIVING',
  'SYSTEMATIC_NON_PAYMENT',
  'IDENTITY_FRAUD',
  'CAR_PARTS_THEFT',
  'OTHER',
];

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-danger transition-all placeholder:text-text-faint';

export default function NetworkBlacklist() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchBlacklist = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/customers/blacklisted');
      setBlacklist(res.data);
    } catch (err: any) {
      // If the endpoint isn't live yet, gracefully show empty state
      setBlacklist([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  const handleBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const customerId = formData.get('customerId') as string;
    const reason = formData.get('reason') as string;

    if (!customerId.trim()) {
      showToast('danger', 'Missing ID', 'Please enter a customer ID to blacklist.');
      return;
    }

    try {
      await api.patch(`/customers/${customerId}/blacklist`, { reason });
      setIsReportModalOpen(false);
      showToast('success', 'Actor Flagged', 'Customer has been added to the blacklist network.');
      fetchBlacklist();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to blacklist customer';
      showToast('danger', 'Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    }
  };

  const handleUnblacklist = async (customerId: string, name: string) => {
    setRemovingId(customerId);
    try {
      await api.patch(`/customers/${customerId}/unblacklist`);
      setBlacklist(prev => prev.filter(c => c.id !== customerId));
      showToast('success', 'Access Restored', `${name} has been removed from the blacklist.`);
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not restore access.');
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = blacklist.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.identityNumber.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('networkBlacklist')}
          </h1>
          <p className="mt-1.5 flex items-center gap-2 eyebrow">
            <Globe className="w-3 h-3 text-danger" />
            Renter risk registry · Tenant scope
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchBlacklist}>
            <RefreshCw className="w-4 h-4 me-2" />
            Sync
          </Button>
          <Button onClick={() => setIsReportModalOpen(true)} variant="danger">
            <UserX className="w-4 h-4 me-2" />
            Flag bad actor
          </Button>
        </div>
      </header>

      {/* Stats HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-danger/5 border-danger/20">
          <p className="eyebrow text-danger">Flagged actors</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground font-mono tabular">
            {blacklist.length}
          </p>
          <p className="mt-1 text-xs text-text-muted">Active blacklist entries</p>
        </Card>
        <Card>
          <p className="eyebrow">Registry coverage</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Agency</p>
          <p className="mt-1 text-xs text-text-muted">Tenant-scoped blacklist</p>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <p className="eyebrow text-primary">Network status</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Active</p>
          <p className="mt-1 text-xs text-text-muted">Auto-block on booking</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
          <input
            placeholder="Search by name, ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
          />
        </div>
        <span className="eyebrow shrink-0">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Blacklist directory */}
      {isLoading ? (
        <Card padding="none" className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/4 h-3" />
              </div>
              <Skeleton className="w-20 h-6 rounded-lg shrink-0" />
            </div>
          ))}
        </Card>
      ) : blacklist.length === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="font-medium text-foreground">Blacklist is empty</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              No actors have been flagged in this agency.
            </p>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching records"
          description="Try a different search term."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden sm:flex items-center gap-5 px-5 py-3 border-b border-hairline">
            <p className="eyebrow flex-1">Actor</p>
            <p className="eyebrow w-32 text-end">Flagged</p>
            <span className="w-24 shrink-0" aria-hidden />
          </div>
          <div className="divide-y divide-hairline">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center gap-5 px-5 py-4 hover:bg-surface-raised transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={`${customer.firstName} ${customer.lastName}`} size={44} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="truncate text-sm font-medium text-foreground">
                        {customer.firstName} {customer.lastName}
                      </h4>
                      <Badge variant="destructive">
                        <span className="me-1 w-1.5 h-1.5 rounded-full bg-danger" />
                        Blacklisted
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {customer.identityType}: <span className="font-mono tabular text-text-faint">{customer.identityNumber}</span> · {customer.phone}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block w-32 text-end shrink-0">
                  <p className="eyebrow">Flagged</p>
                  <p className="mt-0.5 text-xs font-mono tabular text-text-muted">
                    {new Date(customer.updatedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-24 justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity border-success/20 text-success hover:bg-success/10"
                  onClick={() => handleUnblacklist(customer.id, `${customer.firstName} ${customer.lastName}`)}
                  disabled={removingId === customer.id}
                >
                  {removingId === customer.id ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : <CheckCircle2 className="w-3 h-3 me-1" />}
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Network immunity info */}
      <Card className="bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div>
            <CardTitle className="text-primary">Blacklist enforcement protocol</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed mt-2">
              Blacklisted customers are automatically blocked during the booking creation flow.
              The Guardian system checks identity status in real-time. Future upgrade: cross-agency network sync.
            </p>
          </div>
        </div>
      </Card>

      {/* Flag Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Flag bad actor"
        description="Add a customer to the agency blacklist"
      >
        <form className="space-y-6" onSubmit={handleBlacklist}>
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">
              This action immediately prevents the customer from making new bookings. Requires the customer to already exist in your CRM.
            </p>
          </div>
          <div className="space-y-2">
            <p className="eyebrow px-1">Customer ID</p>
            <div className="relative">
              <User className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
              <input
                name="customerId"
                required
                className={cn(inputCls, 'ps-11')}
                placeholder="Customer UUID from CRM..."
              />
            </div>
            <p className="px-1 text-xs text-text-faint">Find the customer ID in the Customer CRM module.</p>
          </div>
          <div className="space-y-2">
            <p className="eyebrow px-1">Reason for flag</p>
            <select name="reason" className={cn(inputCls, 'appearance-none')}>
              {BLACKLIST_REASONS.map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="danger" className="w-full">
            Flag this actor
          </Button>
        </form>
      </Modal>
    </div>
  );
}
