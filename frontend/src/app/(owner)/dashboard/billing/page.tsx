"use client";

import { useTranslations } from 'next-intl';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { AgencyImage } from '@/components/ui/AgencyImage';
import {
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
  TRIAL: { chip: 'text-info bg-info/10 border-info/20', label: 'Trial' },
  ACTIVE: { chip: 'text-success bg-success/10 border-success/20', label: 'Active' },
  PAST_DUE: { chip: 'text-warning bg-warning/10 border-warning/20', label: 'Past Due' },
  SUSPENDED: { chip: 'text-danger bg-danger/10 border-danger/20', label: 'Suspended' },
  CANCELED: { chip: 'text-text-faint bg-surface border-hairline', label: 'Canceled' },
};

const INVOICE_STYLES: Record<string, string> = {
  PAID: 'text-success bg-success/10 border-success/20',
  ISSUED: 'text-warning bg-warning/10 border-warning/20',
  DRAFT: 'text-text-muted bg-surface border-hairline',
  VOID: 'text-text-faint bg-surface border-hairline line-through',
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
  const t = useTranslations('ownerPages');
  const { data, isLoading, error, refetch } = useBilling();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('billing')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
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
            <p className="text-xs font-medium text-text-muted max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="w-3.5 h-3.5 me-2" /> Retry
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
      <Card>
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted leading-relaxed">
            You&apos;re on the <span className="font-semibold text-foreground">Fider beta</span> — every plan is
            free while we build. Your plan limits and features below are already live; billing starts
            when the beta ends. To change your plan, just reach out.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Plan card */}
        <Card className="lg:col-span-1">
          <CardHeader className="items-start">
            <div className="flex items-center justify-between w-full">
              <CardTitle>Current plan</CardTitle>
              <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', status.chip)}>
                {status.label}
              </span>
            </div>
          </CardHeader>
          <div className="flex items-end gap-2">
            <p className="metal-text text-4xl font-semibold tracking-tight">{data.planName}</p>
          </div>
          <p className="text-sm text-text-muted font-medium mt-1">
            {data.priceMonthly > 0 ? (
              <>
                <span className="font-mono tabular text-foreground">{fmtMoney(data.priceMonthly)}</span> / month
              </>
            ) : (
              'Free during beta'
            )}
          </p>
          {trial !== null && (
            <p className="text-xs text-text-muted mt-3">
              {trial > 0 ? `Trial ends in ${trial} day${trial !== 1 ? 's' : ''} (${fmtDate(data.trialEndsAt)})` : 'Trial ended'}
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-hairline space-y-2">
            <p className="eyebrow mb-3">Included</p>
            {data.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-text-muted">
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                {FEATURE_LABELS[f] ?? f}
              </div>
            ))}
          </div>
        </Card>

        {/* Usage meters */}
        <Card className="lg:col-span-2">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Usage this period</CardTitle>
              <CardDescription className="normal-case tracking-normal text-text-muted font-medium text-xs mt-1">
                How much of your plan you&apos;re using right now.
              </CardDescription>
            </div>
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
            <Receipt className="w-4 h-4 text-text-faint" /> Invoices
          </CardTitle>
        </CardHeader>
        {data.invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-16" />
            <div>
              <p className="font-medium text-foreground">No invoices yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
                Platform invoices will appear here once the beta ends and billing begins.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="eyebrow text-start">
                  <th className="px-2 py-2 text-start">Invoice</th>
                  <th className="px-2 py-2 text-end">Amount</th>
                  <th className="px-2 py-2 text-start">Status</th>
                  <th className="px-2 py-2 text-start">Issued</th>
                  <th className="px-2 py-2 text-start">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="text-text-muted hover:bg-surface-raised transition-colors">
                    <td className="px-2 py-3 font-mono tabular text-xs text-foreground">{inv.number}</td>
                    <td className="px-2 py-3 text-end font-mono tabular font-semibold text-foreground">{fmtMoney(inv.amount)} {inv.currency}</td>
                    <td className="px-2 py-3">
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', INVOICE_STYLES[inv.status])}>
                        {inv.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-xs">{fmtDate(inv.issuedAt)}</td>
                    <td className="px-2 py-3 text-xs">{fmtDate(inv.paidAt)}</td>
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
        <span className="flex items-center gap-2 text-xs font-medium text-text-muted">
          <Icon className="w-4 h-4 text-text-faint" /> {label}
        </span>
        <span className="text-xs font-semibold font-mono tabular text-foreground">
          {current} <span className="text-text-faint">/ {unlimited ? '∞' : limit}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            unlimited ? 'bg-primary/40' : near ? 'bg-warning' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {unlimited && (
        <p className="eyebrow mt-1">Unlimited on your plan</p>
      )}
    </div>
  );
}
