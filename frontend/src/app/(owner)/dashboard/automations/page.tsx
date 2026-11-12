"use client";

import { useTranslations } from 'next-intl';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { AgencyImage } from '@/components/ui/AgencyImage';
import {
  Zap,
  Plus,
  ChevronRight,
  Activity,
  Loader2,
  RefreshCw,
  History,
  Bell,
  Wrench,
  DollarSign,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  type: 'SYSTEM' | 'MAINTENANCE' | 'CRM' | 'FINANCE' | 'CUSTOM';
}

const TYPE_ICON: Record<string, React.ElementType> = {
  SYSTEM: Shield,
  MAINTENANCE: Wrench,
  CRM: Bell,
  FINANCE: DollarSign,
};

// Show only trigger/action pairs already connected to the safe task-only
// dispatcher. Financial, messaging and vehicle-control actions are withheld.
const TRIGGERS = ['DOCUMENT_EXPIRING_7D', 'RETURN_OVERDUE_2H'];
const ACTIONS = ['CREATE_MAINTENANCE_TASK'];

function apiErrorMessage(err: unknown, fallback: string): string {
  const msg =
    (err as any)?.response?.data?.message ||
    (err as any)?.message ||
    fallback;
  return Array.isArray(msg) ? msg.join(' ') : String(msg);
}

export default function AutomationHub() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [customRules, setCustomRules] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ruleLoadError, setRuleLoadError] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAutomations = useCallback(async () => {
    try {
      setIsLoading(true);
      setRuleLoadError(false);
      const res = await api.get('/automations');
      // `type` is a client-only icon-grouping concept the backend doesn't
      // store (see handleCreateRule) — every rule made through this UI is
      // CRM-triggered today, so default the fetched (real) rows the same way
      // rather than rendering `undefined` in the "Type" column.
      setCustomRules(res.data.map((r: Automation) => ({ ...r, type: r.type ?? 'CUSTOM' })));
    } catch (err) {
      setRuleLoadError(true);
      setCustomRules([]);
      showToast('danger', 'Could Not Load Rules', apiErrorMessage(err, 'Failed to fetch your automation rules.'));
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const trigger = formData.get('trigger') as string;
    const action = formData.get('action') as string;

    try {
      // `type` is a client-only icon-grouping concept — AutomationRule has no
      // such column, and the global ValidationPipe's forbidNonWhitelisted
      // rejects it with 400 if sent, so it must never go on the wire.
      const res = await api.post('/automations', { name, trigger, action, isActive: false });
      setCustomRules(prev => [{ ...res.data, type: 'CUSTOM' }, ...prev]);
      setIsAddRuleModalOpen(false);
      showToast('success', 'Rule saved', 'New rule is paused. Review and enable it explicitly before scheduled task creation.');
    } catch (err) {
      showToast('danger', 'Could Not Create Rule', apiErrorMessage(err, 'The backend rejected this rule.'));
    }
  };

  const toggleRule = async (rule: Automation) => {
    setTogglingId(rule.id);
    const newStatus = !rule.isActive;
    try {
      await api.patch(`/automations/${rule.id}`, { isActive: newStatus });
      setCustomRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newStatus } : r));
      showToast('info', 'Status Updated', `Rule "${rule.name}" ${newStatus ? 'activated' : 'paused'}.`);
    } catch (err) {
      showToast('danger', 'Update Failed', apiErrorMessage(err, `Could not update "${rule.name}".`));
    } finally {
      setTogglingId(null);
    }
  };

  const activeCount = customRules.filter(r => r.isActive).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('automationHub')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            {t('noCodeRules')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchAutomations}>
            <RefreshCw className="w-4 h-4 me-2" />
            {t('refresh')}
          </Button>
          <Button onClick={() => setIsAddRuleModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t('newAutomationRule')}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Canvas */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Platform checks</h2>
              <p className="text-sm text-text-muted">
                Document-expiry and overdue-return checks are implemented in the server scheduler.
                Their real execution history is not yet measured here; the figures below describe
                only your agency&apos;s saved rule definitions.
              </p>
              <p className="text-xs text-text-muted">
                Only maintenance-task creation is available for new rules. WhatsApp sends,
                payments, penalties and vehicle-control actions are not available in this builder.
              </p>
            </div>
          </Card>

          {/* Custom rules */}
          <CardHeader className="px-0 pt-4">
            <CardTitle>{t('customRules')}</CardTitle>
          </CardHeader>

          {ruleLoadError && !isLoading ? (
            <div role="alert">
              <Card>
                Unable to load saved agency rules. Counts are unavailable until the connection is restored.
              </Card>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : customRules.length === 0 ? (
            <Card className="flex flex-col items-center gap-5 py-14 text-center">
              <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
              <div>
                <p className="font-medium text-foreground">{t('noCustomRulesYet')}</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
                  {t('buildRuleToAutomate')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsAddRuleModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 me-2" />
                {t('createYourFirstRule')}
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {customRules.map((rule) => {
                const Icon = TYPE_ICON[rule.type] || Zap;
                return (
                  <Card key={rule.id} className={cn('transition-colors', !rule.isActive && 'opacity-70')}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn('w-11 h-11 rounded-xl border border-hairline flex items-center justify-center shrink-0', rule.isActive ? 'bg-surface-raised text-foreground' : 'bg-surface text-text-faint')}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn('text-sm font-semibold', rule.isActive ? 'text-foreground' : 'text-text-muted')}>
                              {rule.name}
                            </h4>
                            <Badge variant={rule.isActive ? 'outline' : 'secondary'} className="gap-1.5">
                              <span className={cn('w-1.5 h-1.5 rounded-full', rule.isActive ? 'bg-success' : 'bg-text-faint')} aria-hidden />
                              {rule.isActive ? t('active') : t('paused')}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted flex-wrap">
                            <span>If {rule.trigger.replace(/_/g, ' ').toLowerCase()}</span>
                            <ChevronRight className="w-3 h-3 text-text-faint shrink-0" />
                            <span className={cn('font-medium', rule.isActive ? 'text-foreground' : 'text-text-muted')}>{rule.action.replace(/_/g, ' ').toLowerCase()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0 border-t border-hairline pt-4 md:border-t-0 md:border-s md:pt-0 md:ps-6">
                        <div className="text-end">
                          <p className="eyebrow">{t('type')}</p>
                          <p className="text-xs font-medium text-text-muted">{rule.type}</p>
                        </div>
                        <button
                          onClick={() => toggleRule(rule)}
                          role="switch"
                          aria-label={`Activate rule ${rule.name}`}
                          aria-checked={rule.isActive}
                          disabled={togglingId === rule.id}
                          className={cn(
                            'w-10 h-5 rounded-full relative border transition-all disabled:opacity-50',
                            rule.isActive ? 'bg-primary/20 border-primary' : 'bg-surface border-hairline'
                          )}
                        >
                          {togglingId === rule.id
                            ? <Loader2 className="absolute inset-0 m-auto w-3 h-3 animate-spin text-text-faint" />
                            : <div className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm', rule.isActive ? 'end-0.5 bg-primary' : 'start-0.5 bg-text-faint')} />
                          }
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8 pt-10">
          <Card>
            <CardHeader>
              <CardTitle>Saved rule definitions</CardTitle>
            </CardHeader>
            <div className="space-y-6">
              {[
                { label: t('activeRules'), value: ruleLoadError || isLoading ? '—' : String(activeCount), icon: Activity },
                { label: 'Saved agency rules', value: ruleLoadError || isLoading ? '—' : String(customRules.length), icon: History },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-surface-raised flex items-center justify-center border border-hairline">
                    <stat.icon className="w-4 h-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="eyebrow">{stat.label}</p>
                    <p className="mt-0.5 text-lg font-semibold font-mono tabular text-foreground">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="eyebrow mb-3">{t('whyAutomate')}</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Execution counts, delivery outcomes and health uptime are not currently
              recorded for this screen. Enable new rules only after reviewing their
              safe, task-only behavior. No external messages or vehicle commands are
              offered by this builder.
            </p>
          </Card>
        </div>
      </div>

      {/* New rule modal */}
      <Modal
        isOpen={isAddRuleModalOpen}
        onClose={() => setIsAddRuleModalOpen(false)}
        title={t('newAutomationRule')}
        description={t('automateNoCodeRequired')}
      >
        <form className="space-y-6" onSubmit={handleCreateRule}>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">{t('ruleName')}</p>
            <input
              name="name"
              required
              className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              placeholder={t('exampleFuelPenalty')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 p-5 rounded-2xl border border-hairline bg-surface">
              <p className="eyebrow">{t('ifTrigger')}</p>
              <select name="trigger" className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                {TRIGGERS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 p-5 rounded-2xl border border-hairline bg-surface">
              <p className="eyebrow">{t('thenAction')}</p>
              <select name="action" className="w-full bg-background border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ').toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-hairline bg-surface flex items-center gap-3">
            <History className="w-4 h-4 text-text-faint shrink-0" />
            <p className="text-xs text-text-muted">New rules are saved paused. Only explicitly enabled task actions run on connected triggers.</p>
          </div>
          <Button type="submit" className="w-full py-4">
            {t('createRule')}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
