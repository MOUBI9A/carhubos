"use client";

import React, { useId } from 'react';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/lib/useFormat';
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
  { label: string; text: string; bg: string; border: string; dot: string; icon: React.ElementType }
> = {
  TRUSTED: { label: 'Trusted', text: 'text-success', bg: 'bg-success/10', border: 'border-success/25', dot: 'bg-success', icon: ShieldCheck },
  CAUTION: { label: 'Caution', text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25', dot: 'bg-warning', icon: ShieldAlert },
  BLACKLISTED: { label: 'Blacklisted', text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', dot: 'bg-danger', icon: ShieldX },
  NEW: { label: 'Unknown profile', text: 'text-text-faint', bg: 'bg-surface', border: 'border-hairline', dot: 'bg-text-faint', icon: ShieldQuestion },
};

function Stars({ score }: { score: number }) {
  const t = useTranslations('riskAssessment');
  const { number } = useFormat();
  return (
    <div className="flex gap-0.5" aria-label={t('rating', { score: number(score, { maximumFractionDigits: 1 }) })}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('w-3.5 h-3.5', i < Math.round(score) ? 'text-warning fill-warning' : 'text-text-faint')}
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
  const t = useTranslations('riskAssessment');
  const { number } = useFormat();
  const overrideId = useId();
  const label = (value: string) => {
    const known = (['TRUSTED', 'CAUTION', 'BLACKLISTED', 'NEW', 'UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'PERFECT_RENTER', 'EARLY_RETURN', 'POLITE', 'REPEAT_CLIENT', 'CLEAN_RETURN', 'LATE_RETURN', 'SMOKED_IN_CAR', 'DIRTY_INTERIOR', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'AGGRESSIVE_DRIVING', 'UNPAID_DAMAGE', 'FRAUDULENT_DOCUMENTS'] as const).find((entry) => entry === value);
    return known ? t(known) : value;
  };
  if (isLoading) {
    return (
      <div className="glass rounded-3xl p-5 border border-hairline flex items-center gap-3 animate-pulse">
        <div className="w-11 h-11 rounded-2xl bg-surface-raised" />
        <div className="space-y-2">
          <div className="h-2.5 w-32 bg-surface-raised rounded" />
          <div className="h-2 w-24 bg-surface-raised rounded" />
        </div>
        <span className="ms-auto eyebrow">{t('loading')}</span>
      </div>
    );
  }
  if (isError || !assessment) {
    return (
      <div className="glass rounded-3xl p-4 border border-hairline eyebrow">
        {t('unavailable')}
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
      className={cn('rounded-3xl p-5 border space-y-4 bg-surface', m.border)}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center border', m.bg, m.border, m.text)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow">{t('network')}</p>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{t('title')}</h3>
        </div>
        <span className={cn('ms-auto inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border', m.bg, m.text, m.border)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
          {t(assessment.status)}
        </span>
      </div>

      {/* Identity line */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono tabular text-[11px] text-text-muted bg-surface-raised border border-hairline rounded-lg px-2.5 py-1">
          {assessment.identity.masked}
        </span>
        <span className="text-[11px] font-medium text-text-faint">
          {assessment.status === 'NEW'
            ? t('noMatch')
            : t('agencyCount', { count: number(assessment.agencyCount) })}
        </span>
      </div>

      {/* Blacklist banner */}
      {assessment.status === 'BLACKLISTED' && assessment.flags[0] && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4" role="alert">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4 className="text-[13px] font-semibold text-danger">
              {t('activeFlag', { reason: label(assessment.flags[0].reason) })}
            </h4>
            <span className="eyebrow text-danger px-2 py-0.5 rounded border border-danger/30 bg-danger/10">
              {label(assessment.flags[0].severity)}
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">{assessment.flags[0].details}</p>
          <div className="flex gap-3 mt-2 flex-wrap eyebrow">
            <span>{t('reportedBy', { name: assessment.flags[0].agencyName })}{assessment.flags[0].agencyCity ? ` · ${assessment.flags[0].agencyCity}` : ''}</span>
            {assessment.flags[0].evidenceCount > 0 && <span className="text-danger">{t('evidence', { count: number(assessment.flags[0].evidenceCount) })}</span>}
          </div>
        </div>
      )}

      {/* Score hero OR new-profile empty state */}
      {assessment.status === 'NEW' ? (
        <div className="rounded-2xl bg-surface-raised border border-hairline p-5 text-center">
          <p className="text-xs font-semibold text-foreground">{t('noHistory')}</p>
          <p className="text-[11px] text-text-faint mt-1.5 max-w-[34ch] mx-auto leading-relaxed">{t('newRecommendation')}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-raised border border-hairline px-5 py-4">
          <div>
            <div className="text-5xl font-semibold text-foreground leading-none tracking-tight font-mono tabular">
              {number(assessment.globalScore, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-base text-text-faint font-medium">/5</span>
            </div>
            <div className="mt-2"><Stars score={assessment.globalScore} /></div>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border', m.bg, m.text, m.border)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
            {label(assessment.riskLevel)}
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <Metric icon={MessageSquare} label={t('reviews')} value={number(assessment.reviewCount)} />
        <Metric icon={Users} label={t('agencies')} value={number(assessment.agencyCount)} />
        <Metric icon={Clock} label={t('flags')} value={number(assessment.activeFlagCount)} danger={assessment.activeFlagCount > 0} />
      </div>

      {/* Tags */}
      {assessment.tags.length > 0 && (
        <div>
          <p className="eyebrow mb-2">{t('tags')}</p>
          <div className="flex flex-wrap gap-1.5">
            {assessment.tags.map((t) => (
              <span
                key={t.tag}
                className={cn(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md border font-mono tabular',
                  t.sentiment === 'pos'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-danger/10 text-danger border-danger/20',
                )}
              >
                {label(t.tag)} ×{number(t.count)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* History strip */}
      {assessment.history.length > 0 && (
        <div>
          <p className="eyebrow mb-2">{t('recentRentals')}</p>
          <div className="flex gap-1" role="img" aria-label={t('rentalHistory', { history: assessment.history.map((status) => t(status)).join(' · ') })}>
            {assessment.history.map((h, i) => (
              <span
                key={i}
                className={cn(
                  'h-3.5 flex-1 rounded',
                  h === 'good' ? 'bg-success/60' : h === 'warn' ? 'bg-warning/60' : 'bg-danger/60',
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Latest review */}
      {assessment.latestReview && (
        <div className="rounded-2xl bg-surface-raised border border-hairline p-3.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="eyebrow">
              {assessment.latestReview.agencyName}{assessment.latestReview.agencyCity ? ` · ${assessment.latestReview.agencyCity}` : ''}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <b className="text-[11px] font-semibold text-foreground">{number(assessment.latestReview.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
            </div>
          </div>
          {assessment.latestReview.comment && (
            <p className="text-[11px] text-text-muted leading-relaxed">“{assessment.latestReview.comment}”</p>
          )}
        </div>
      )}

      {/* Override box for blocked bookings */}
      {assessment.blocked && (
        <div className="rounded-2xl bg-surface border border-dashed border-danger/35 p-3.5">
          <label htmlFor={overrideId} className="eyebrow text-danger mb-2 block">
            {t('overrideRequired')}
          </label>
          <input
            id={overrideId}
            type="text"
            value={overrideReason}
            onChange={(e) => onOverrideChange(e.target.value)}
            placeholder={t('overridePlaceholder')}
            className="w-full bg-surface-raised border border-hairline rounded-xl px-3 py-2.5 text-xs font-medium text-foreground outline-none focus:border-danger transition-colors placeholder:text-text-faint"
          />
          <p className="text-[11px] text-text-faint mt-2 leading-relaxed">
            {t('overrideBody')}
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
    <div className="rounded-xl bg-surface-raised border border-hairline px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-faint">
        <Icon className="w-3 h-3" />
        <span className="eyebrow">{label}</span>
      </div>
      <b className={cn('block text-lg font-semibold mt-1 font-mono tabular', danger ? 'text-danger' : 'text-foreground')}>{value}</b>
    </div>
  );
}
