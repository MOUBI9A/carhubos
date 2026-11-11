'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, Car, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useFormat } from '@/lib/useFormat';
import { useToast } from '@/lib/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { useDiagnostics } from './useDiagnostics';
import { DiagnosticSessionView } from './DiagnosticSessionView';
import { DiagnosticError, diagnosticInput } from './DiagnosticFeedback';

export function DiagnosticsWorkspace() {
  const t = useTranslations('diagnostics');
  const { dateTime } = useFormat();
  const { showToast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const diagnostics = useDiagnostics(sessionId);
  const { access, capabilities, canView, vehicles, sessions, scenarios, session, createVehicle, createSession } = diagnostics;
  const canPerform = capabilities.includes('diagnostics.perform');

  const addVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const created = await createVehicle.mutateAsync({
        brand: String(fields.get('brand')).trim(),
        model: String(fields.get('model')).trim(),
        ...(fields.get('vin') ? { vin: String(fields.get('vin')).trim().toUpperCase() } : {}),
        ...(fields.get('year') ? { year: Number(fields.get('year')) } : {}),
      });
      setVehicleId(created.id);
      form.reset();
      showToast('success', t('saved'), t('vehicleAdded'));
    } catch { /* The mutation error stays beside the form. */ }
  };
  const addSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const symptoms = String(fields.get('symptoms') ?? '').trim();
    try {
      const created = await createSession.mutateAsync({ vehicleId, ...(symptoms ? { symptoms } : {}) });
      setSessionId(created.id);
      form.reset();
      showToast('success', t('saved'), t('sessionAdded'));
    } catch { /* The mutation error stays beside the form. */ }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow text-metal">{t('eyebrow')}</p><h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">{t('title')}</h1><p className="mt-2 text-sm text-text-muted max-w-2xl">{t('description')}</p></div>
        <Button variant="outline" onClick={() => { void diagnostics.retry(); }} disabled={access.isFetching}><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('refresh')}</Button>
      </header>
      <div className="rounded-2xl border border-metal/25 bg-metal/5 p-4 flex gap-3 text-sm">
        <ShieldCheck aria-hidden="true" className="h-5 w-5 text-metal shrink-0" />
        <div><p className="font-medium">{t('honestTitle')}</p><p className="mt-1 text-text-muted leading-relaxed">{t('honestDescription')}</p></div>
      </div>
      {access.isPending && <p role="status" className="text-text-muted animate-pulse">{t('loadingAccess')}</p>}
      {access.isError && <DiagnosticError error={access.error} onRetry={() => { void access.refetch(); }} />}
      {access.isSuccess && !canView && <Card><h2 className="font-semibold">{t('permissionTitle')}</h2><p className="mt-2 text-sm text-text-muted">{t('permissionDescription')}</p></Card>}
      {canView && (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5 min-w-0" aria-label={t('sessions')}>
            {canPerform && <Card className="space-y-5">
              <h2 className="font-semibold flex items-center gap-2"><Plus aria-hidden="true" className="h-4 w-4" />{t('newSession')}</h2>
              {vehicles.isPending ? <p role="status" className="text-sm text-text-muted">{t('loadingVehicles')}</p> : vehicles.isError ? <DiagnosticError error={vehicles.error} onRetry={() => { void vehicles.refetch(); }} /> : (
                <form onSubmit={(event) => { void addSession(event); }} className="space-y-3">
                  <label className="block text-sm" htmlFor="diagnostic-vehicle">{t('vehicle')}</label>
                  <select id="diagnostic-vehicle" className={diagnosticInput} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} required disabled={createSession.isPending}>
                    <option value="">{t('chooseVehicle')}</option>
                    {vehicles.data?.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model}{vehicle.vin ? ` · ${vehicle.vin}` : ''}</option>)}
                  </select>
                  {!vehicles.data?.length && <p className="text-sm text-text-muted">{t('noVehicles')}</p>}
                  <label className="block text-sm" htmlFor="diagnostic-symptoms">{t('symptoms')}</label>
                  <textarea id="diagnostic-symptoms" name="symptoms" rows={3} maxLength={2000} className={diagnosticInput} disabled={createSession.isPending} />
                  {createSession.isError && <DiagnosticError error={createSession.error} />}
                  <Button type="submit" className="w-full" disabled={!vehicleId || createSession.isPending}>{createSession.isPending ? t('saving') : t('createSession')}</Button>
                </form>
              )}
              <details className="border-t border-hairline pt-4">
                <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary rounded">{t('addVehicle')}</summary>
                <p className="mt-3 text-xs text-text-muted">{t('vehicleSeparate')}</p>
                <form onSubmit={(event) => { void addVehicle(event); }} className="mt-3 space-y-3">
                  <label className="block text-sm" htmlFor="diagnostic-brand">{t('brand')}</label><input id="diagnostic-brand" name="brand" required maxLength={80} className={diagnosticInput} />
                  <label className="block text-sm" htmlFor="diagnostic-model">{t('model')}</label><input id="diagnostic-model" name="model" required maxLength={80} className={diagnosticInput} />
                  <label className="block text-sm" htmlFor="diagnostic-year">{t('year')}</label><input id="diagnostic-year" name="year" type="number" min={1886} max={new Date().getFullYear() + 2} className={diagnosticInput} />
                  <label className="block text-sm" htmlFor="diagnostic-vin">{t('vin')}</label><input id="diagnostic-vin" name="vin" minLength={17} maxLength={17} pattern="[A-HJ-NPR-Za-hj-npr-z0-9]{17}" className={diagnosticInput} dir="ltr" />
                  {createVehicle.isError && <DiagnosticError error={createVehicle.error} />}
                  <Button type="submit" variant="outline" className="w-full" disabled={createVehicle.isPending}>{createVehicle.isPending ? t('saving') : t('saveVehicle')}</Button>
                </form>
              </details>
            </Card>}
            {!canPerform && <p className="text-sm text-text-muted rounded-xl border border-hairline p-4">{t('viewOnly')}</p>}
            <Card padding="sm" className="space-y-3">
              <h2 className="font-semibold">{t('sessions')}</h2><p className="text-xs text-text-muted">{t('recentLimit')}</p>
              {sessions.isPending && <p role="status" className="text-sm text-text-muted">{t('loadingSessions')}</p>}
              {sessions.isError && <DiagnosticError error={sessions.error} onRetry={() => { void sessions.refetch(); }} />}
              {sessions.isSuccess && sessions.data.length === 0 && <p className="py-4 text-sm text-text-muted">{t('noSessions')}</p>}
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {sessions.data?.map((item) => <li key={item.id}><button type="button" onClick={() => { diagnostics.updateSession.reset(); setSessionId(item.id); }} aria-pressed={sessionId === item.id} className={cn('w-full rounded-xl p-3 text-start border focus-visible:outline-2 focus-visible:outline-primary transition-colors', sessionId === item.id ? 'border-primary/40 bg-primary/10' : 'border-hairline hover:bg-surface-raised')}>
                  <span className="block font-medium text-sm">{item.vehicle.brand} {item.vehicle.model}</span>
                  <span className="block mt-1 text-xs text-text-muted">{dateTime(item.createdAt)}</span>
                  <span className="block mt-1 text-xs text-text-muted">{t(`statuses.${item.status}`)} · {t(item.source === 'SIMULATOR' ? 'simulated' : 'imported')}</span>
                </button></li>)}
              </ul>
            </Card>
          </aside>
          <section aria-label={t('workspace')} className="min-w-0">
            {!sessionId && <Card className="py-16 text-center"><Car aria-hidden="true" className="mx-auto h-10 w-10 text-metal" /><h2 className="mt-5 text-lg font-semibold">{t('selectSession')}</h2><p className="mt-2 text-sm text-text-muted max-w-md mx-auto">{t('selectSessionDescription')}</p></Card>}
            {sessionId && session.isPending && <Card><p role="status" className="flex items-center gap-2 text-text-muted animate-pulse"><Activity aria-hidden="true" className="h-4 w-4" />{t('loadingEvidence')}</p></Card>}
            {sessionId && session.isError && <DiagnosticError error={session.error} onRetry={() => { void session.refetch(); }} />}
            {sessionId && session.isSuccess && <DiagnosticSessionView key={sessionId} session={session.data} scenarios={scenarios.data ?? []} scenariosError={scenarios.error} retryScenarios={() => { void scenarios.refetch(); }} capabilities={capabilities} mutation={diagnostics.updateSession} />}
          </section>
        </div>
      )}
    </div>
  );
}
