"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CreditCard,
  Car,
  Users,
  CalendarCheck,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Receipt,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormat } from '@/lib/useFormat';
import { useBilling, type BillingSnapshot } from './useBilling';

const STATUS_STYLES: Record<string, { chip: string; label: string }> = {
  TRIAL: { chip: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Trial' },
  ACTIVE: { chip: 'text-success bg-success/10 border-success/20', label: 'Active' },
  PAST_DUE: { chip: 'text-amber-500 bg-amber-500/10 border-amber-500/20', label: 'Past Due' },
  SUSPENDED: { chip: 'text-danger bg-danger/10 border-danger/20', label: 'Suspended' },
  CANCELED: { chip: 'text-white/40 bg-white/5 border-white/10', label: 'Canceled' },
};

const INVOICE_STYLES: Record<string, string> = {
  PAID: 'text-success bg-success/10 border-success/20',
  ISSUED: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  DRAFT: 'text-white/50 bg-white/5 border-white/10',
  VOID: 'text-white/30 bg-white/5 border-white/10 line-through',
};

const FEATURE_LABELS: Record<string, string> = {
  '*': 'Every feature',
  trust_network: 'Trust Network',
  hub: 'B2B Hub',
  ai_vision: 'AI Vision',
  reports: 'Report Factory',
  api_access: 'API & Webhooks',
  priority_support: 'Priority Support',
};

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return diff <= 0 ? 0 : Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export default function BillingPage() {
  const { data, isLoading, error, refetch } = useBilling();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-primary" />
            Billing &amp; Plan
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">
            Your Fider subscription, usage &amp; invoices
          </p>
        </div>
      </header>

      {isLoading ? (
        <Card><SkeletonRows rows={4} /></Card>
      ) : error ? (
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <p className="text-xs font-medium text-white/40 max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
            </Button>
          </div>
        </Card>
      ) : data ? (
        <BillingBody data={data} />
      ) : null}
    </div>
  );
}

function BillingBody({ data }: { data: BillingSnapshot }) {
  const { money: fmtMoney, date: fmtDate } = useFormat();
  const status = STATUS_STYLES[data.status] ?? STATUS_STYLES.ACTIVE;
  const trial = daysLeft(data.trialEndsAt);

  return (
    <div className="space-y-8">
      {/* Beta notice */}
      <div className="glass-card p-4 flex items-start gap-3 border-primary/20">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-white/60 leading-relaxed">
          You&apos;re on the <span className="font-bold text-white">Fider beta</span> — every plan is
          free while we build. Your plan limits and features below are already live; billing starts
          when the beta ends. To change your plan, just reach out.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Plan card */}
        <Card className="lg:col-span-1">
          <CardHeader className="items-start">
            <div className="flex items-center justify-between w-full">
              <CardTitle>Current Plan</CardTitle>
              <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border', status.chip)}>
                {status.label}
              </span>
            </div>
          </CardHeader>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-white">{data.planName}</p>
          </div>
          <p className="text-sm text-white/40 font-bold mt-1">
            {data.priceMonthly > 0 ? `${fmtMoney(data.priceMonthly)} / month` : 'Free during beta'}
          </p>
          {trial !== null && (
            <p className="text-[11px] text-white/40 mt-3 font-medium">
              {trial > 0 ? `Trial ends in ${trial} day${trial !== 1 ? 's' : ''} (${fmtDate(data.trialEndsAt)})` : 'Trial ended'}
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Included</p>
            {data.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-white/70">
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                {FEATURE_LABELS[f] ?? f}
              </div>
            ))}
          </div>
        </Card>

        {/* Usage meters */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usage This Period</CardTitle>
            <CardDescription className="normal-case tracking-normal text-white/40 font-medium text-xs mt-1">
              How much of your plan you&apos;re using right now.
            </CardDescription>
          </CardHeader>
          <div className="space-y-6 mt-2">
            <UsageMeter icon={Car} label="Fleet vehicles" current={data.usage.cars} limit={data.limits.maxCars} />
            <UsageMeter icon={Users} label="Staff seats" current={data.usage.staff} limit={data.limits.maxStaff} />
            <UsageMeter icon={CalendarCheck} label="Bookings this month" current={data.usage.bookingsThisMonth} limit={data.limits.maxBookingsPerMonth} />
          </div>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Invoices
          </CardTitle>
        </CardHeader>
        {data.invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Invoices Yet"
            description="Platform invoices will appear here once the beta ends and billing begins."
          />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-[10px] font-black text-white/30 uppercase tracking-widest text-left">
                  <th className="px-2 py-2">Invoice</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Issued</th>
                  <th className="px-2 py-2">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="text-white/70">
                    <td className="px-2 py-3 font-mono text-xs text-white">{inv.number}</td>
                    <td className="px-2 py-3 font-bold text-white">{fmtMoney(inv.amount)} {inv.currency}</td>
                    <td className="px-2 py-3">
                      <span className={cn('px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border', INVOICE_STYLES[inv.status])}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[11px]">{fmtDate(inv.issuedAt)}</td>
                    <td className="px-2 py-3 text-[11px]">{fmtDate(inv.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function UsageMeter({
  icon: Icon,
  label,
  current,
  limit,
}: {
  icon: React.ElementType;
  label: string;
  current: number;
  limit: number | null;
}) {
  const unlimited = limit === null;
  const pct = unlimited ? 8 : Math.min(100, Math.round((current / Math.max(1, limit)) * 100));
  const near = !unlimited && pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-bold text-white/70">
          <Icon className="w-4 h-4 text-primary" /> {label}
        </span>
        <span className="text-xs font-black text-white">
          {current} <span className="text-white/30">/ {unlimited ? '∞' : limit}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            unlimited ? 'bg-primary/40' : near ? 'bg-amber-500' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {unlimited && (
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Unlimited on your plan</p>
      )}
    </div>
  );
}
