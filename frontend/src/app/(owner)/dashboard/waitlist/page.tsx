"use client";

import { useTranslations } from 'next-intl';
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  MessageSquare,
  Plus,
  Phone,
  Zap,
  Trash2,
  CheckCircle2,
  DollarSign,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface RefusalLog {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedCarType: string;
  requestedStartDate: string;
  requestedEndDate: string;
  potentialRevenue: number;
  status: 'WAITING' | 'RECOVERED' | 'LOST';
  createdAt: string;
}

const STATUS_META: Record<RefusalLog['status'], { label: string; dot: string }> = {
  WAITING: { label: 'Waiting', dot: 'bg-warning' },
  RECOVERED: { label: 'Recovered', dot: 'bg-success' },
  LOST: { label: 'Lost', dot: 'bg-danger' },
};

export default function WaitlistRefusals() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [refusals, setRefusals] = useState<RefusalLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRefusals = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/refusal-logs');
      setRefusals(res.data);
    } catch (err: any) {
      showToast('danger', 'Load Failed', err?.response?.data?.message || 'Could not load waitlist data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefusals();
  }, [fetchRefusals]);

  const handleAddRefusal = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    setIsSubmitting(true);
    try {
      await api.post('/refusal-logs', {
        customerName: formData.get('name') as string,
        customerPhone: formData.get('phone') as string,
        requestedCarType: formData.get('carType') as string,
        requestedStartDate: new Date().toISOString(),
        requestedEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        potentialRevenue: Number(formData.get('value')) || 0,
        status: 'WAITING',
      });
      setIsRefusalModalOpen(false);
      showToast('success', 'Demand Logged', 'Refusal instance has been recorded for fleet optimization.');
      fetchRefusals();
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not log refusal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markRecovered = async (id: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/refusal-logs/${id}/status`, { status: 'RECOVERED' });
      setRefusals(prev => prev.map(r => r.id === id ? { ...r, status: 'RECOVERED' } : r));
      showToast('success', 'Revenue Recovered', 'Waitlist entry successfully converted to active booking.');
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const markLost = async (id: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/refusal-logs/${id}/status`, { status: 'LOST' });
      setRefusals(prev => prev.filter(r => r.id !== id));
      showToast('info', 'Record Cleared', 'Demand log marked as lost and removed from queue.');
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const waitingRefusals = refusals.filter(r => r.status === 'WAITING');
  const recoveredRefusals = refusals.filter(r => r.status === 'RECOVERED');
  const totalOpportunityLoss = waitingRefusals.reduce((sum, r) => sum + r.potentialRevenue, 0);
  const recoveryRate = refusals.length > 0 ? Math.round((recoveredRefusals.length / refusals.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('waitlist')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">Demand capture and revenue recovery</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchRefusals}>
            <RefreshCw className="w-4 h-4 me-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsRefusalModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Log refusal
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface border border-hairline p-4">
          <p className="text-2xl font-semibold text-foreground font-mono tabular">{waitingRefusals.length}</p>
          <p className="eyebrow mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Open signals
          </p>
        </div>
        <div className="rounded-2xl bg-surface border border-hairline p-4">
          <p className="text-2xl font-semibold text-foreground font-mono tabular">
            {totalOpportunityLoss.toLocaleString()}
          </p>
          <p className="eyebrow mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            MAD at risk
          </p>
        </div>
        <div className="rounded-2xl bg-surface border border-hairline p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{recoveryRate}%</p>
            <Zap className="w-4 h-4 text-success" />
          </div>
          <p className="eyebrow mt-1">Recovery rate</p>
          <div className="h-1 w-full bg-surface-raised rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-success rounded-full transition-all duration-700"
              style={{ width: `${recoveryRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Demand queue</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            {waitingRefusals.length} active signal{waitingRefusals.length !== 1 ? 's' : ''} awaiting recovery
          </p>
        </div>

        {waitingRefusals.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending demand"
            description="All waitlist entries have been resolved."
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="hidden sm:flex items-center gap-5 px-5 py-3 border-b border-hairline">
              <p className="eyebrow flex-1">Customer</p>
              <p className="eyebrow w-28 text-end">Value</p>
              <p className="eyebrow w-24 text-end">Status</p>
              <span className="w-[120px] shrink-0" aria-hidden />
            </div>
            <div className="divide-y divide-hairline">
              {waitingRefusals.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-5 py-4 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar name={item.customerName} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.customerName}</p>
                      <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {item.customerPhone}
                        </span>
                        <span className="text-text-faint">{item.requestedCarType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:w-28 sm:text-end shrink-0">
                    <p className="text-sm font-mono tabular text-foreground">
                      {item.potentialRevenue.toLocaleString()} MAD
                    </p>
                  </div>

                  <span className="flex sm:w-24 justify-end shrink-0">
                    <Badge variant="outline">
                      <span className={cn('me-1 w-1.5 h-1.5 rounded-full', STATUS_META[item.status].dot)} />
                      {STATUS_META[item.status].label}
                    </Badge>
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => markRecovered(item.id)}
                      disabled={updatingId === item.id}
                    >
                      {updatingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 me-1.5" />
                      )}
                      Recover
                    </Button>
                    <button
                      onClick={() => markLost(item.id)}
                      disabled={updatingId === item.id}
                      aria-label="Mark as lost"
                      className="p-2 text-text-faint hover:text-danger hover:bg-danger/10 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recovered entries */}
        {recoveredRefusals.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Recovered
            </h2>
            <Card padding="none" className="overflow-hidden">
              <div className="divide-y divide-hairline">
                {recoveredRefusals.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                    <Avatar name={item.customerName} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.customerName}</p>
                      <p className="text-xs text-text-muted">{item.requestedCarType}</p>
                    </div>
                    <p className="text-sm font-mono tabular text-text-muted">
                      {item.potentialRevenue.toLocaleString()} MAD
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Log Refusal Modal */}
      <Modal
        isOpen={isRefusalModalOpen}
        onClose={() => setIsRefusalModalOpen(false)}
        title="Log rental refusal"
        description="Quantify demand for fleet optimization"
      >
        <form onSubmit={handleAddRefusal} className="space-y-6">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Customer name</p>
            <input
              name="name"
              required
              className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              placeholder="Enter full name..."
            />
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Contact number</p>
            <div className="relative">
              <Phone className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
              <input
                name="phone"
                required
                className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                placeholder="+212 6..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Desired tier</p>
              <select
                name="carType"
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
              >
                <option>ECONOMY</option>
                <option>COMPACT</option>
                <option>SUV</option>
                <option>LUXURY</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Opportunity value (MAD)</p>
              <div className="relative">
                <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                <input
                  name="value"
                  type="number"
                  className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-2xl border border-hairline bg-surface p-4">
            <MessageSquare className="w-4 h-4 text-text-muted shrink-0" />
            <p className="text-xs leading-relaxed text-text-muted">
              Demand signal will be logged and tracked for fleet optimization analytics.
            </p>
          </div>
          <Button type="submit" className="w-full py-3.5" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
            {isSubmitting ? 'Logging...' : 'Log demand'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
