export interface DiagnosticVehicle {
  id: string;
  brand: string;
  model: string;
  vin?: string | null;
  year?: number | null;
  fleetCarId?: string | null;
}

export interface DiagnosticScenario {
  id: string;
  title: string;
  category: string;
}

export interface DiagnosticEvent {
  eventId: string;
  streamId: string;
  sequence: number;
  observedAt: string;
  mode: number;
  pid: number;
  bytes: number[];
  receivedAt?: string;
  observation?: { metric: string; value: number; unit: string } | null;
  quality?: 'ACCEPTED' | 'LATE' | 'CLOCK_DRIFT';
}

export interface DiagnosticFinding {
  id: string;
  title: string;
  severity: 'INFO' | 'WARNING' | 'URGENT';
  confidenceBasis: string;
  evidence: string[];
  recommendedTests: { id: string; title: string }[];
  limitations: string[];
}

export interface EstimateItem {
  kind: 'LABOR' | 'PART' | 'OTHER';
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface DiagnosticSession {
  id: string;
  vehicleId: string;
  vehicle: DiagnosticVehicle;
  source: 'SIMULATOR' | 'IMPORT';
  status: 'OPEN' | 'ANALYZED' | 'CONFIRMED' | 'REPORTED';
  revision: number;
  symptoms?: string | null;
  events: DiagnosticEvent[];
  dtcs: { code: string; status: string; freezeFrame?: unknown; freezeFrameSource?: 'CAPTURED' | 'SIMULATED' | 'UNAVAILABLE' }[];
  connectionEvents?: { type: string; at: string }[];
  aiProvider?: { configured: boolean; name: string };
  analysis: {
    findings: DiagnosticFinding[];
    provider: 'DETERMINISTIC';
    rulesVersion: string;
    analyzedRevision: number;
    aiExplanation?: { status: 'UNCONFIGURED' | 'UNAVAILABLE' | 'AVAILABLE'; provider: string; narrative?: string; evidenceIds?: string[] };
  } | null;
  testResults: {
    testId: string;
    result: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
    notes: string;
    actorId: string;
    recordedAt: string;
  }[];
  confirmation: {
    findingIds: string[];
    notes: string;
    actorId: string;
    confirmedAt: string;
    analysisRevision: number;
  } | null;
  estimate: {
    items: (EstimateItem & { total?: string })[];
    subtotal: number | string;
    vatRate: number | string;
    tax: number | string;
    total: number | string;
    currency: 'MAD';
    source: 'MANUAL';
    fitmentVerified: false;
  } | null;
  report: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type DiagnosticAction =
  | { action: 'simulate'; body: { scenario: string; seed: number } }
  | { action: 'analyze'; body: Record<string, never> }
  | { action: 'explain'; body: Record<string, never> }
  | { action: 'tests'; body: { testId: string; result: 'PASS' | 'FAIL' | 'INCONCLUSIVE'; notes: string } }
  | { action: 'confirm'; body: { findingIds: string[]; notes: string } }
  | { action: 'estimate'; body: { items: EstimateItem[]; vatRate: string } }
  | { action: 'report'; body: Record<string, never> };
