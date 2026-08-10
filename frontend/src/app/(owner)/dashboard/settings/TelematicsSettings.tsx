"use client";

import React, { useCallback, useEffect, useState } from 'react';
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

const PROVIDERS = [
  {
    value: 'TRACCAR',
    label: 'Traccar',
    hint: 'Open-source, self-hosted. Works with most generic GPS trackers.',
  },
  {
    value: 'MOCK',
    label: 'Demo (simulated)',
    hint: 'No real hardware — simulated positions for trying the feature out.',
  },
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
      showToast(
        'success',
        'GPS provider connected',
        'Credentials were verified against your provider and stored encrypted.',
      );
      setForm((f) => ({ ...f, username: '', password: '' }));
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not connect.';
      showToast(
        'danger',
        'Connection failed',
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
      showToast('success', 'Connection OK', 'Your GPS provider responded normally.');
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'The provider did not respond.';
      showToast('danger', 'Connection failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
      await load();
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    try {
      await api.delete('/telematics/integration');
      showToast('success', 'Disconnected', 'The GPS provider was removed.');
      setIntegration(null);
      setForm({ provider: 'TRACCAR', baseUrl: '', username: '', password: '' });
    } catch (err: any) {
      showToast('danger', 'Could not disconnect', err?.response?.data?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selected = PROVIDERS.find((p) => p.value === form.provider);

  return (
    <Card>
      <CardHeader className="p-0 mb-5 items-start">
        <div>
          <CardTitle>GPS &amp; tracking</CardTitle>
          <CardDescription className="mt-1">
            Connect your own GPS account to locate vehicles and use the remote
            immobilizer
          </CardDescription>
        </div>
        {integration && (
          <Badge variant={integration.status === 'ACTIVE' ? 'outline' : 'destructive'}>
            {integration.status === 'ACTIVE' ? (
              <>
                <CheckCircle2 className="w-3 h-3 me-1" /> Connected
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
          Fider connects to <strong className="text-foreground">your</strong> GPS
          account — we never resell trackers and never hold your position history.
          Credentials are encrypted before they are stored and are never shown
          again after saving.
        </p>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-2xl bg-surface animate-pulse" />
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Provider</p>
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
                  {p.label}
                </option>
              ))}
            </select>
            {selected && (
              <p className="px-1 text-[11px] text-text-faint">{selected.hint}</p>
            )}
          </div>

          {form.provider !== 'MOCK' && (
            <>
              <div className="space-y-1.5">
                <p className="eyebrow px-1">Server URL *</p>
                <input
                  value={form.baseUrl}
                  onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                  disabled={isSaving}
                  placeholder="https://gps.your-agency.ma"
                  className={inputCls}
                />
                <p className="px-1 text-[11px] text-text-faint">
                  Must be an https address reachable from the internet.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="eyebrow px-1">Username / email *</p>
                  <input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    disabled={isSaving}
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="eyebrow px-1">Password / API key *</p>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={isSaving}
                    autoComplete="new-password"
                    placeholder={integration ? 'Re-enter to update' : ''}
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="submit" isLoading={isSaving}>
              <PlugZap className="w-4 h-4 me-2" />
              {integration ? 'Update connection' : 'Connect'}
            </Button>
            {integration && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  isLoading={isTesting}
                >
                  <Satellite className="w-4 h-4 me-2" /> Test connection
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4 me-2" /> Disconnect
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
