'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Package,
  Wrench,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface OperationalMetrics {
  waitingVehicles: number;
  diagnosticsNeedingReview: number;
  activeRepairs: number;
  blockedJobs: number;
  readyForQc: number;
  awaitingApproval: number;
  completedThisMonth: number;
  criticalIssuesCount: number;
}

interface PredictiveOverview {
  totalAssets: number;
  overdueAssets: number;
  dueSoonAssets: number;
  forecast30DaysMad: number;
}

export function AutomotiveOperationalPulse() {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [predictive, setPredictive] = useState<PredictiveOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [mRes, pRes] = await Promise.all([
          fetch('/api/work-orders/metrics/summary', { credentials: 'include' }),
          fetch('/api/maintenance/predictive-overview', { credentials: 'include' }),
        ]);

        if (mRes.ok) {
          const mData = await mRes.json();
          setMetrics(mData);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setPredictive(pData);
        }
      } catch {
        // Fallback or offline
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-4 w-48 bg-surface-raised rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface-raised rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  const m = metrics ?? {
    waitingVehicles: 0,
    diagnosticsNeedingReview: 0,
    activeRepairs: 0,
    blockedJobs: 0,
    readyForQc: 0,
    awaitingApproval: 0,
    completedThisMonth: 0,
    criticalIssuesCount: 0,
  };

  return (
    <Card className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-metal" />
              Automotive Workshop & Fleet Pulse
            </h2>
            {m.criticalIssuesCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 animate-pulse">
                <AlertOctagon className="h-3 w-3" />
                {m.criticalIssuesCount} Critical Faults Active
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Live operational status across garage bays, active diagnostics, repair orders, and fleet maintenance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/diagnostics">
            <Button variant="outline" size="sm">
              <Gauge className="h-3.5 w-3.5" /> Diagnostic Bay
            </Button>
          </Link>
          <Link href="/dashboard/work-orders">
            <Button variant="primary" size="sm">
              Work Orders <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Vehicles Waiting */}
        <div className="p-3.5 rounded-xl bg-surface-raised border border-hairline space-y-1">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Waiting in Bay</span>
            <Clock className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-text-primary">
            {m.waitingVehicles}
          </p>
          <p className="text-[10px] text-text-muted">Intake & Scheduled</p>
        </div>

        {/* 2. Diagnostics Needing Review */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          m.diagnosticsNeedingReview > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-surface-raised border-hairline'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span>Needs Review</span>
            <AlertTriangle className={`h-3.5 w-3.5 ${m.diagnosticsNeedingReview > 0 ? 'text-amber-400' : 'text-text-muted'}`} />
          </div>
          <p className="text-xl font-bold font-mono">
            {m.diagnosticsNeedingReview}
          </p>
          <p className="text-[10px] opacity-75">AI Analyzed Sessions</p>
        </div>

        {/* 3. Active Repairs */}
        <div className="p-3.5 rounded-xl bg-surface-raised border border-hairline space-y-1">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Active Repairs</span>
            <Wrench className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-text-primary">
            {m.activeRepairs}
          </p>
          <p className="text-[10px] text-text-muted">In Progress on Lift</p>
        </div>

        {/* 4. Blocked / Waiting for Parts */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          m.blockedJobs > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            : 'bg-surface-raised border-hairline'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span>Waiting on Parts</span>
            <Package className={`h-3.5 w-3.5 ${m.blockedJobs > 0 ? 'text-rose-400' : 'text-text-muted'}`} />
          </div>
          <p className="text-xl font-bold font-mono">
            {m.blockedJobs}
          </p>
          <p className="text-[10px] opacity-75">Blocked Work Orders</p>
        </div>

        {/* 5. Quality Check Sign-off */}
        <div className="p-3.5 rounded-xl bg-surface-raised border border-hairline space-y-1">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Quality Check</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-text-primary">
            {m.readyForQc}
          </p>
          <p className="text-[10px] text-text-muted">DTC Re-scan Needed</p>
        </div>

        {/* 6. Completed / Invoiced this Month */}
        <div className="p-3.5 rounded-xl bg-surface-raised border border-hairline space-y-1">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Completed (Mo.)</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono text-text-primary">
            {m.completedThisMonth}
          </p>
          <p className="text-[10px] text-text-muted">Invoiced & Verified</p>
        </div>
      </div>

      {/* Predictive Fleet Maintenance Summary Banner */}
      {predictive && (
        <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-hairline flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-text-primary">
                Fleet Predictive Maintenance Forecast (Next 30 Days)
              </p>
              <p className="text-text-muted mt-0.5">
                {predictive.totalAssets} fleet assets tracked &bull; {predictive.overdueAssets} overdue &bull; {predictive.dueSoonAssets} due soon
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Estimated 30-Day Budget</span>
              <span className="font-mono font-bold text-sm text-text-primary">
                {predictive.forecast30DaysMad.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
              </span>
            </div>
            <Link href="/dashboard/diagnostics">
              <Button variant="ghost" size="sm" className="text-xs">
                Inspect Schedule &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
