"use client";

import React, { useCallback, useEffect, useState } from 'react';
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

const VEHICLE_CLASSES = ['ECONOMY', 'COMPACT', 'SUV', 'LUXURY', 'VAN'] as const;

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

/** Human summary of what a rule actually does, for the list row. */
function describe(rule: RateRule): string {
  const effect =
    rule.adjustmentType === 'FIXED_DAILY'
      ? `${rule.adjustmentValue} MAD/day flat`
      : `${rule.adjustmentValue > 0 ? '+' : ''}${rule.adjustmentValue}%`;

  if (rule.kind === 'SEASONAL') {
    const from = rule.startDate ? rule.startDate.slice(0, 10) : 'any date';
    const to = rule.endDate ? rule.endDate.slice(0, 10) : 'onwards';
    return `${effect} · ${from} → ${to}`;
  }
  const min = rule.minDays ?? 1;
  const max = rule.maxDays ? `–${rule.maxDays}` : '+';
  return `${effect} · ${min}${max} days`;
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
      showToast('success', 'Rule added', 'New bookings will price with this rule.');
      close();
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not save the rule.';
      showToast('danger', 'Save failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rule: RateRule) => {
    try {
      await api.delete(`/pricing/rules/${rule.id}`);
      showToast('success', 'Rule removed', `"${rule.name}" no longer affects pricing.`);
      await load();
    } catch (err: any) {
      showToast('danger', 'Could not remove', err?.response?.data?.message || 'Please try again.');
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
          <p className="text-xs text-text-faint px-1">None yet.</p>
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
                    <span className="ms-2 text-[11px] text-text-faint">(inactive)</span>
                  )}
                </p>
                <p className="text-xs text-text-muted font-mono tabular mt-0.5">
                  {describe(rule)}
                </p>
              </div>
              {rule.vehicleClass && (
                <Badge variant="outline" className="shrink-0">
                  {rule.vehicleClass}
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
                aria-label={`Remove ${rule.name}`}
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
          <CardTitle>Rate tiers</CardTitle>
          <CardDescription className="mt-1">
            Move price by season, rental length and vehicle class
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 me-1.5" /> Add rule
        </Button>
      </CardHeader>

      <div className="flex items-start gap-2.5 p-3 mb-5 rounded-xl bg-surface border border-hairline">
        <Info className="w-4 h-4 text-text-faint shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          Seasonal rules are applied <strong className="text-foreground">per day</strong>, so a
          rental crossing a season boundary is split correctly. A duration rule is applied{' '}
          <strong className="text-foreground">once</strong> to the total. When several rules could
          apply to the same day, only <strong className="text-foreground">one</strong> wins
          (highest priority, then the most specific) — they never stack.
        </p>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-2xl bg-surface animate-pulse" />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No rate rules"
          description="Every booking is priced at the vehicle's own daily rate. Add a rule to charge more in peak season or less on long rentals."
        />
      ) : (
        <div className="space-y-5">
          {section('Seasonal', CalendarRange, seasonal)}
          {section('Duration', Clock, duration)}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="New rate rule"
        description="Applies to new bookings only — existing ones keep their agreed price"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Name *</p>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="August peak"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Type *</p>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value as 'SEASONAL' | 'DURATION' }))
                }
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="SEASONAL">Season / dates</option>
                <option value="DURATION">Rental length</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Vehicle class</p>
              <select
                value={form.vehicleClass}
                onChange={(e) => setForm((f) => ({ ...f, vehicleClass: e.target.value }))}
                className={cn(inputCls, 'appearance-none')}
              >
                <option value="">Any class</option>
                {VEHICLE_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.kind === 'SEASONAL' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="eyebrow px-1">From</p>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className={cn(inputCls, 'font-mono tabular')}
                />
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow px-1">To</p>
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
                <p className="eyebrow px-1">Min days</p>
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
                <p className="eyebrow px-1">Max days</p>
                <input
                  type="number"
                  min={1}
                  value={form.maxDays}
                  onChange={(e) => setForm((f) => ({ ...f, maxDays: e.target.value }))}
                  placeholder="no limit"
                  className={cn(inputCls, 'font-mono tabular')}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-2">
              <p className="eyebrow px-1">Effect *</p>
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
                <option value="PERCENT">Adjust by percentage</option>
                <option value="FIXED_DAILY">Set a flat daily rate</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">
                {form.adjustmentType === 'PERCENT' ? '% *' : 'MAD/day *'}
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
                Use a negative number for a discount, e.g. <strong>-10</strong> for 10% off.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={close} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={isSaving}
              disabled={!form.name.trim() || form.adjustmentValue === ''}
            >
              Add rule
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
