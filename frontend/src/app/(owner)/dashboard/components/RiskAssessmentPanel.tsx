"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Star,
  Users,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskAssessment, RiskStatus } from '../useCustomerRisk';

const STATUS_META: Record<
  RiskStatus,
  { label: string; text: string; bg: string; border: string; icon: React.ElementType }
> = {
  TRUSTED: { label: 'Trusted', text: 'text-success', bg: 'bg-success/10', border: 'border-success/25', icon: ShieldCheck },
  CAUTION: { label: 'Caution', text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/25', icon: ShieldAlert },
  BLACKLISTED: { label: 'Blacklisted', text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', icon: ShieldX },
  NEW: { label: 'Unknown Profile', text: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10', icon: ShieldQuestion },
};

const TAG_LABELS: Record<string, string> = {
  PERFECT_RENTER: 'Perfect Renter',
  EARLY_RETURN: 'Early Return',
  POLITE: 'Polite',
  REPEAT_CLIENT: 'Repeat Client',
  CLEAN_RETURN: 'Clean Return',
  LATE_RETURN: 'Late Return',
  SMOKED_IN_CAR: 'Smoked in Car',
  DIRTY_INTERIOR: 'Dirty Interior',
  MINOR_DAMAGE: 'Minor Damage',
  MAJOR_DAMAGE: 'Major Damage',
  AGGRESSIVE_DRIVING: 'Aggressive Driving',
  UNPAID_DAMAGE: 'Unpaid Damage',
  FRAUDULENT_DOCUMENTS: 'Fraudulent Documents',
};
const label = (t: string) => TAG_LABELS[t] ?? t.replace(/_/g, ' ');

function Stars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${score} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('w-3.5 h-3.5', i < Math.round(score) ? 'text-amber-500 fill-amber-500' : 'text-white/15')}
        />
      ))}
    </div>
  );
}

export function RiskAssessmentPanel({
  assessment,
  isLoading,
  isError,
  overrideReason,
  onOverrideChange,
}: {
  assessment?: RiskAssessment;
  isLoading: boolean;
  isError?: boolean;
  overrideReason: string;
  onOverrideChange: (v: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-3 animate-pulse">
        <div className="w-11 h-11 rounded-2xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-2.5 w-32 bg-white/5 rounded" />
          <div className="h-2 w-24 bg-white/5 rounded" />
        </div>
        <span className="ml-auto text-[9px] font-black text-white/30 uppercase tracking-widest">Querying Trust Network…</span>
      </div>
    );
  }
  if (isError || !assessment) {
    return (
      <div className="glass rounded-3xl p-4 border border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
        Trust Network unavailable
      </div>
    );
  }

  const m = STATUS_META[assessment.status];
  const Icon = m.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('rounded-3xl p-5 border space-y-4 bg-white/[0.02]', m.border)}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center border', m.bg, m.border, m.text)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Trust Network</p>
          <h3 className="text-sm font-black text-white uppercase tracking-tight">Client Risk Assessment</h3>
        </div>
        <span className={cn('ml-auto text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border', m.bg, m.text, m.border)}>
          {m.label}
        </span>
      </div>

      {/* Identity line */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black tracking-widest text-white/60 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 tabular-nums">
          {assessment.identity.masked}
        </span>
        <span className="text-[10px] font-bold text-white/30">
          {assessment.status === 'NEW'
            ? 'No network match — new identity'
            : `Matched across ${assessment.agencyCount} ${assessment.agencyCount === 1 ? 'agency' : 'agencies'}`}
        </span>
      </div>

      {/* Blacklist banner */}
      {assessment.status === 'BLACKLISTED' && assessment.flags[0] && (
        <div className="rounded-2xl border border-danger/30 bg-danger/[0.07] p-4" role="alert">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4 className="text-[11px] font-black uppercase tracking-wide text-red-300">
              ⛔ Active Flag — {label(assessment.flags[0].reason)}
            </h4>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-danger/30 bg-danger/10 text-danger">
              {assessment.flags[0].severity}
            </span>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">{assessment.flags[0].details}</p>
          <div className="flex gap-3 mt-2 flex-wrap text-[9px] font-black uppercase tracking-widest text-white/40">
            <span>Reported by {assessment.flags[0].agencyName}{assessment.flags[0].agencyCity ? ` · ${assessment.flags[0].agencyCity}` : ''}</span>
            {assessment.flags[0].evidenceCount > 0 && <span className="text-danger">Evidence ({assessment.flags[0].evidenceCount})</span>}
          </div>
        </div>
      )}

      {/* Score hero OR new-profile empty state */}
      {assessment.status === 'NEW' ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 text-center">
          <p className="text-xs font-black text-white/70 uppercase tracking-wide">No Network History</p>
          <p className="text-[11px] text-white/40 mt-1.5 max-w-[34ch] mx-auto leading-relaxed">{assessment.recommendation}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] border border-white/10 px-5 py-4">
          <div>
            <div className="text-5xl font-black text-white leading-none tracking-tighter tabular-nums">
              {assessment.globalScore.toFixed(1)}
              <span className="text-base text-white/30 font-bold">/5</span>
            </div>
            <div className="mt-2"><Stars score={assessment.globalScore} /></div>
          </div>
          <span className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border', m.bg, m.text, m.border)}>
            {assessment.riskLevel}
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <Metric icon={MessageSquare} label="Reviews" value={String(assessment.reviewCount)} />
        <Metric icon={Users} label="Agencies" value={String(assessment.agencyCount)} />
        <Metric icon={Clock} label="Flags" value={String(assessment.activeFlagCount)} danger={assessment.activeFlagCount > 0} />
      </div>

      {/* Tags */}
      {assessment.tags.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Network Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {assessment.tags.map((t) => (
              <span
                key={t.tag}
                className={cn(
                  'text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md border tabular-nums',
                  t.sentiment === 'pos'
                    ? 'bg-success/[0.08] text-success border-success/20'
                    : 'bg-danger/[0.08] text-red-300 border-danger/20',
                )}
              >
                {label(t.tag)} ×{t.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* History strip */}
      {assessment.history.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Recent Network Rentals</p>
          <div className="flex gap-1" role="img" aria-label="Rental history">
            {assessment.history.map((h, i) => (
              <span
                key={i}
                className={cn(
                  'h-3.5 flex-1 rounded',
                  h === 'good' ? 'bg-success/60' : h === 'warn' ? 'bg-amber-500/60' : 'bg-danger/60',
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Latest review */}
      {assessment.latestReview && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
              {assessment.latestReview.agencyName}{assessment.latestReview.agencyCity ? ` · ${assessment.latestReview.agencyCity}` : ''}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <b className="text-[11px] text-white/70">{assessment.latestReview.rating.toFixed(1)}</b>
            </div>
          </div>
          {assessment.latestReview.comment && (
            <p className="text-[11px] text-white/55 leading-relaxed">“{assessment.latestReview.comment}”</p>
          )}
        </div>
      )}

      {/* Override box for blocked bookings */}
      {assessment.blocked && (
        <div className="rounded-2xl bg-white/[0.02] border border-dashed border-danger/35 p-3.5">
          <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-red-300 mb-2">
            Manager Override Required
          </label>
          <input
            type="text"
            value={overrideReason}
            onChange={(e) => onOverrideChange(e.target.value)}
            placeholder="Reason — written to the Audit Trail…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-danger/50 transition-colors placeholder:text-white/25"
          />
          <p className="text-[9px] text-white/30 mt-2 leading-relaxed">
            Booking is hard-locked server-side. Providing a reason unlocks it and records who bypassed the flag.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/40">
        <Icon className="w-3 h-3" />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <b className={cn('block text-lg font-black mt-1 tabular-nums', danger ? 'text-danger' : 'text-white')}>{value}</b>
    </div>
  );
}
