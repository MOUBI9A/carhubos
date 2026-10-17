'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { UseMutationResult } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Activity, CheckCircle2, Download, FileText, FlaskConical, Play, Plus, Trash2, Wrench } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useFormat } from '@/lib/useFormat';
import { useToast } from '@/lib/contexts/ToastContext';
import { DiagnosticError, diagnosticInput } from './DiagnosticFeedback';
import type { DiagnosticAction, DiagnosticFinding, DiagnosticScenario, DiagnosticSession, EstimateItem } from './types';
import { CustomerVehicleHealthCard } from './CustomerVehicleHealthCard';
import { PartsCatalogMatcher, type PartItem } from './PartsCatalogMatcher';
import { DiagnosticBayGauges } from './DiagnosticBayGauges';

type SessionMutation = UseMutationResult<DiagnosticSession, Error, { session: DiagnosticSession; command: DiagnosticAction }, unknown>;

export function DiagnosticSessionView({ session, scenarios, scenariosError, retryScenarios, capabilities, mutation }: {
  session: DiagnosticSession;
  scenarios: DiagnosticScenario[];
  scenariosError: unknown;
  retryScenarios: () => void;
  capabilities: string[];
  mutation: SessionMutation;
}) {
  const t = useTranslations('diagnostics');
  const { dateTime, number } = useFormat();
  const { showToast } = useToast();
  const canPerform = capabilities.includes('diagnostics.perform');
  const canConfirm = capabilities.includes('diagnostics.confirm');
  const canEstimate = capabilities.includes('diagnostics.estimate');
  const [scenario, setScenario] = useState('');
  const [seed, setSeed] = useState('1');
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const busy = mutation.isPending;
  const findings = session.analysis?.findings ?? [];
  const evidenceNewestFirst = [...session.events].sort((first, second) => Date.parse(second.observedAt) - Date.parse(first.observedAt) || second.sequence - first.sequence);
  const visibleEvidence = showAllEvidence ? evidenceNewestFirst : evidenceNewestFirst.slice(0, 20);

  const run = async (command: DiagnosticAction): Promise<boolean> => {
    setDownloadError(null);
    try {
      await mutation.mutateAsync({ session, command });
      showToast('success', t('saved'), t(`success.${command.action}`));
      return true;
    } catch { return false; }
  };
  const download = async (extension: 'json' | 'pdf') => {
    setDownloading(extension);
    setDownloadError(null);
    try {
      const { data } = await api.get<Blob>(`/diagnostics/sessions/${session.id}/report${extension === 'pdf' ? '.pdf' : ''}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagnostic-report-${session.id.replace(/[^a-zA-Z0-9-]/g, '')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setDownloadError(error); }
    finally { setDownloading(null); }
  };
  const downloadEvidence = () => {
    setDownloadError(null);
    try {
      // This exports the authorized session evidence, independently of the
      // finalized report snapshot. Display pagination never removes packets.
      const evidence = {
        artifact: 'DIAGNOSTIC_SESSION_EVIDENCE',
        sessionId: session.id,
        revision: session.revision,
        source: session.source,
        provenance: session.source === 'SIMULATOR' ? 'SIMULATED DATA — demonstration only, not a real vehicle diagnosis' : 'Imported OBD evidence — hardware authenticity not independently verified',
        exportedAt: new Date().toISOString(),
        vehicle: session.vehicle,
        events: session.events,
        dtcs: session.dtcs,
        connectionEvents: session.connectionEvents ?? [],
        aiProvider: session.aiProvider ?? { configured: false, name: 'UNCONFIGURED' },
        aiExplanation: session.analysis?.aiExplanation ?? null,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagnostic-evidence-${session.id.replace(/[^a-zA-Z0-9-]/g, '')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setDownloadError(error); }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold">{session.vehicle.brand} {session.vehicle.model}</h2><p className="mt-1 text-xs font-mono text-text-muted break-all" dir="ltr">{session.vehicle.vin ?? session.id}</p></div>
          <span className="rounded-full border border-hairline px-3 py-1 text-xs">{t(`statuses.${session.status}`)}</span>
        </div>
        <p className="mt-4 text-sm font-medium text-metal">{t(session.source === 'SIMULATOR' ? 'simulatedEvidence' : 'importedEvidence')}</p>
        <p className="mt-1 text-xs text-text-muted">{t('sessionProvenance', { revision: session.revision, updated: dateTime(session.updatedAt) })}</p>
        {session.symptoms && <p className="mt-4 text-sm whitespace-pre-wrap break-words"><span className="text-text-muted">{t('symptoms')}: </span>{session.symptoms}</p>}
      </Card>
      {mutation.isError && <DiagnosticError error={mutation.error} />}
      {busy && <p role="status" className="text-sm text-text-muted">{t('saving')}</p>}

      <Card className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Play aria-hidden="true" className="h-4 w-4 text-metal" />{t('simulatorTitle')}</h3>
        <p className="text-sm text-text-muted">{t('simulatorDescription')}</p>
        {scenariosError ? <DiagnosticError error={scenariosError} onRetry={retryScenarios} /> : (
          <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_auto] items-end" onSubmit={(event) => { event.preventDefault(); void run({ action: 'simulate', body: { scenario, seed: Number(seed) } }); }}>
            <div><label className="block mb-2 text-sm" htmlFor="diagnostic-scenario">{t('scenario')}</label><select id="diagnostic-scenario" value={scenario} onChange={(event) => setScenario(event.target.value)} className={diagnosticInput} required disabled={!canPerform || busy || !!session.confirmation || !!session.events.length}>
              <option value="">{t('chooseScenario')}</option>{scenarios.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
            </select></div>
            <div><label className="block mb-2 text-sm" htmlFor="diagnostic-seed">{t('seed')}</label><input id="diagnostic-seed" type="number" min={0} max={2147483647} step={1} required value={seed} onChange={(event) => setSeed(event.target.value)} className={diagnosticInput} disabled={!canPerform || busy || !!session.events.length} /></div>
            <Button type="submit" disabled={!canPerform || !scenario || busy || !!session.events.length}><Play aria-hidden="true" className="h-4 w-4" />{t('runSimulator')}</Button>
          </form>
        )}
        {!!session.events.length && <p className="text-xs text-text-muted">{t('newSessionForScenario')}</p>}
        {!canPerform && <p className="text-xs text-text-muted">{t('requiresPerform')}</p>}
      </Card>

      <DiagnosticBayGauges sessionId={session.id} canPerform={canPerform} />

      <Card padding="none" className="overflow-hidden">
        <div className="p-5 border-b border-hairline"><h3 className="font-semibold flex items-center gap-2"><Activity aria-hidden="true" className="h-4 w-4 text-metal" />{t('evidenceTitle')}</h3><p className="mt-2 text-xs text-text-muted">{t('evidenceDescription')}</p></div>
        {session.events.length > 0 && <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-hairline"><div><p role="status" className="text-xs text-text-muted">{t(showAllEvidence ? 'evidenceCountAll' : 'evidenceCountRecent', { shown: visibleEvidence.length, total: session.events.length })}</p><p className="mt-1 text-xs text-text-muted">{t('evidenceExportDescription')}</p></div><div className="flex flex-wrap gap-2">{session.events.length > 20 && <Button variant="outline" size="sm" aria-expanded={showAllEvidence} aria-controls="diagnostic-evidence-packets" onClick={() => setShowAllEvidence((expanded) => !expanded)}>{showAllEvidence ? t('showLessEvidence') : t('showAllEvidence', { count: session.events.length })}</Button>}<Button variant="outline" size="sm" onClick={downloadEvidence}><Download aria-hidden="true" className="h-4 w-4" />{t('downloadEvidence')}</Button></div></div>}
        {session.events.length === 0 ? <p className="p-5 text-sm text-text-muted">{t('noEvidence')}</p> : <div id="diagnostic-evidence-packets" role="region" aria-label={t('evidenceTableRegion')} tabIndex={0} className="max-h-[400px] overflow-auto focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"><table className="w-full text-sm">
          <caption className="sr-only">{t('evidenceTitle')}</caption>
          <thead className="text-text-muted bg-surface-raised sticky top-0 z-10"><tr><th scope="col" className="px-4 py-3 text-start font-medium">{t('observedAt')}</th><th scope="col" className="px-4 py-3 text-start font-medium">{t('metric')}</th><th scope="col" className="px-4 py-3 text-end font-medium">{t('value')}</th><th scope="col" className="px-4 py-3 text-start font-medium">{t('quality')}</th></tr></thead>
          <tbody>{visibleEvidence.map((item) => <tr key={item.eventId} className="border-t border-hairline"><td className="px-4 py-3 text-xs whitespace-nowrap">{dateTime(item.observedAt)}<span className="block mt-1 text-text-muted font-mono" dir="ltr">{item.streamId} · #{item.sequence}</span></td><td className="px-4 py-3 break-words">{item.observation?.metric ?? `PID 0x${item.pid.toString(16).padStart(2, '0')}`}</td><td className="px-4 py-3 text-end whitespace-nowrap font-mono">{item.observation ? `${number(item.observation.value)} ${item.observation.unit}` : t('unavailable')}</td><td className="px-4 py-3 text-xs">{item.quality ? t(`qualityLabels.${item.quality}`) : t('unavailable')}</td></tr>)}</tbody>
        </table></div>}
        <div className="p-5 border-t border-hairline"><h4 className="text-sm font-medium">{t('dtcTitle')}</h4>{session.dtcs.length === 0 ? <p className="mt-2 text-sm text-text-muted">{t('noDtc')}</p> : <ul className="mt-3 space-y-3">{session.dtcs.map((dtc, index) => <li key={`${dtc.code}-${index}`} className="rounded-xl border border-hairline p-3"><p className="font-mono text-sm" dir="ltr">{dtc.code} · {dtc.status}</p>{dtc.freezeFrameSource === 'UNAVAILABLE' ? <p className="mt-2 text-xs text-text-muted">{t('freezeFrameUnavailable')}</p> : dtc.freezeFrame != null && <details className="mt-2"><summary className="text-xs cursor-pointer">{t(dtc.freezeFrameSource === 'SIMULATED' ? 'freezeFrameSimulated' : 'freezeFrame')}</summary><pre className="mt-2 whitespace-pre-wrap break-all text-xs text-text-muted" dir="ltr">{JSON.stringify(dtc.freezeFrame, null, 2)}</pre></details>}</li>)}</ul>}</div>
        {!!session.connectionEvents?.length && <div className="p-5 border-t border-hairline"><h4 className="text-sm font-medium">{t('connectionEvents')}</h4><ul className="mt-2 space-y-2 text-xs text-text-muted">{session.connectionEvents.map((event, index) => <li key={index}>{event.type} · {dateTime(event.at)}</li>)}</ul></div>}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-3"><div><h3 className="font-semibold flex items-center gap-2"><FlaskConical aria-hidden="true" className="h-4 w-4 text-metal" />{t('analysisTitle')}</h3><p className="mt-2 text-sm text-text-muted">{t('analysisDescription')}</p></div><Button variant="outline" disabled={!canPerform || busy || !session.events.length || !!session.confirmation} onClick={() => { void run({ action: 'analyze', body: {} }); }}>{t('analyze')}</Button></div>
        {session.analysis && <p className="text-xs text-text-muted">{t('rulesProvenance', { version: session.analysis.rulesVersion, revision: session.analysis.analyzedRevision })}</p>}
        {!session.analysis && <p className="text-sm text-text-muted">{t('noAnalysis')}</p>}
        {session.analysis && !findings.length && <p className="text-sm text-text-muted">{t('noFindings')}</p>}
        {findings.map((finding) => <FindingCard key={finding.id} finding={finding} session={session} canPerform={canPerform} busy={busy} onSave={run} />)}
        <div className="pt-4 border-t border-hairline space-y-3"><p className="text-xs text-text-muted">{t(session.aiProvider?.configured ? 'aiExplanationDescription' : 'aiUnconfigured')}</p>{session.aiProvider?.configured && <Button variant="outline" disabled={!canPerform || busy || !session.analysis || !!session.report} onClick={() => { void run({ action: 'explain', body: {} }); }}>{t('explain')}</Button>}{session.analysis?.aiExplanation?.status === 'AVAILABLE' && <p className="text-sm text-text-muted whitespace-pre-wrap">{session.analysis.aiExplanation.narrative}</p>}{session.analysis?.aiExplanation?.status === 'UNAVAILABLE' && <p className="text-sm text-text-muted">{t('aiUnavailable')}</p>}</div>
      </Card>

      <CustomerVehicleHealthCard sessionId={session.id} canPerform={canPerform} />
      <ConfirmationPanel key={`${session.id}-${session.analysis?.analyzedRevision ?? 'none'}-${session.testResults.map((test) => test.recordedAt).join('-')}`} session={session} canConfirm={canConfirm} busy={busy} onSave={run} />
      <EstimatePanel key={session.id} session={session} canEstimate={canEstimate} busy={busy} onSave={run} />
      <Card className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><FileText aria-hidden="true" className="h-4 w-4 text-metal" />{t('reportTitle')}</h3><p className="text-sm text-text-muted">{t('reportDescription')}</p>
        <p className="text-xs text-text-muted">{t('reportPrerequisites')}</p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!canConfirm || busy || !session.confirmation || !session.estimate || !!session.report} onClick={() => { void run({ action: 'report', body: {} }); }}>{t('generateReport')}</Button>
          <Button variant="outline" disabled={!session.report || !!downloading} onClick={() => { void download('json'); }}><Download aria-hidden="true" className="h-4 w-4" />{t('downloadJson')}</Button>
          <Button variant="outline" disabled={!session.report || !!downloading} onClick={() => { void download('pdf'); }}><Download aria-hidden="true" className="h-4 w-4" />{t('downloadPdf')}</Button>
        </div>
        {downloading && <p role="status" className="text-sm text-text-muted">{t('downloading')}</p>}
        {downloadError != null && <DiagnosticError error={downloadError} />}
        {session.report && <p role="status" className="text-sm text-success flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />{t('reportReady')}</p>}
      </Card>
    </div>
  );
}

function FindingCard({ finding, session, canPerform, busy, onSave }: { finding: DiagnosticFinding; session: DiagnosticSession; canPerform: boolean; busy: boolean; onSave: (command: DiagnosticAction) => Promise<boolean> }) {
  const t = useTranslations('diagnostics');
  const { dateTime } = useFormat();
  return <article className="rounded-xl border border-hairline p-4 space-y-3">
    <div className="flex flex-wrap gap-2 items-start justify-between"><h4 className="font-medium">{finding.title}</h4><span className="text-xs rounded-full border border-hairline px-2 py-1">{t(`severity.${finding.severity}`)}</span></div>
    <p className="text-sm text-text-muted"><span className="text-foreground">{t('confidenceBasis')}: </span>{finding.confidenceBasis}</p>
    <div><h5 className="text-xs font-semibold">{t('supportingEvidence')}</h5><ul className="mt-1 list-disc ps-5 space-y-1 text-sm text-text-muted">{finding.evidence.map((evidence, index) => <li key={index}>{evidence}</li>)}</ul></div>
    {!!finding.limitations.length && <div><h5 className="text-xs font-semibold">{t('limitations')}</h5><ul className="mt-1 list-disc ps-5 space-y-1 text-sm text-text-muted">{finding.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></div>}
    <h5 className="text-sm font-medium pt-2">{t('recommendedTests')}</h5>
    {finding.recommendedTests.map((test) => {
      const previous = [...session.testResults].reverse().find((result) => result.testId === test.id);
      return <div key={test.id} className="p-3 bg-surface-raised rounded-xl space-y-2"><p className="text-sm">{test.title}</p>{previous && <p className="text-xs text-text-muted">{t('testRecorded', { result: t(`testResults.${previous.result}`), at: dateTime(previous.recordedAt) })}<span className="block mt-1 whitespace-pre-wrap">{previous.notes}</span></p>}<TestResultForm testId={test.id} formId={`${finding.id}-${test.id}`} disabled={!canPerform || busy || !!session.report} onSave={onSave} /></div>;
    })}
  </article>;
}

function TestResultForm({ testId, formId, disabled, onSave }: { testId: string; formId: string; disabled: boolean; onSave: (command: DiagnosticAction) => Promise<boolean> }) {
  const t = useTranslations('diagnostics');
  const [result, setResult] = useState<'PASS' | 'FAIL' | 'INCONCLUSIVE'>('INCONCLUSIVE');
  const [notes, setNotes] = useState('');
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (await onSave({ action: 'tests', body: { testId, result, notes: notes.trim() } })) setNotes('');
  };
  return <form className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]" onSubmit={(event) => { void save(event); }}>
    <div><label htmlFor={`result-${formId}`} className="block text-xs mb-1.5">{t('testResult')}</label><select id={`result-${formId}`} value={result} onChange={(event) => setResult(event.target.value as typeof result)} className={diagnosticInput} disabled={disabled}>{(['INCONCLUSIVE', 'PASS', 'FAIL'] as const).map((value) => <option key={value} value={value}>{t(`testResults.${value}`)}</option>)}</select></div>
    <div><label htmlFor={`notes-${formId}`} className="block text-xs mb-1.5">{t('testNotes')}</label><textarea id={`notes-${formId}`} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} required minLength={3} maxLength={2000} className={diagnosticInput} disabled={disabled} /></div>
    <Button type="submit" size="sm" variant="outline" className="sm:col-span-2 justify-self-start" disabled={disabled || notes.trim().length < 3}>{t('saveTest')}</Button>
  </form>;
}

function ConfirmationPanel({ session, canConfirm, busy, onSave }: { session: DiagnosticSession; canConfirm: boolean; busy: boolean; onSave: (command: DiagnosticAction) => Promise<boolean> }) {
  const t = useTranslations('diagnostics');
  const { dateTime } = useFormat();
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [attested, setAttested] = useState(false);
  const disabled = !canConfirm || busy || !session.analysis || !!session.confirmation || !!session.report;
  const selectedFindings = session.analysis?.findings.filter((finding) => selected.includes(finding.id)) ?? [];
  const hasRequiredTests = selectedFindings.every((finding) => finding.recommendedTests.every((test) => session.testResults.some((result) => result.testId === test.id && result.result !== 'INCONCLUSIVE')));
  const addressedUrgent = session.analysis?.findings.every((finding) => finding.severity !== 'URGENT' || selected.includes(finding.id));
  return <Card className="space-y-4"><h3 className="font-semibold">{t('confirmationTitle')}</h3><p className="text-sm text-text-muted">{t('confirmationDescription')}</p>
    {session.confirmation ? <div><p role="status" className="text-sm text-success">{t('confirmedAt', { at: dateTime(session.confirmation.confirmedAt) })}</p><p className="mt-2 text-xs text-text-muted">{t('actor')}: <span className="font-mono">{session.confirmation.actorId}</span></p><p className="mt-2 text-sm whitespace-pre-wrap break-words">{session.confirmation.notes}</p></div> : <form onSubmit={(event) => { event.preventDefault(); void onSave({ action: 'confirm', body: { findingIds: selected, notes: notes.trim() } }); }} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-2"><legend className="text-sm mb-2">{t('selectFindings')}</legend>{session.analysis?.findings.map((finding) => <label key={finding.id} className="flex items-start gap-3 text-sm"><input type="checkbox" value={finding.id} checked={selected.includes(finding.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, finding.id] : current.filter((id) => id !== finding.id))} className="mt-0.5 accent-primary h-4 w-4" />{finding.title}</label>)}</fieldset>
      <p className="text-xs text-text-muted">{t('confirmationPrerequisites')}</p>
      <label className="block text-sm" htmlFor="diagnostic-confirmation-notes">{t('confirmationNotes')}</label><textarea id="diagnostic-confirmation-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} minLength={10} maxLength={2000} required disabled={disabled} className={diagnosticInput} />
      <label className="flex items-start gap-3 text-sm text-text-muted"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} required disabled={disabled} className="mt-0.5 accent-primary h-4 w-4 shrink-0" />{t('attestation')}</label>
      {!canConfirm && <p className="text-xs text-text-muted">{t('requiresConfirm')}</p>}
      <Button type="submit" disabled={disabled || !attested || notes.trim().length < 10 || selected.length === 0 || !hasRequiredTests || !addressedUrgent}>{t('confirmFindings')}</Button>
    </form>}
  </Card>;
}

function EstimatePanel({ session, canEstimate, busy, onSave }: { session: DiagnosticSession; canEstimate: boolean; busy: boolean; onSave: (command: DiagnosticAction) => Promise<boolean> }) {
  const t = useTranslations('diagnostics');
  const router = useRouter();
  const { money } = useFormat();
  const { showToast } = useToast();
  const [items, setItems] = useState<EstimateItem[]>(session.estimate?.items.map(({ kind, description, quantity, unitPrice }) => ({ kind, description, quantity, unitPrice })) ?? [{ kind: 'LABOR', description: '', quantity: '1', unitPrice: '' }]);
  const [vatRate, setVatRate] = useState(String(session.estimate?.vatRate ?? '0.20'));
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false);
  const disabled = !canEstimate || busy || !session.confirmation || !!session.report;
  const changeItem = (index: number, field: keyof EstimateItem, value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));

  const addPartToEstimate = (part: PartItem) => {
    setItems((current) => [
      ...current,
      {
        kind: 'PART',
        description: `${part.brand} ${part.name} (${part.partNumber})`,
        quantity: '1',
        unitPrice: part.price,
      },
    ]);
    showToast('success', 'Part Added to Estimate', `${part.brand} ${part.name} appended to line items.`);
  };

  const handleCreateWorkOrder = async () => {
    if (!session.estimate) return;
    setCreatingWorkOrder(true);
    try {
      const laborLines = session.estimate.items.filter((i) => i.kind === 'LABOR');
      const partLines = session.estimate.items.filter((i) => i.kind === 'PART');
      const laborHours = laborLines.reduce((acc, l) => acc + (Number(l.quantity) || 1), 0);
      const laborRate = laborLines[0]?.unitPrice ? Number(laborLines[0].unitPrice) : 300;

      const res = await api.post('/work-orders', {
        vehicleId: session.vehicleId,
        sessionId: session.id,
        description: `Diagnostic repair: ${session.vehicle.brand} ${session.vehicle.model} (${session.dtcs.map((d) => d.code).join(', ') || 'Fault investigation'})`,
        priority: session.dtcs.some((d) => d.code.startsWith('P03')) ? 'HIGH' : 'MEDIUM',
        laborHours,
        laborRate,
        parts: partLines.map((p) => ({
          partNumber: p.description.match(/\(([^)]+)\)/)?.[1] ?? 'PART',
          name: p.description,
          quantity: Number(p.quantity) || 1,
          unitPrice: Number(p.unitPrice) || 0,
        })),
      });

      showToast('success', 'Work Order Created', `Order ${res.data.orderNumber} initialized.`);
      router.push('/dashboard/work-orders');
    } catch {
      showToast('danger', 'Error', 'Failed to create work order from estimate');
    } finally {
      setCreatingWorkOrder(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Parts Intelligence Matcher */}
      <PartsCatalogMatcher
        dtcCodes={session.dtcs.map((d) => d.code)}
        vehicleBrand={session.vehicle.brand}
        vehicleModel={session.vehicle.model}
        onAddPart={addPartToEstimate}
        disabled={disabled}
      />

      <Card className="space-y-4">
        <h3 className="font-semibold">{t('estimateTitle')}</h3>
        <p className="text-sm text-text-muted">{t('estimateDescription')}</p>
        {!session.confirmation && <p className="text-xs text-text-muted">{t('estimatePrerequisites')}</p>}

        <form onSubmit={(event) => { event.preventDefault(); void onSave({ action: 'estimate', body: { items, vatRate } }); }} className="space-y-4">
          {items.map((item, index) => (
            <fieldset key={index} disabled={disabled} className="grid gap-3 sm:grid-cols-2 rounded-xl border border-hairline p-4">
              <legend className="px-1 text-xs text-text-muted">{t('estimateLine', { index: index + 1 })}</legend>
              <div>
                <label htmlFor={`estimate-kind-${index}`} className="block text-xs mb-1.5">{t('kind')}</label>
                <select id={`estimate-kind-${index}`} value={item.kind} onChange={(event) => changeItem(index, 'kind', event.target.value)} className={diagnosticInput}>
                  {(['LABOR', 'PART', 'OTHER'] as const).map((kind) => <option key={kind} value={kind}>{t(`estimateKinds.${kind}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`estimate-description-${index}`} className="block text-xs mb-1.5">{t('lineDescription')}</label>
                <input id={`estimate-description-${index}`} required maxLength={200} value={item.description} onChange={(event) => changeItem(index, 'description', event.target.value)} className={diagnosticInput} />
              </div>
              <div>
                <label htmlFor={`estimate-quantity-${index}`} className="block text-xs mb-1.5">{t('quantity')}</label>
                <input id={`estimate-quantity-${index}`} type="number" step="0.01" min="0.01" max="10000" required value={item.quantity} onChange={(event) => changeItem(index, 'quantity', event.target.value)} className={diagnosticInput} />
              </div>
              <div>
                <label htmlFor={`estimate-price-${index}`} className="block text-xs mb-1.5">{t('unitPrice')}</label>
                <input id={`estimate-price-${index}`} type="number" step="0.01" min="0" max="9999999" required value={item.unitPrice} onChange={(event) => changeItem(index, 'unitPrice', event.target.value)} className={diagnosticInput} />
              </div>
              {items.length > 1 && (
                <Button type="button" size="sm" variant="ghost" className="justify-self-start" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={t('removeLine', { index: index + 1 })}>
                  <Trash2 aria-hidden="true" className="h-4 w-4" />{t('remove')}
                </Button>
              )}
            </fieldset>
          ))}

          <Button type="button" variant="outline" size="sm" disabled={disabled || items.length >= 30} onClick={() => setItems((current) => [...current, { kind: 'PART', description: '', quantity: '1', unitPrice: '' }])}>
            <Plus aria-hidden="true" className="h-4 w-4" />{t('addLine')}
          </Button>

          <div className="max-w-xs">
            <label htmlFor="estimate-vat" className="block text-sm mb-2">{t('vatRate')}</label>
            <input id="estimate-vat" type="number" min="0" max="1" step="0.01" value={vatRate} onChange={(event) => setVatRate(event.target.value)} required disabled={disabled} className={diagnosticInput} />
            <p className="mt-2 text-xs text-text-muted">{t('vatAssumption')}</p>
          </div>

          {!canEstimate && <p className="text-xs text-text-muted">{t('requiresEstimate')}</p>}
          <Button type="submit" disabled={disabled}>{t('saveEstimate')}</Button>
        </form>

        {session.estimate && (
          <div className="rounded-xl bg-surface-raised p-4 space-y-4">
            <p className="text-xs text-text-muted mb-3">{t('savedEstimate')}</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>{t('subtotal')}</dt><dd className="font-mono">{money(Number(session.estimate.subtotal))}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('tax')}</dt><dd className="font-mono">{money(Number(session.estimate.tax))}</dd></div>
              <div className="flex justify-between gap-3 border-t border-hairline pt-2 font-semibold"><dt>{t('total')}</dt><dd className="font-mono">{money(Number(session.estimate.total))}</dd></div>
            </dl>

            <div className="pt-2 border-t border-hairline flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-text-muted">Estimate approved and verified for work order conversion</span>
              <Button
                variant="outline"
                size="sm"
                disabled={creatingWorkOrder}
                onClick={handleCreateWorkOrder}
              >
                <Wrench className="h-4 w-4" />
                {creatingWorkOrder ? 'Converting...' : 'Create Work Order from Estimate'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
