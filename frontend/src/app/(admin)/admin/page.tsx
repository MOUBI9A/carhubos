"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Avatar } from '@/components/ui/Avatar';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { useRouter } from 'next/navigation';
import {
  Globe,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  Wallet,
  Rocket,
  Percent,
} from 'lucide-react';
import { useFormat } from '@/lib/useFormat';
import { useTranslations } from 'next-intl';
import { useAdminOverview, useFounderMetrics, type FounderMetrics } from './useAdminOverview';

/* Data viz stays violet — a single sequential ramp, no rainbow. */
const PLAN_COLORS: Record<string, string> = {
  BETA: 'bg-primary',
  STARTER: 'bg-primary/75',
  PRO: 'bg-primary/50',
  BUSINESS: 'bg-primary/30',
};

function FounderMetricsBand() {
  const t = useTranslations('adminPages');
  const { data: m } = useFounderMetrics();
  const { money } = useFormat();
  if (!m) return null;

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const planEntries = Object.entries(m.planDistribution);

  /* MRR is the ONE brass mark on this page (hero figure, .metal-text). */
  const cells: { icon: React.ElementType; tint: string; value: string; label: string; hero?: boolean }[] = [
    { icon: Wallet, tint: 'text-text-muted bg-surface-raised border-hairline', value: money(m.mrr, { compact: true }), label: t('mrr'), hero: true },
    { icon: TrendingUp, tint: 'text-success bg-success/10 border-success/20', value: money(m.arr, { compact: true }), label: t('arr') },
    { icon: Rocket, tint: 'text-info bg-info/10 border-info/20', value: `${m.trials}`, label: t('activeTrials') },
    { icon: Percent, tint: 'text-warning bg-warning/10 border-warning/20', value: pct(m.conversionRate), label: t('trialPaid') },
  ];

  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>{t('businessMetrics')}</CardTitle>
          <CardDescription>
            {t('payingActiveChurn', { paying: m.paying, active: m.activeTenants, churn: pct(m.churnRate) })}
          </CardDescription>
        </div>
      </CardHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cells.map((c) => (
          <div key={c.label} className="glass-card p-4">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${c.tint}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className={c.hero ? 'text-2xl font-semibold font-mono tabular metal-text' : 'text-xl font-semibold font-mono tabular text-foreground'}>{c.value}</p>
            <p className="eyebrow mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {planEntries.length > 0 && (
        <div className="mt-6 pt-6 border-t border-hairline">
          <p className="eyebrow mb-3">{t('planDistribution')}</p>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-raised">
            {planEntries.map(([key, count]) => (
              <div
                key={key}
                className={PLAN_COLORS[key] ?? 'bg-primary/15'}
                style={{ width: `${(count / m.totalTenants) * 100}%` }}
                title={`${key}: ${count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {planEntries.map(([key, count]) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <span className={`w-2 h-2 rounded-full ${PLAN_COLORS[key] ?? 'bg-primary/15'}`} />
                {key} · <span className="font-mono tabular">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AdminPulse() {
  const t = useTranslations('adminPages');
  const router = useRouter();
  const { data, isLoading, error, refetch } = useAdminOverview();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-3"><Skeleton className="w-56 h-8" /><Skeleton className="w-40 h-3" /></div>
          <Skeleton className="w-40 h-11 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold tracking-tight text-foreground">{t('platformOffline')}</p>
          <p className="text-xs text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 me-2" /> {t('retry')}</Button>
      </div>
    );
  }

  const totalFleet = data.agencies.reduce((s, a) => s + (a.fleetSize || 0), 0);
  const ranked = [...data.agencies].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('globalPulse')}</h1>
          <p className="text-sm text-text-muted mt-1">{t('platformHealth')}</p>
        </div>
        <Button onClick={() => router.push('/admin/agencies')}>
          <Plus className="w-4 h-4 me-2" />
          {t('manageAgencies')}
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-mono tabular"><AnimatedNumber value={data.stats.totalAgencies} /></CardTitle>
          <CardDescription>{t('activeAgencies')}</CardDescription>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl"><AnimatedNumber value={data.stats.platformGMV} className="font-mono tabular" /> <span className="text-xs text-text-faint">MAD</span></CardTitle>
          <CardDescription>{t('platformGmv')}</CardDescription>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-info" />
            </div>
          </div>
          <CardTitle className="text-2xl font-mono tabular"><AnimatedNumber value={data.stats.liveBookings} /></CardTitle>
          <CardDescription>{t('liveBookings')}</CardDescription>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-text-muted" />
            </div>
          </div>
          <CardTitle className="text-2xl font-mono tabular"><AnimatedNumber value={totalFleet} /></CardTitle>
          <CardDescription>{t('totalFleet')}</CardDescription>
        </Card>
      </div>

      <FounderMetricsBand />

      <Card>
        <CardHeader>
          <CardTitle>{t('topAgencies')}</CardTitle>
          <CardDescription>{t('rankedBookings')}</CardDescription>
        </CardHeader>
        <div className="space-y-4">
          {ranked.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              <AgencyImage alt="" slot="agency" ratio="5 / 3" rounded="rounded-xl" className="w-40" />
              <p className="text-sm font-medium text-text-muted">{t('noAgencies')}</p>
            </div>
          ) : ranked.map((agency) => (
            <div
              key={agency.id}
              onClick={() => router.push('/admin/agencies')}
              className="flex items-center justify-between p-4 glass-card group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <Avatar name={agency.name || 'A'} size={40} />
                <div>
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{agency.name}</h4>
                  <p className="eyebrow mt-0.5">{agency.tier} • <span className="font-mono tabular">{agency.fleetSize}</span> cars</p>
                </div>
              </div>
              <div className="text-end">
                <p className="text-xs font-semibold text-foreground"><span className="font-mono tabular">{agency.totalBookings}</span> bookings</p>
                <p className={`text-[11px] font-medium ${agency.status === 'ACTIVE' ? 'text-success' : 'text-danger'}`}>{agency.status}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
