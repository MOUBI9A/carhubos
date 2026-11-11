'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

export interface CustomerHealthData {
  overallRating: 'HEALTHY' | 'ATTENTION_NEEDED' | 'CRITICAL_ACTION_REQUIRED';
  canDrive: boolean;
  driveabilityAdvice: string;
  urgency: 'NORMAL' | 'WITHIN_48_HOURS' | 'IMMEDIATE';
  subsystems: {
    systemKey: string;
    name: string;
    status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
    laymanSummary: string;
    evidence: string[];
  }[];
  qAndA: {
    whatHappened: string;
    whatNeedsRepair: string;
    whatHappensIfIgnored: string;
    estimatedRepairDuration: string;
    estimatedCostRangeMad: string;
  };
  provenance: {
    dtcCodes: string[];
    dtcCount: number;
    hasFreezeFrame: boolean;
    confidence: string;
    technicianConfirmed: boolean;
    timestamp: string;
  };
}

export function CustomerVehicleHealthCard({
  sessionId,
  canPerform,
}: {
  sessionId: string;
  canPerform: boolean;
}) {
  const t = useTranslations('diagnostics');
  const [data, setData] = useState<CustomerHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CustomerHealthData>(
        `/diagnostics/sessions/${sessionId}/health-summary`,
      );
      setData(res.data);
      setIsOpen(true);
    } catch {
      setError('Failed to load customer health translation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CRITICAL':
      case 'CRITICAL_ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="h-3.5 w-3.5" />
            Critical Action
          </span>
        );
      case 'ATTENTION':
      case 'ATTENTION_NEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            Attention Needed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            Healthy
          </span>
        );
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-metal" />
            Customer Vehicle Health View
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Evidence-grounded, layman-translated health assessment with zero false precision
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSummary}
          disabled={loading}
        >
          {loading ? 'Translating...' : isOpen ? 'Refresh Health Card' : 'View Health Card'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {data && isOpen && (
        <div className="mt-4 space-y-5 border-t border-hairline pt-4">
          {/* Overall Health & Driveability Alert */}
          <div
            className={`p-4 rounded-xl border ${
              data.overallRating === 'CRITICAL_ACTION_REQUIRED'
                ? 'bg-red-500/5 border-red-500/20'
                : data.overallRating === 'ATTENTION_NEEDED'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium">Driveability & Overall Health:</span>
              {getStatusBadge(data.overallRating)}
            </div>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              {data.driveabilityAdvice}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-metal" /> Urgency: <strong>{data.urgency}</strong>
              </span>
              <span className="flex items-center gap-1">
                {data.canDrive ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                )}
                Safe to drive: <strong>{data.canDrive ? 'Yes' : 'No (Stop Driving)'}</strong>
              </span>
            </div>
          </div>

          {/* Subsystems Breakdown Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Monitored Systems Breakdown
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.subsystems.map((sub) => (
                <div
                  key={sub.systemKey}
                  className="p-3.5 rounded-xl border border-hairline bg-surface-raised space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{sub.name}</span>
                    {getStatusBadge(sub.status)}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {sub.laymanSummary}
                  </p>
                  {sub.evidence.length > 0 && (
                    <div className="text-[11px] font-mono text-metal">
                      {sub.evidence.join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plain-Language Customer Q&A */}
          <div className="p-4 rounded-xl border border-hairline bg-surface-raised space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-metal" /> Plain-Language Explanation for Owner
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <strong className="block text-text-muted mb-1">What happened?</strong>
                <p className="leading-relaxed">{data.qAndA.whatHappened}</p>
              </div>
              <div>
                <strong className="block text-text-muted mb-1">What needs to be repaired?</strong>
                <p className="leading-relaxed">{data.qAndA.whatNeedsRepair}</p>
              </div>
              <div>
                <strong className="block text-text-muted mb-1">What happens if ignored?</strong>
                <p className="leading-relaxed text-amber-300/90">{data.qAndA.whatHappensIfIgnored}</p>
              </div>
              <div>
                <strong className="block text-text-muted mb-1">Estimated duration & cost:</strong>
                <p className="leading-relaxed">
                  Time: {data.qAndA.estimatedRepairDuration} | Est. Cost: {data.qAndA.estimatedCostRangeMad}
                </p>
              </div>
            </div>
          </div>

          {/* Provenance Badge */}
          <div className="flex flex-wrap items-center justify-between text-xs text-text-muted pt-2 border-t border-hairline">
            <span>
              Evidence basis: <strong>{data.provenance.dtcCount} DTC(s)</strong> (
              {data.provenance.dtcCodes.join(', ') || 'None'})
            </span>
            <span>
              Status: <strong>{data.provenance.confidence}</strong>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
