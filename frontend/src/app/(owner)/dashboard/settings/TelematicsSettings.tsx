"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Satellite,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  PlugZap,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

interface Integration {
  id: string;
  provider: 'MOCK' | 'TRACCAR';
  baseUrl: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'ERROR';
  lastCheckedAt: string | null;
  lastError: string | null;
}

/**
 * Provider options. "Traccar" is a product name and stays untranslated in every
 * locale — it is what the operator sees in their own provider's dashboard, and
 * translating it would break the connection between the two screens. The demo
 * option is a description, not a name, so it is translated.
 */
const PROVIDERS = [
  { value: 'TRACCAR', labelKey: null, hintKey: 'gpsProviderTraccarHint' },
  { value: 'MOCK', labelKey: 'gpsProviderMock', hintKey: 'gpsProviderMockHint' },
] as const;

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

/**
 * GPS provider connection, on the owner Settings page.
 *
 * Credentials are write-only by design: the server never returns them, so
 * this form always starts blank and saving re-sends them in full. That is
 * deliberate — a "•••• (unchanged)" affordance would require the server to
 * confirm what it holds, which is exactly what we don't want it doing.
 */
export function TelematicsSettings() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [form, setForm] = useState({
    provider: 'TRACCAR' as 'TRACCAR' | 'MOCK',
    baseUrl: '',
    username: '',
    password: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await api.get<Integration | null>('/telematics/integration');
      setIntegration(res.data);
      if (res.data) {
        setForm((f) => ({
          ...f,
          provider: res.data!.provider,
          baseUrl: res.data!.baseUrl ?? '',
        }));
      }
    } catch {
      // Not fatal — the section just shows the "connect" form.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload =
        form.provider === 'MOCK'
          ? { provider: 'MOCK' }
          : {
              provider: 'TRACCAR',
              baseUrl: form.baseUrl.trim(),
              username: form.username.trim(),
              password: form.password,
            };
      await api.put('/telematics/integration', payload);
      showToast('success', t('gpsConnectedToast'), t('gpsConnectedToastDesc'));
      setForm((f) => ({ ...f, username: '', password: '' }));
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('gpsCouldNotConnect');
      showToast(
        'danger',
        t('gpsConnectionFailed'),
        Array.isArray(msg) ? msg.join(' ') : String(msg),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await api.post('/telematics/integration/test');
      showToast('success', t('gpsConnectionOk'), t('gpsConnectionOkDesc'));
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('gpsProviderNoResponse');
      showToast(
        'danger',
        t('gpsConnectionFailed'),
        Array.isArray(msg) ? msg.join(' ') : String(msg),
      );
      await load();
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    try {
      await api.delete('/telematics/integration');
      showToast('success', t('gpsDisconnected'), t('gpsDisconnectedDesc'));
      setIntegration(null);
      setForm({ provider: 'TRACCAR', baseUrl: '', username: '', password: '' });
    } catch (err: any) {
      showToast(
        'danger',
        t('gpsCouldNotDisconnect'),
        err?.response?.data?.message || t('gpsTryAgain'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selected = PROVIDERS.find((p) => p.value === form.provider);

  return (
    <Card>
      <CardHeader className="p-0 mb-5 items-start">
        <div>
          <CardTitle>{t('gpsSettingsTitle')}</CardTitle>
          <CardDescription className="mt-1">
            {t('gpsSettingsSubtitle')}
          </CardDescription>
        </div>
        {integration && (
          <Badge variant={integration.status === 'ACTIVE' ? 'outline' : 'destructive'}>
            {integration.status === 'ACTIVE' ? (
              <>
                <CheckCircle2 className="w-3 h-3 me-1" /> {t('gpsConnected')}
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 me-1" /> {integration.status}
              </>
            )}
          </Badge>
        )}
      </CardHeader>

      {integration?.lastError && (
        <div className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-[11px] text-danger leading-relaxed">
            {integration.lastError}
          </p>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-3 mb-5 rounded-xl bg-surface border border-hairline">
        <ShieldCheck className="w-4 h-4 text-text-faint shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          {t.rich('gpsPrivacyNote', {
            b: (chunks) => (
              <strong className="text-foreground">{chunks}</strong>
            ),
          })}
        </p>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-2xl bg-surface animate-pulse" />
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">{t('gpsProvider')}</p>
            <select
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({ ...f, provider: e.target.value as 'TRACCAR' | 'MOCK' }))
              }
              disabled={isSaving}
              className={cn(inputCls, 'appearance-none')}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.labelKey ? t(p.labelKey) : 'Traccar'}
                </option>
              ))}
            </select>
            {selected && (
              <p className="px-1 text-[11px] text-text-faint">
                {t(selected.hintKey)}
              </p>
            )}
          </div>

          {form.provider !== 'MOCK' && (
            <>
              <div className="space-y-1.5">
                <p className="eyebrow px-1">{t('gpsServerUrl')}</p>
                <input
                  value={form.baseUrl}
                  onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                  disabled={isSaving}
                  placeholder="https://gps.your-agency.ma"
                  className={inputCls}
                />
                <p className="px-1 text-[11px] text-text-faint">
                  {t('gpsServerUrlHint')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="eyebrow px-1">{t('gpsUsername')}</p>
                  <input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    disabled={isSaving}
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="eyebrow px-1">{t('gpsPassword')}</p>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={isSaving}
                    autoComplete="new-password"
                    placeholder={integration ? t('gpsReenterToUpdate') : ''}
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="submit" isLoading={isSaving}>
              <PlugZap className="w-4 h-4 me-2" />
              {integration ? t('gpsUpdateConnection') : t('gpsConnect')}
            </Button>
            {integration && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  isLoading={isTesting}
                >
                  <Satellite className="w-4 h-4 me-2" /> {t('gpsTestConnection')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4 me-2" /> {t('gpsDisconnect')}
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
