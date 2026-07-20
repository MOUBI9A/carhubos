"use client";

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  ShieldCheck,
  Zap,
  Activity,
  FileDown,
  LayoutGrid,
  MapPin,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  Car,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { useErpData } from './useErpData';

export default function TitanERP() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const router = useRouter();
  const { data, isLoading, error, refetch, exportPnL } = useErpData();
  const [activeView, setActiveTab] = useState<'global' | 'branches' | 'forecast'>('global');

  const formatAmount = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
    return amount.toLocaleString();
  };

  const handleAudit = () => {
    showToast('pulse', 'Running audit…', 'Scanning fleet health, document compliance, and financial records.');
    refetch();
  };

  const handleExportPnL = () => {
    exportPnL();
    showToast('success', 'P&L exported', 'Your institutional P&L statement has been downloaded as CSV.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-surface flex items-center justify-center border border-hairline">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading Titan ERP</p>
          <p className="mt-1 text-xs text-text-muted">Aggregating business intelligence…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Connection failed</p>
          <p className="text-xs text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch} className="mt-4">
          <RefreshCw className="w-4 h-4 me-2" /> Retry connection
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Calculate chart max for bar scaling
  const chartMax = Math.max(
    ...data.monthlyData.map((m) => Math.max(m.revenue, m.expenses)),
    1,
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('titanErp')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">Strategic business intelligence across your network</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 px-6" onClick={handleAudit}>
            <BarChart3 className="w-4 h-4 me-2" />
            Full audit
          </Button>
          <Button className="h-12 px-8" onClick={handleExportPnL}>
             <FileDown className="w-4 h-4 me-2" />
             Export P&L
          </Button>
        </div>
      </header>

      {/* Strategic Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-2xl w-fit border border-hairline">
        {[
          { id: 'global', label: 'Consolidated', icon: Globe },
          { id: 'branches', label: 'Branches', icon: MapPin },
          { id: 'forecast', label: 'Forecast', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
              activeView === tab.id ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ GLOBAL TAB ═══════════════════════ */}
      {activeView === 'global' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           {/* Global Multi-Branch Metrics */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Network GMV — the page's single brass finance hero */}
              <Card className="group cursor-pointer" onClick={() => router.push('/dashboard/finance')}>
                 <div className="flex items-start justify-between">
                    <p className="eyebrow">Network GMV</p>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", data.gmv.changePercent >= 0 ? "text-success" : "text-danger")}>
                      {data.gmv.changePercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {data.gmv.changePercent >= 0 ? '+' : ''}{data.gmv.changePercent}%
                    </span>
                 </div>
                 <p className="mt-3 text-3xl font-semibold tracking-tight">
                    <span className="font-mono tabular metal-text">{formatAmount(data.gmv.value)}</span>
                    <span className="ms-1.5 text-sm font-normal text-text-faint">MAD</span>
                 </p>
                 <p className="mt-1 text-xs text-text-muted">vs last-year baseline</p>
              </Card>

              {/* Operational efficiency */}
              <Card>
                 <p className="eyebrow">Operational efficiency</p>
                 <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    <span className="font-mono tabular">{data.efficiency.score}</span>
                    <span className="ms-1.5 text-sm font-normal text-text-faint">pts</span>
                 </p>
                 <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-surface-raised rounded-full overflow-hidden">
                       <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.min(data.efficiency.score, 100)}%` }} />
                    </div>
                    <span className={cn("text-xs font-medium", data.efficiency.score >= 70 ? "text-text-muted" : "text-warning")}>
                      {data.efficiency.score >= 80 ? 'Optimal' : data.efficiency.score >= 50 ? 'Moderate' : 'Low'}
                    </span>
                 </div>
              </Card>

              {/* Fleet health average */}
              <Card className="group cursor-pointer" onClick={() => router.push('/dashboard/fleet')}>
                 <div className="flex items-start justify-between">
                    <p className="eyebrow">Fleet health average</p>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", data.fleetHealth.changePercent >= 0 ? "text-success" : "text-warning")}>
                      {data.fleetHealth.changePercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {data.fleetHealth.changePercent >= 0 ? '+' : ''}{data.fleetHealth.changePercent}%
                    </span>
                 </div>
                 <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    <span className="font-mono tabular">{data.fleetHealth.percent}</span>
                    <span className="ms-1.5 text-sm font-normal text-text-faint">%</span>
                 </p>
                 <p className="mt-1 text-xs text-text-muted">
                    {data.fleetHealth.changePercent < 0 ? 'Expiring docs impact' : 'All docs valid'}
                 </p>
              </Card>

              {/* Network utilization */}
              <Card className="group cursor-pointer" onClick={() => router.push('/dashboard/bookings')}>
                 <p className="eyebrow">Network utilization</p>
                 <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    <span className="font-mono tabular">{data.utilization.percent}</span>
                    <span className="ms-1.5 text-sm font-normal text-text-faint">%</span>
                 </p>
                 <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                    <Activity className="w-3.5 h-3.5 text-success" />
                    Live momentum
                 </p>
              </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Capital flow chart — violet revenue series, neutral expenses */}
              <Card className="lg:col-span-8 h-[450px] flex flex-col justify-between">
                 <CardHeader className="p-0 flex-row items-start justify-between">
                    <div>
                       <CardTitle className="text-lg">Capital flow</CardTitle>
                       <CardDescription>Revenue vs OpEx · 12 months</CardDescription>
                    </div>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-primary" />
                          <span className="eyebrow">Revenue</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-text-faint" />
                          <span className="eyebrow">Expenses</span>
                       </div>
                    </div>
                 </CardHeader>
                 <div className="flex-1 flex items-end gap-2 pb-8 pt-12">
                    {data.monthlyData.map((m, i) => (
                      <div key={i} className="flex-1 relative group/bar flex flex-col items-center justify-end gap-1">
                         {/* Tooltip */}
                         <div className="absolute bottom-full mb-4 bg-surface-raised text-foreground text-[10px] font-medium px-3 py-2 rounded-lg border border-hairline opacity-0 group-hover/bar:opacity-100 transition-all scale-90 group-hover/bar:scale-100 z-10 whitespace-nowrap shadow-lg">
                            <p className="font-mono tabular text-primary">↑ {m.revenue.toLocaleString()} MAD</p>
                            <p className="font-mono tabular text-danger">↓ {m.expenses.toLocaleString()} MAD</p>
                            <p className="border-t border-hairline mt-1 pt-1 font-mono tabular text-text-muted">Net {(m.revenue - m.expenses).toLocaleString()} MAD</p>
                         </div>
                         {/* Expense bar (background) */}
                         <div
                           className="w-full bg-text-faint/15 rounded-t-lg absolute bottom-0 z-0 transition-all"
                           style={{ height: `${chartMax > 0 ? (m.expenses / chartMax) * 100 : 0}%` }}
                         />
                         {/* Revenue bar (foreground) — violet series with soft area fill */}
                         <div
                           className="w-full bg-gradient-to-t from-primary/50 to-primary/15 group-hover/bar:from-primary/70 group-hover/bar:to-primary/25 transition-all rounded-t-lg relative z-10"
                           style={{ height: `${chartMax > 0 ? (m.revenue / chartMax) * 100 : 0}%` }}
                         />
                      </div>
                    ))}
                 </div>
                 <div className="flex items-center justify-between pt-6 border-t border-hairline">
                    {data.monthlyData.map((m) => (
                      <span key={m.month} className="font-mono tabular text-[9px] text-text-faint">{m.month}</span>
                    ))}
                 </div>
              </Card>

              {/* Forensic Intelligence Sidebar */}
              <div className="lg:col-span-4 space-y-8">
                 {/* Strategic Advisor */}
                 <Card>
                    <CardHeader className="p-0 mb-6">
                       <CardTitle>Strategic advisor</CardTitle>
                    </CardHeader>
                    <div className="space-y-6">
                       <div className="p-4 bg-surface-raised rounded-2xl border border-hairline">
                          <p className="text-sm text-text-muted leading-relaxed">
                            &quot;{data.advisor.message}&quot;
                          </p>
                       </div>
                       <Button
                         className="w-full h-11"
                         onClick={() => {
                           if (data.advisor.action === 'EXPAND_FLEET') {
                             router.push('/dashboard/fleet');
                           } else if (data.advisor.action === 'BOOST_MARKETING') {
                             showToast('info', 'Marketing campaign', 'Consider launching promotions to boost fleet utilization.');
                           } else {
                             showToast('success', 'Pricing optimized', 'Review peak-period pricing in your fleet settings.');
                           }
                         }}
                       >
                         {data.advisor.action === 'EXPAND_FLEET' ? 'View fleet' :
                          data.advisor.action === 'BOOST_MARKETING' ? 'Plan campaign' :
                          'Optimize pricing'}
                       </Button>
                    </div>
                 </Card>

                 {/* Critical Exceptions - Real data, clickable */}
                 <Card>
                    <CardHeader className="p-0 mb-6">
                       <CardTitle>Critical exceptions</CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                       {data.exceptions.length === 0 ? (
                         <div className="py-8 text-center">
                           <ShieldCheck className="w-8 h-8 text-success/40 mx-auto mb-3" />
                           <p className="text-sm font-medium text-foreground">All systems nominal</p>
                           <p className="mt-1 text-xs text-text-muted">No critical exceptions detected</p>
                         </div>
                       ) : (
                         data.exceptions.map((ex, i) => (
                           <div
                             key={ex.id || i}
                             onClick={() => router.push(ex.link)}
                             className={cn(
                               "p-3 rounded-xl border flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-all",
                               ex.severity === 'danger' ? 'bg-danger/10 border-danger/20 hover:bg-danger/15' :
                               ex.severity === 'warning' ? 'bg-warning/10 border-warning/20 hover:bg-warning/15' :
                               'bg-info/10 border-info/20 hover:bg-info/15'
                             )}
                           >
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "w-1.5 h-1.5 rounded-full",
                                   ex.severity === 'danger' ? 'bg-danger' :
                                   ex.severity === 'warning' ? 'bg-warning' : 'bg-info'
                                 )} />
                                 <span className="text-xs font-medium text-text-muted group-hover:text-foreground transition-colors">{ex.msg}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-text-faint group-hover:text-foreground shrink-0" />
                           </div>
                         ))
                       )}
                    </div>
                 </Card>
              </div>
           </div>
        </div>
      )}

      {/* ═══════════════════════ BRANCHES TAB ═══════════════════════ */}
      {activeView === 'branches' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           {/* Branch Cards */}
           <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.branches.map((branch, i) => (
                <Card
                  key={i}
                  className="group cursor-pointer"
                  onClick={() => router.push('/dashboard/fleet')}
                >
                   <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-2xl bg-surface-raised flex items-center justify-center border border-hairline">
                            <Building2 className="w-5 h-5 text-text-muted" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{branch.name}</h3>
                            <p className="text-xs text-text-muted">{branch.city}</p>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={branch.utilization >= 70 ? 'outline' : branch.utilization >= 40 ? 'secondary' : 'destructive'}
                        className="shrink-0"
                      >
                        <span className={cn(
                          "me-1 w-1.5 h-1.5 rounded-full",
                          branch.utilization >= 70 ? 'bg-success' : branch.utilization >= 40 ? 'bg-warning' : 'bg-danger'
                        )} />
                        {branch.utilization >= 70 ? 'High perf' : branch.utilization >= 40 ? 'Moderate' : 'Low'}
                      </Badge>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-raised rounded-xl">
                        <p className="eyebrow mb-1">Revenue</p>
                        <p className="text-lg font-semibold text-foreground"><span className="font-mono tabular">{formatAmount(branch.revenue)}</span> <span className="text-[9px] font-normal text-text-faint">MAD</span></p>
                      </div>
                      <div className="p-3 bg-surface-raised rounded-xl">
                        <p className="eyebrow mb-1">Bookings</p>
                        <p className="text-lg font-semibold text-foreground"><span className="font-mono tabular">{branch.bookings}</span> <span className="text-[9px] font-normal text-text-faint">total</span></p>
                      </div>
                      <div className="p-3 bg-surface-raised rounded-xl">
                        <p className="eyebrow mb-1">Fleet</p>
                        <div className="flex items-center gap-2">
                          <Car className="w-3.5 h-3.5 text-text-muted" />
                          <p className="text-lg font-semibold text-foreground font-mono tabular">{branch.fleetSize}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-surface-raised rounded-xl">
                        <p className="eyebrow mb-1">Health</p>
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-success" />
                          <p className="text-lg font-semibold text-foreground font-mono tabular">{branch.healthScore}%</p>
                        </div>
                      </div>
                   </div>

                   {/* Utilization Bar */}
                   <div className="mt-6">
                      <div className="flex justify-between mb-2">
                        <span className="eyebrow">Utilization</span>
                        <span className="font-mono tabular text-xs text-primary">{Math.round(branch.utilization)}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(branch.utilization, 100)}%` }}
                        />
                      </div>
                   </div>

                   {/* Active bookings indicator */}
                   <div className="mt-4 flex items-center justify-between pt-4 border-t border-hairline">
                     <div className="flex items-center gap-2">
                       <Activity className="w-3 h-3 text-success" />
                       <span className="text-xs text-text-muted"><span className="font-mono tabular">{branch.activeBookings}</span> active now</span>
                     </div>
                     <ArrowRight className="w-3.5 h-3.5 text-text-faint group-hover:text-primary transition-colors" />
                   </div>
                </Card>
              ))}
           </div>

           {/* Summary Stats */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="text-center py-6">
                 <p className="eyebrow">Total branches</p>
                 <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground font-mono tabular">{data.branches.length}</p>
              </Card>
              <Card className="text-center py-6">
                 <p className="eyebrow">Combined fleet</p>
                 <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground font-mono tabular">{data.branches.reduce((s, b) => s + b.fleetSize, 0)}</p>
              </Card>
              <Card className="text-center py-6">
                 <p className="eyebrow">Total bookings</p>
                 <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground font-mono tabular">{data.branches.reduce((s, b) => s + b.bookings, 0)}</p>
              </Card>
              <Card className="text-center py-6">
                 <p className="eyebrow">Avg health</p>
                 <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground font-mono tabular">
                   {data.branches.length > 0 ? Math.round(data.branches.reduce((s, b) => s + b.healthScore, 0) / data.branches.length) : 0}%
                 </p>
              </Card>
           </div>
        </div>
      )}

      {/* ═══════════════════════ FORECAST TAB ═══════════════════════ */}
      {activeView === 'forecast' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
           {/* Projected Liquidity Hero */}
           <Card className="h-64 flex flex-col items-center justify-center text-center">
              <p className="eyebrow">Projected 30-day liquidity</p>
              <h2 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight text-foreground">
                <span className="font-mono tabular">{data.forecast.projected30Day >= 0 ? '+' : ''}{formatAmount(data.forecast.projected30Day)}</span>
                <span className="ms-2 text-xl font-normal text-text-faint">MAD</span>
              </h2>
              <p className={cn(
                "mt-4 text-xs font-medium",
                data.forecast.projected30Day >= 0 ? "text-success" : "text-danger"
              )}>
                {data.forecast.projected30Day >= 0 ? 'Cash-positive horizon confirmed' : 'Cash flow deficit projected'}
              </p>
           </Card>

           {/* Inflows / Outflows */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Inflows */}
              <Card>
                 <CardHeader>
                    <CardTitle>Upcoming inflows</CardTitle>
                 </CardHeader>
                 <div className="space-y-4">
                    {data.forecast.inflows.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm text-text-muted">No projected inflows</p>
                      </div>
                    ) : (
                      data.forecast.inflows.map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-hairline hover:bg-surface transition-colors cursor-pointer" onClick={() => router.push('/dashboard/bookings')}>
                           <div>
                              <p className="text-sm font-medium text-foreground">{row.source}</p>
                              <p className="text-xs text-text-muted">Expected <span className="font-mono tabular">{row.date}</span></p>
                           </div>
                           <p className="text-sm font-mono tabular font-medium text-success">+{row.amount.toLocaleString()} MAD</p>
                        </div>
                      ))
                    )}
                 </div>
              </Card>

              {/* Outflows */}
              <Card>
                 <CardHeader>
                    <CardTitle>Projected outflows</CardTitle>
                 </CardHeader>
                 <div className="space-y-4">
                    {data.forecast.outflows.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm text-text-muted">No projected outflows</p>
                      </div>
                    ) : (
                      data.forecast.outflows.map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-hairline hover:bg-surface transition-colors cursor-pointer" onClick={() => router.push('/dashboard/finance')}>
                           <div>
                              <p className="text-sm font-medium text-foreground">{row.source}</p>
                              <p className="text-xs text-text-muted">Target <span className="font-mono tabular">{row.date}</span></p>
                           </div>
                           <p className="text-sm font-mono tabular font-medium text-danger">−{row.amount.toLocaleString()} MAD</p>
                        </div>
                      ))
                    )}
                 </div>
              </Card>
           </div>

           {/* Forecast Summary Bar */}
           <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Total projected inflows</p>
                  <p className="mt-1 font-mono tabular text-xl font-semibold text-success">+{data.forecast.inflows.reduce((s, i) => s + i.amount, 0).toLocaleString()} MAD</p>
                </div>
                <div className="eyebrow px-6">vs</div>
                <div className="text-end">
                  <p className="eyebrow">Total projected outflows</p>
                  <p className="mt-1 font-mono tabular text-xl font-semibold text-danger">−{data.forecast.outflows.reduce((s, o) => s + o.amount, 0).toLocaleString()} MAD</p>
                </div>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
