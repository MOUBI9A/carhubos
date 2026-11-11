import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/lib/api';
import messages from '../../../messages/en.json';
import { DiagnosticsWorkspace } from './DiagnosticsWorkspace';
import type { DiagnosticSession } from './types';

vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('@/lib/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'technician-1', role: 'AGENT' } }) }));
vi.mock('@/lib/contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const allCapabilities = ['diagnostics.view', 'diagnostics.perform', 'diagnostics.confirm', 'diagnostics.estimate'];
const blank: DiagnosticSession = {
  id: 'session-1', vehicleId: 'vehicle-1', vehicle: { id: 'vehicle-1', brand: 'Renault', model: 'Clio' },
  source: 'IMPORT', status: 'OPEN', revision: 0, events: [], dtcs: [], analysis: null, testResults: [],
  confirmation: null, estimate: null, report: null, createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z',
};
const analyzed: DiagnosticSession = {
  ...blank, source: 'SIMULATOR', status: 'ANALYZED', revision: 2,
  events: [{ eventId: 'sample-1', streamId: 'sim-1', sequence: 1, observedAt: '2026-10-08T10:00:00Z', mode: 1, pid: 12, bytes: [12, 128], observation: { metric: 'rpm', value: 800, unit: 'rpm' }, quality: 'ACCEPTED' }],
  analysis: { provider: 'DETERMINISTIC', rulesVersion: 'obd-evidence-v1', analyzedRevision: 2, findings: [{ id: 'misfire', title: 'Cylinder 1 misfire recorded', severity: 'WARNING', confidenceBasis: 'DTC observed; cause unconfirmed', evidence: ['P0301'], limitations: ['Do not replace parts on this code alone.'], recommendedTests: [{ id: 'compression', title: 'Compare compression' }] }] },
};
let current: DiagnosticSession;
let capabilities: string[];

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<NextIntlClientProvider locale="en" messages={messages}><QueryClientProvider client={client}><DiagnosticsWorkspace /></QueryClientProvider></NextIntlClientProvider>);
}

async function openSession() {
  fireEvent.click(await screen.findByRole('button', { name: /Renault Clio/ }));
  await screen.findByRole('heading', { name: 'Renault Clio' });
}

describe('Diagnostic technician workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current = structuredClone(blank);
    capabilities = [...allCapabilities];
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/diagnostics/access') return { data: { capabilities } };
      if (path === '/diagnostics/vehicles') return { data: [blank.vehicle] };
      if (path === '/diagnostics/sessions') return { data: [current] };
      if (path === '/diagnostics/scenarios') return { data: [{ id: 'normal_idle', title: 'Normal idle', category: 'HEALTHY' }] };
      if (path === '/diagnostics/sessions/session-1') return { data: current };
      throw new Error(`Unexpected diagnostic request ${path}`);
    });
  });

  it('does not fetch tenant evidence when diagnostic access has not been granted', async () => {
    capabilities = [];
    setup();
    expect(await screen.findByRole('heading', { name: 'Diagnostic access required' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('marks simulated evidence honestly and prevents confirmation without conclusive recorded tests', async () => {
    current = structuredClone(analyzed);
    setup();
    await openSession();
    expect(screen.getByText('SIMULATED — training evidence, not live vehicle data')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cylinder 1 misfire recorded' }));
    fireEvent.change(screen.getByLabelText('Technician conclusions and remaining uncertainty'), { target: { value: 'Symptoms require further checks.' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed the evidence/ }));
    expect(screen.getByRole('button', { name: 'Confirm findings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save manual estimate' })).toBeDisabled();
    expect(screen.getByText(/Optional AI explanation is not configured/)).toBeInTheDocument();
  });

  it('allows a view-only technician to inspect evidence while keeping mutations disabled', async () => {
    capabilities = ['diagnostics.view'];
    current = structuredClone(analyzed);
    setup();
    await openSession();
    expect(screen.getByRole('button', { name: 'Analyze evidence' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record test result' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm findings' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Create session' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sends simulator inputs with the current revision and preserves source labels', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ...analyzed, status: 'OPEN', revision: 1, analysis: null } });
    setup();
    await openSession();
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'normal_idle' } });
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run simulator' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/diagnostics/sessions/session-1/simulate', { scenario: 'normal_idle', seed: 42, expectedRevision: 0 }));
    expect(await screen.findByText('SIMULATED — training evidence, not live vehicle data')).toBeInTheDocument();
  });

  it('refreshes a changed session after a conflict without resubmitting a stale decision', async () => {
    vi.mocked(api.post).mockImplementation(async () => {
      current = { ...analyzed, revision: 3 };
      throw { isAxiosError: true, response: { status: 409, data: { message: 'Session changed' } } };
    });
    setup();
    await openSession();
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'normal_idle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run simulator' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Review it before submitting your decision again');
    await waitFor(() => expect(screen.getByText(/Revision 3 · Updated/)).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('resubmits only editable Decimal strings from a saved estimate, excluding calculated totals', async () => {
    current = {
      ...analyzed, status: 'CONFIRMED', revision: 5,
      confirmation: { actorId: 'technician-1', findingIds: ['misfire'], notes: 'Measured compression and checked wiring.', analysisRevision: 2, confirmedAt: '2026-10-08T10:01:00Z' },
      estimate: { items: [{ kind: 'LABOR', description: 'Inspection', quantity: '1', unitPrice: '0.10', total: '0.10' }], subtotal: '0.10', vatRate: '0.20', tax: '0.02', total: '0.12', source: 'MANUAL', currency: 'MAD', fitmentVerified: false },
    };
    vi.mocked(api.put).mockResolvedValue({ data: { ...current, revision: 6 } });
    setup();
    await openSession();
    fireEvent.click(screen.getByRole('button', { name: 'Save manual estimate' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/diagnostics/sessions/session-1/estimate', {
      expectedRevision: 5, vatRate: '0.20', items: [{ kind: 'LABOR', description: 'Inspection', quantity: '1', unitPrice: '0.10' }],
    }));
  });

  it('keeps a generated report immutable and offers both authenticated export formats', async () => {
    current = { ...analyzed, status: 'REPORTED', report: { source: 'SIMULATOR', contentHash: 'test-only' } };
    setup();
    await openSession();
    expect(screen.getByRole('button', { name: 'Record test result' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save manual estimate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate report' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps the technician workflow compact while exporting every packet with its recorded provenance', async () => {
    current = { ...structuredClone(analyzed), aiProvider: { configured: false, name: 'UNCONFIGURED' }, events: Array.from({ length: 132 }, (_, index) => ({
      ...analyzed.events[0], eventId: `sample-${index}`, sequence: index,
      observedAt: new Date(Date.parse('2026-10-08T10:00:00Z') + index * 1000).toISOString(),
      observation: { metric: `packet-${index}`, value: 800 + index, unit: 'rpm' },
    })) };
    let exportedBlob: Blob | undefined;
    const createObjectURL = vi.fn((blob: Blob) => { exportedBlob = blob; return 'blob:diagnostic-evidence'; });
    const revokeObjectURL = vi.fn();
    const existingCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const existingRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    try {
      setup();
      await openSession();
      const table = screen.getByRole('table');
      expect(within(table).getAllByRole('row')).toHaveLength(21);
      expect(screen.getByText('packet-131')).toBeInTheDocument();
      expect(screen.queryByText('packet-0')).not.toBeInTheDocument();
      const expand = screen.getByRole('button', { name: 'Show all (132)' });
      expect(expand).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(expand);
      expect(within(table).getAllByRole('row')).toHaveLength(133);
      expect(screen.getByRole('button', { name: 'Show latest 20' })).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Show latest 20' }));
      expect(within(table).getAllByRole('row')).toHaveLength(21);
      fireEvent.click(screen.getByRole('button', { name: 'Download evidence JSON' }));
      expect(exportedBlob).toBeDefined();
      const exported = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsText(exportedBlob!);
      });
      const evidence = JSON.parse(exported);
      expect(evidence.events).toHaveLength(132);
      expect(evidence.events[0].eventId).toBe('sample-0');
      expect(evidence.events[131].eventId).toBe('sample-131');
      expect(evidence).toMatchObject({ artifact: 'DIAGNOSTIC_SESSION_EVIDENCE', source: 'SIMULATOR', sessionId: current.id, revision: current.revision, aiProvider: { configured: false, name: 'UNCONFIGURED' } });
      expect(evidence.provenance).toContain('SIMULATED DATA');
      expect(evidence.contentHash).toBeUndefined();
      expect(click).toHaveBeenCalledTimes(1);
      expect(api.post).not.toHaveBeenCalled();
      await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:diagnostic-evidence'), { timeout: 1500 });
    } finally {
      click.mockRestore();
      if (existingCreate) Object.defineProperty(URL, 'createObjectURL', existingCreate);
      else Reflect.deleteProperty(URL, 'createObjectURL');
      if (existingRevoke) Object.defineProperty(URL, 'revokeObjectURL', existingRevoke);
      else Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });
});
