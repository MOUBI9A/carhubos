"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useRouter } from 'next/navigation';
import {
  Globe,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useAdminOverview } from './useAdminOverview';

export default function AdminPulse() {
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Platform Data Offline</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
      </div>
    );
  }

  const totalFleet = data.agencies.reduce((s, a) => s + (a.fleetSize || 0), 0);
  const ranked = [...data.agencies].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Global Pulse</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">SaaS Platform Health &amp; GMV</p>
        </div>
        <Button onClick={() => router.push('/admin/agencies')}>
          <Plus className="w-4 h-4 mr-2" />
          Manage Agencies
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl"><AnimatedNumber value={data.stats.totalAgencies} /></CardTitle>
          <CardDescription>Active Agencies</CardDescription>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl"><AnimatedNumber value={data.stats.platformGMV} /> <span className="text-xs text-white/40">MAD</span></CardTitle>
          <CardDescription>Total Platform GMV</CardDescription>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl"><AnimatedNumber value={data.stats.liveBookings} /></CardTitle>
          <CardDescription>Live Bookings</CardDescription>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <CardTitle className="text-2xl"><AnimatedNumber value={totalFleet} /></CardTitle>
          <CardDescription>Total Fleet (all tenants)</CardDescription>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Agencies</CardTitle>
          <CardDescription className="font-bold">Ranked by lifetime bookings</CardDescription>
        </CardHeader>
        <div className="space-y-4">
          {ranked.length === 0 ? (
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest py-8 text-center">No agencies yet</p>
          ) : ranked.map((agency) => (
            <div
              key={agency.id}
              onClick={() => router.push('/admin/agencies')}
              className="flex items-center justify-between p-4 glass-card group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40">
                  {agency.name?.[0] || 'A'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{agency.name}</h4>
                  <p className="text-[10px] font-bold text-white/40 uppercase">{agency.tier} • {agency.fleetSize} CARS</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-white">{agency.totalBookings} bookings</p>
                <p className={`text-[10px] font-black uppercase ${agency.status === 'ACTIVE' ? 'text-success' : 'text-danger'}`}>{agency.status}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
