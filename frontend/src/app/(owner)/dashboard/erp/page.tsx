"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
    showToast('pulse', 'Running Audit...', 'Scanning fleet health, document compliance, and financial records.');
    refetch();
  };

  const handleExportPnL = () => {
    exportPnL();
    showToast('success', 'P&L Exported', 'Your institutional P&L statement has been downloaded as CSV.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-white/60 uppercase tracking-[0.3em]">Initializing Titan ERP</p>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2">Aggregating business intelligence...</p>
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Connection Failed</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
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
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Titan ERP <span className="text-primary">Console</span></h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            Strategic Business Intelligence Mode Active
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 px-6" onClick={handleAudit}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Full Audit
          </Button>
          <Button className="h-12 px-8 bg-white text-background hover:bg-white/90" onClick={handleExportPnL}>
             <FileDown className="w-4 h-4 mr-2" />
             Export Institutional P&L
          </Button>
        </div>
      </header>

      {/* Strategic Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl w-fit border border-white/5">
        {[
          { id: 'global', label: 'Consolidated Global', icon: Globe },
          { id: 'branches', label: 'Branch Performance', icon: MapPin },
          { id: 'forecast', label: 'Liquidity Forecast', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
              activeView === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white/60"
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
              <Card className="relative overflow-hidden group border-white/5 shadow-2xl cursor-pointer hover:ring-1 ring-primary/20 transition-all" onClick={() => router.push('/dashboard/finance')}>
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Globe className="w-16 h-16" />
                 </div>
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Network GMV</p>
                 <CardTitle className="text-3xl font-black text-white italic">{formatAmount(data.gmv.value)} <span className="text-xs text-primary font-bold not-italic">MAD</span></CardTitle>
                 <div className="mt-4 flex items-center gap-2">
                    <span className={cn("font-black text-[10px]", data.gmv.changePercent >= 0 ? "text-success" : "text-danger")}>
                      {data.gmv.changePercent >= 0 ? '+' : ''}{data.gmv.changePercent}%
                    </span>
                    <span className="text-white/20 font-bold text-[9px] uppercase">vs LY baseline</span>
                 </div>
              </Card>

              <Card className="relative overflow-hidden group border-white/5 shadow-2xl">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Zap className="w-16 h-16 text-primary" />
                 </div>
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Op. Efficiency</p>
                 <CardTitle className="text-3xl font-black text-white italic">{data.efficiency.score} <span className="text-xs text-primary font-bold not-italic">PTS</span></CardTitle>
                 <div className="mt-4 flex items-center gap-2">
                    <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.min(data.efficiency.score, 100)}%` }} />
                    </div>
                    <span className={cn("font-bold text-[9px] uppercase tracking-widest italic font-black", data.efficiency.score >= 70 ? "text-white/80" : "text-amber-500")}>
                      {data.efficiency.score >= 80 ? 'Optimal' : data.efficiency.score >= 50 ? 'Moderate' : 'Low'}
                    </span>
                 </div>
              </Card>

              <Card className="relative overflow-hidden group border-white/5 shadow-2xl cursor-pointer hover:ring-1 ring-primary/20 transition-all" onClick={() => router.push('/dashboard/fleet')}>
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Fleet Health Avg</p>
                 <CardTitle className="text-3xl font-black text-white italic">{data.fleetHealth.percent} <span className="text-xs text-primary font-bold not-italic">%</span></CardTitle>
                 <div className="mt-4 flex items-center gap-2">
                    <span className={cn("font-black text-[10px]", data.fleetHealth.changePercent >= 0 ? "text-success" : "text-amber-500")}>
                      {data.fleetHealth.changePercent >= 0 ? '+' : ''}{data.fleetHealth.changePercent}%
                    </span>
                    <span className="text-white/20 font-bold text-[9px] uppercase">
                      {data.fleetHealth.changePercent < 0 ? 'Expiring docs impact' : 'All docs valid'}
                    </span>
                 </div>
              </Card>

              <Card className="relative overflow-hidden group border-white/5 shadow-2xl cursor-pointer hover:ring-1 ring-primary/20 transition-all" onClick={() => router.push('/dashboard/bookings')}>
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Network Utilization</p>
                 <CardTitle className="text-3xl font-black text-white italic">{data.utilization.percent} <span className="text-xs text-primary font-bold not-italic">%</span></CardTitle>
                 <div className="mt-4 flex items-center gap-2 text-white/80 font-bold text-[9px] uppercase tracking-widest italic font-black">
                    <Activity className="w-3 h-3 text-success animate-pulse" />
                    Live Momentum
                 </div>
              </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Financial DNA Visualizer - Capital Flow Chart */}
              <Card className="lg:col-span-8 h-[450px] flex flex-col justify-between group hover:ring-1 ring-primary/20 transition-all border-white/5 shadow-2xl">
                 <CardHeader className="p-0 flex-row items-start justify-between">
                    <div>
                       <CardTitle className="text-xl uppercase italic">Capital Flow Flux</CardTitle>
                       <CardDescription className="font-black text-[10px] tracking-widest text-primary/60">Revenue vs OpEx (Consolidated 12 Months)</CardDescription>
                    </div>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-primary" />
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Revenue</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-white/10" />
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Expenses</span>
                       </div>
                    </div>
                 </CardHeader>
                 <div className="flex-1 flex items-end gap-2 pb-8 pt-12">
                    {data.monthlyData.map((m, i) => (
                      <div key={i} className="flex-1 relative group/bar flex flex-col items-center justify-end gap-1">
                         {/* Tooltip */}
                         <div className="absolute bottom-full mb-4 bg-white text-background text-[10px] font-black px-3 py-2 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all scale-90 group-hover/bar:scale-100 z-10 whitespace-nowrap shadow-xl">
                            <p className="text-primary">↑ {m.revenue.toLocaleString()} MAD</p>
                            <p className="text-danger">↓ {m.expenses.toLocaleString()} MAD</p>
                            <p className="border-t border-gray-200 mt-1 pt-1 text-[9px]">Net: {(m.revenue - m.expenses).toLocaleString()} MAD</p>
                         </div>
                         {/* Expense bar (background) */}
                         <div 
                           className="w-full bg-white/5 rounded-t-lg absolute bottom-0 z-0 transition-all" 
                           style={{ height: `${chartMax > 0 ? (m.expenses / chartMax) * 100 : 0}%` }} 
                         />
                         {/* Revenue bar (foreground) */}
                         <div 
                           className="w-full bg-primary/20 group-hover/bar:bg-primary/50 transition-all rounded-t-lg relative z-10" 
                           style={{ height: `${chartMax > 0 ? (m.revenue / chartMax) * 100 : 0}%` }} 
                         />
                      </div>
                    ))}
                 </div>
                 <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    {data.monthlyData.map((m) => (
                      <span key={m.month} className="text-[9px] font-black text-white/20 tracking-tighter">{m.month}</span>
                    ))}
                 </div>
              </Card>

              {/* Forensic Intelligence Sidebar */}
              <div className="lg:col-span-4 space-y-8">
                 {/* Strategic Advisor */}
                 <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
                    <CardHeader className="p-0 mb-6 relative z-10">
                       <CardTitle className="uppercase tracking-widest text-[10px] text-primary">Strategic Advisor</CardTitle>
                    </CardHeader>
                    <div className="space-y-6 relative z-10">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-xs text-white/80 leading-relaxed italic font-medium">
                            &quot;{data.advisor.message}&quot;
                          </p>
                       </div>
                       <Button 
                         className="w-full h-11 uppercase font-black tracking-widest text-[10px]"
                         onClick={() => {
                           if (data.advisor.action === 'EXPAND_FLEET') {
                             router.push('/dashboard/fleet');
                           } else if (data.advisor.action === 'BOOST_MARKETING') {
                             showToast('info', 'Marketing Campaign', 'Consider launching promotions to boost fleet utilization.');
                           } else {
                             showToast('success', 'Pricing Optimized', 'Review peak-period pricing in your fleet settings.');
                           }
                         }}
                       >
                         {data.advisor.action === 'EXPAND_FLEET' ? 'View Fleet Management' :
                          data.advisor.action === 'BOOST_MARKETING' ? 'Plan Campaign' :
                          'Optimize Pricing'}
                       </Button>
                    </div>
                 </Card>

                 {/* Critical Exceptions - Real data, clickable */}
                 <Card className="border-white/5 shadow-2xl">
                    <CardHeader className="p-0 mb-6">
                       <CardTitle className="uppercase tracking-widest text-[10px] text-white/40">Critical Exceptions</CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                       {data.exceptions.length === 0 ? (
                         <div className="py-8 text-center">
                           <ShieldCheck className="w-8 h-8 text-success/30 mx-auto mb-3" />
                           <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">All Systems Nominal</p>
                           <p className="text-[9px] text-white/10 mt-1">No critical exceptions detected</p>
                         </div>
                       ) : (
                         data.exceptions.map((ex, i) => (
                           <div 
                             key={ex.id || i} 
                             onClick={() => router.push(ex.link)}
                             className={cn(
                               "p-3 rounded-xl border flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-all",
                               ex.severity === 'danger' ? 'bg-danger/5 border-danger/20 hover:bg-danger/10' : 
                               ex.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' : 
                               'bg-primary/5 border-primary/20 hover:bg-primary/10'
                             )}
                           >
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "w-1.5 h-1.5 rounded-full animate-pulse",
                                   ex.severity === 'danger' ? 'bg-danger' : 
                                   ex.severity === 'warning' ? 'bg-amber-500' : 'bg-primary'
                                 )} />
                                 <span className="text-[10px] font-bold text-white/60 group-hover:text-white transition-colors">{ex.msg}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white shrink-0" />
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
                  className="relative overflow-hidden group hover:ring-1 ring-primary/20 transition-all border-white/5 shadow-2xl cursor-pointer"
                  onClick={() => router.push('/dashboard/fleet')}
                >
                   <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                   
                   <div className="flex items-start justify-between mb-6 relative z-10">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">{branch.name}</h3>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{branch.city}</p>
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[8px] font-black px-2 py-1 rounded tracking-[0.2em] border",
                        branch.utilization >= 70 ? "bg-success/10 text-success border-success/20" :
                        branch.utilization >= 40 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-danger/10 text-danger border-danger/20"
                      )}>
                        {branch.utilization >= 70 ? 'HIGH PERF' : branch.utilization >= 40 ? 'MODERATE' : 'LOW'}
                      </span>
                   </div>

                   <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="p-3 bg-white/5 rounded-xl">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Revenue</p>
                        <p className="text-lg font-black text-white">{formatAmount(branch.revenue)} <span className="text-[9px] text-white/30">MAD</span></p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Bookings</p>
                        <p className="text-lg font-black text-white">{branch.bookings} <span className="text-[9px] text-white/30">TOTAL</span></p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Fleet</p>
                        <div className="flex items-center gap-2">
                          <Car className="w-3.5 h-3.5 text-primary" />
                          <p className="text-lg font-black text-white">{branch.fleetSize}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Health</p>
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-success" />
                          <p className="text-lg font-black text-white">{branch.healthScore}%</p>
                        </div>
                      </div>
                   </div>

                   {/* Utilization Bar */}
                   <div className="mt-6 relative z-10">
                      <div className="flex justify-between mb-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Utilization</span>
                        <span className="text-[9px] font-black text-primary">{Math.round(branch.utilization)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(branch.utilization, 100)}%` }} 
                        />
                      </div>
                   </div>

                   {/* Active bookings indicator */}
                   <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                     <div className="flex items-center gap-2">
                       <Activity className="w-3 h-3 text-success animate-pulse" />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{branch.activeBookings} Active Now</span>
                     </div>
                     <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-primary transition-colors" />
                   </div>
                </Card>
              ))}
           </div>

           {/* Summary Stats */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="text-center py-6">
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Total Branches</p>
                 <p className="text-4xl font-black text-white italic">{data.branches.length}</p>
              </Card>
              <Card className="text-center py-6">
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Combined Fleet</p>
                 <p className="text-4xl font-black text-white italic">{data.branches.reduce((s, b) => s + b.fleetSize, 0)}</p>
              </Card>
              <Card className="text-center py-6">
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Total Bookings</p>
                 <p className="text-4xl font-black text-white italic">{data.branches.reduce((s, b) => s + b.bookings, 0)}</p>
              </Card>
              <Card className="text-center py-6">
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Avg Health</p>
                 <p className="text-4xl font-black text-white italic">
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
           <Card className="h-64 flex flex-col items-center justify-center bg-primary/5 border-primary/20 relative overflow-hidden">
              <TrendingUp className="absolute w-64 h-64 opacity-5 -right-12 -bottom-12" />
              <div className="text-center relative z-10">
                 <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em] mb-4">Projected 30-Day Liquidity</p>
                 <h2 className="text-6xl font-black text-white italic tracking-tighter">
                   {data.forecast.projected30Day >= 0 ? '+' : ''}{formatAmount(data.forecast.projected30Day)} <span className="text-xl not-italic text-white/40 uppercase">MAD</span>
                 </h2>
                 <p className={cn(
                   "text-[10px] font-bold uppercase tracking-widest mt-4",
                   data.forecast.projected30Day >= 0 ? "text-success" : "text-danger"
                 )}>
                   {data.forecast.projected30Day >= 0 ? 'Cash-Positive Horizon Confirmed' : 'Warning: Cash Flow Deficit Projected'}
                 </p>
              </div>
           </Card>

           {/* Inflows / Outflows */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Inflows */}
              <Card>
                 <CardHeader>
                    <CardTitle className="uppercase tracking-widest text-[10px]">Upcoming Inflows</CardTitle>
                 </CardHeader>
                 <div className="space-y-4">
                    {data.forecast.inflows.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No projected inflows</p>
                      </div>
                    ) : (
                      data.forecast.inflows.map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 glass rounded-2xl border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => router.push('/dashboard/bookings')}>
                           <div>
                              <p className="text-sm font-bold text-white uppercase tracking-tight">{row.source}</p>
                              <p className="text-[10px] font-medium text-white/20 uppercase">Expected: {row.date}</p>
                           </div>
                           <p className="text-sm font-black text-success">+{row.amount.toLocaleString()} MAD</p>
                        </div>
                      ))
                    )}
                 </div>
              </Card>

              {/* Outflows */}
              <Card>
                 <CardHeader>
                    <CardTitle className="uppercase tracking-widest text-[10px]">Projected Outflows</CardTitle>
                 </CardHeader>
                 <div className="space-y-4">
                    {data.forecast.outflows.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No projected outflows</p>
                      </div>
                    ) : (
                      data.forecast.outflows.map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 glass rounded-2xl border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => router.push('/dashboard/finance')}>
                           <div>
                              <p className="text-sm font-bold text-white uppercase tracking-tight">{row.source}</p>
                              <p className="text-[10px] font-medium text-white/20 uppercase">Target: {row.date}</p>
                           </div>
                           <p className="text-sm font-black text-danger">-{row.amount.toLocaleString()} MAD</p>
                        </div>
                      ))
                    )}
                 </div>
              </Card>
           </div>

           {/* Forecast Summary Bar */}
           <Card className="border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total Projected Inflows</p>
                  <p className="text-xl font-black text-success mt-1">+{data.forecast.inflows.reduce((s, i) => s + i.amount, 0).toLocaleString()} MAD</p>
                </div>
                <div className="text-[10px] font-black text-white/20 px-6">VS</div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total Projected Outflows</p>
                  <p className="text-xl font-black text-danger mt-1">-{data.forecast.outflows.reduce((s, o) => s + o.amount, 0).toLocaleString()} MAD</p>
                </div>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
