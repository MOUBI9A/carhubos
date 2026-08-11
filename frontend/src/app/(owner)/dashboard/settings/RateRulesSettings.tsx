"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tags,
  Plus,
  Trash2,
  CalendarRange,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface RateRule {
  id: string;
  name: string;
  kind: 'SEASONAL' | 'DURATION';
  active: boolean;
  priority: number;
  vehicleClass: string | null;
  carId: string | null;
  startDate: string | null;
  endDate: string | null;
  minDays: number | null;
  maxDays: number | null;
  adjustmentType: 'PERCENT' | 'FIXED_DAILY';
  adjustmentValue: number;
}

/**
 * Vehicle classes, mapped to their label keys. The map is the single source
 * for both the dropdown and the badge, so a class can never appear in one and
 * not the other. Keys are literals because next-intl types `t()` against the
 * catalog — a template string would compile away that safety.
 */
const CLASS_LABEL_KEYS = {
  ECONOMY: 'rateClassECONOMY',
  COMPACT: 'rateClassCOMPACT',
  SUV: 'rateClassSUV',
  LUXURY: 'rateClassLUXURY',
  VAN: 'rateClassVAN',
} as const;

const VEHICLE_CLASSES = Object.keys(CLASS_LABEL_KEYS) as Array<
  keyof typeof CLASS_LABEL_KEYS
>;

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

const EMPTY = {
  name: '',
  kind: 'SEASONAL' as 'SEASONAL' | 'DURATION',
  vehicleClass: '',
  startDate: '',
  endDate: '',
  minDays: '',
  maxDays: '',
  adjustmentType: 'PERCENT' as 'PERCENT' | 'FIXED_DAILY',
  adjustmentValue: '',
  priority: '0',
};

type Translate = ReturnType<typeof useTranslations>;

/**
 * Human summary of what a rule actually does, for the list row.
 *
 * Takes `t` rather than reaching for the hook itself — it is called from
 * inside a render helper, and a function that silently requires hook context
 * is a trap for whoever next wants to reuse it (a quote preview, an export).
 *
 * Dates stay as raw ISO slices on purpose: they are shown in a mono tabular
 * font as machine-exact bounds, and localising them to "1 août" would make two
 * rules harder to compare at a glance in the list. The open/closed day ranges
 * are two separate messages rather than one with an interpolated "–7"/"+",
 * because gluing a range fragment into a sentence is not translatable.
 */
function describe(t: Translate, rule: RateRule): string {
  const effect =
    rule.adjustmentType === 'FIXED_DAILY'
      ? t('rateEffectFlat', { value: rule.adjustmentValue })
      : `${rule.adjustmentValue > 0 ? '+' : ''}${rule.adjustmentValue}%`;

  if (rule.kind === 'SEASONAL') {
    return t('rateSummarySeason', {
      effect,
      from: rule.startDate ? rule.startDate.slice(0, 10) : t('rateAnyDate'),
      to: rule.endDate ? rule.endDate.slice(0, 10) : t('rateOnwards'),
    });
  }
  const min = rule.minDays ?? 1;
  return rule.maxDays
    ? t('rateSummaryDurationRange', { effect, min, max: rule.maxDays })
    : t('rateSummaryDurationOpen', { effect, min });
}

/**
 * Vehicle-class label. The stored value stays the enum (ECONOMY, SUV…) — only
 * what the operator reads is translated, so changing a label can never change
 * which cars a rule matches.
 *
 * A class the UI doesn't know falls back to showing the raw value rather than
 * rendering a missing-key error: `vehicleClass` is a plain string column, and
 * a row written before a class was added to this map is a data question, not
 * a reason to break the settings page.
 */
function classLabel(t: Translate, value: string): string {
  const key = CLASS_LABEL_KEYS[value as keyof typeof CLASS_LABEL_KEYS];
  return key ? t(key) : value;
}

/**
 * Rate tiers on the owner Settings page.
 *
 * The explainer at the top isn't decoration: "seasonal applies per day,
 * duration applies once, and rules never stack" is the mental model an
 * operator needs to predict what a customer will be charged. Getting that
 * wrong is how you end up arguing about an invoice.
 */
export function RateRulesSettings() {
  const t = useTranslations('ownerPages');
  const tc = useTranslations('common');
  const { showToast } = useToast();
  const [rules, setRules] = useState<RateRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await api.get<RateRule[]>('/pricing/rules');
      setRules(res.data);
    } catch {
      // Owner-only surface; a failure here just leaves the list empty.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const close = () => {
    setIsOpen(false);
    setForm(EMPTY);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        kind: form.kind,
        priority: Number(form.priority) || 0,
        adjustmentType: form.adjustmentType,
        adjustmentValue: Number(form.adjustmentValue),
        ...(form.vehicleClass ? { vehicleClass: form.vehicleClass } : {}),
      };
      if (form.kind === 'SEASONAL') {
        if (form.startDate) payload.startDate = form.startDate;
        if (form.endDate) payload.endDate = form.endDate;
      } else {
        if (form.minDays) payload.minDays = Number(form.minDays);
        if (form.maxDays) payload.maxDays = Number(form.maxDays);
      }

      await api.post('/pricing/rules', payload);
      showToast('success', t('rateRuleAdded'), t('rateRuleAddedDesc'));
      close();
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('rateCouldNotSave');
      showToast(
        'danger',
        t('rateSaveFailed'),
        Array.isArray(msg) ? msg.join(' ') : String(msg),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rule: RateRule) => {
    try {
      await api.delete(`/pricing/rules/${rule.id}`);
      showToast(
        'success',
        t('rateRuleRemoved'),
        t('rateRuleRemovedDesc', { name: rule.name }),
      );
      await load();
    } catch (err: any) {
      showToast(
        'danger',
        t('rateCouldNotRemove'),
        err?.response?.data?.message || t('rateTryAgain'),
      );
    }
  };

  const seasonal = rules.filter((r) => r.kind === 'SEASONAL');
  const duration = rules.filter((r) => r.kind === 'DURATION');

  const section = (title: string, icon: React.ElementType, list: RateRule[]) => {
    const Icon = icon;
    return (
      <div className="space-y-2">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" /> {title}
        </p>
        {list.length === 0 ? (
          <p className="text-xs text-text-faint px-1">{t('rateNoneYet')}</p>
        ) : (
          list.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-hairline"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {rule.name}
                  {!rule.active && (
                    <span className="ms-2 text-[11px] text-text-faint">
                      {t('rateInactive')}
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-muted font-mono tabular mt-0.5">
                  {describe(t, rule)}
                </p>
              </div>
              {rule.vehicleClass && (
                <Badge variant="outline" className="shrink-0">
                  {classLabel(t, rule.vehicleClass)}
                </Badge>
              )}
              {rule.priority > 0 && (
                <span className="text-[11px] text-text-faint shrink-0">
                  p{rule.priority}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 shrink-0 text-danger"
                onClick={() => handleDelete(rule)}
                aria-label={t('rateRemoveRule', { name: rule.name })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="p-0 mb-5 items-start">
        <div>
          <CardTitle>{t('rateTiers')}</CardTitle>
          <CardDescription className="mt-1">{t('rateTiersSubtitle')}</CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 me-1.5" /> {t('rateAddRule')}
        </Button>
      </CardHeader>

      <div className="flex items-start gap-2.5 p-3 mb-5 rounded-xl bg-surface border border-hairline">
        <Info className="w-4 h-4 text-text-faint shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          {t.rich('rateExplainer', {
            b: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          })}
        </p>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-2xl bg-surface animate-pulse" />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('rateNoRules')}
          description={t('rateNoRulesDesc')}
        />
      ) : (
        <div className="space-y-5">
          {section(t('rateSeasonal'), CalendarRange, seasonal)}
          {section(t('rateDuration'), Clock, duration)}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={t('rateNewRule')}
        description={t('rateNewRuleDesc')}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">{t('rateName')}</p>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('rateNamePlaceholder')}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('rateType')}</p>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value as 'SEASONAL' | 'DURATION' }))
                }
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="SEASONAL">{t('rateTypeSeasonal')}</option>
                <option value="DURATION">{t('rateTypeDuration')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('rateVehicleClass')}</p>
              <select
                value={form.vehicleClass}
                onChange={(e) => setForm((f) => ({ ...f, vehicleClass: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="">{t('rateClassAny')}</option>
                {VEHICLE_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {classLabel(t, c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.kind === 'SEASONAL' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="eyebrow px-1">{t('rateFrom')}</p>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className={cn(inputCls, 'font-mono tabular')}
                />
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow px-1">{t('rateTo')}</p>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className={cn(inputCls, 'font-mono tabular')}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="eyebrow px-1">{t('rateMinDays')}</p>
                <input
                  type="number"
                  min={1}
                  value={form.minDays}
                  onChange={(e) => setForm((f) => ({ ...f, minDays: e.target.value }))}
                  placeholder="7"
                  className={cn(inputCls, 'font-mono tabular')}
                />
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow px-1">{t('rateMaxDays')}</p>
                <input
                  type="number"
                  min={1}
                  value={form.maxDays}
                  onChange={(e) => setForm((f) => ({ ...f, maxDays: e.target.value }))}
                  placeholder={t('rateNoLimit')}
                  className={cn(inputCls, 'font-mono tabular')}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-2">
              <p className="eyebrow px-1">{t('rateEffect')}</p>
              <select
                value={form.adjustmentType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    adjustmentType: e.target.value as 'PERCENT' | 'FIXED_DAILY',
                  }))
                }
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="PERCENT">{t('rateEffectPercent')}</option>
                <option value="FIXED_DAILY">{t('rateEffectFixed')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">
                {form.adjustmentType === 'PERCENT'
                  ? t('ratePercentLabel')
                  : t('rateMadPerDayLabel')}
              </p>
              <input
                type="number"
                step="0.01"
                value={form.adjustmentValue}
                onChange={(e) => setForm((f) => ({ ...f, adjustmentValue: e.target.value }))}
                placeholder={form.adjustmentType === 'PERCENT' ? '25' : '400'}
                className={cn(inputCls, 'font-mono tabular')}
              />
            </div>
          </div>

          {form.adjustmentType === 'PERCENT' && (
            <div className="flex items-start gap-2.5 px-1">
              <AlertTriangle className="w-3.5 h-3.5 text-text-faint shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-faint leading-relaxed">
                {t.rich('rateNegativeHint', {
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={close} disabled={isSaving}>
              {tc('cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={isSaving}
              disabled={!form.name.trim() || form.adjustmentValue === ''}
            >
              {t('rateAddRule')}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
