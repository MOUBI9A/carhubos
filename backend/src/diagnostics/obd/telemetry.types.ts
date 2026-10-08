export interface ObdEvent {
  eventId: string;
  streamId: string;
  sequence: number;
  observedAt: string;
  mode: number;
  pid: number;
  bytes: number[];
}
export interface Observation {
  metric: string;
  value: number;
  unit: string;
}
export interface StoredEvent extends ObdEvent {
  receivedAt: string;
  hash: string;
  observation: Observation;
  quality: 'ACCEPTED' | 'LATE' | 'CLOCK_DRIFT';
}
export interface DtcEvidence {
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'PERMANENT';
  freezeFrame: Record<string, number>;
  freezeFrameSource: 'CAPTURED' | 'SIMULATED' | 'UNAVAILABLE';
}
export interface TestResult {
  testId: string;
  result: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  notes: string;
  actorId: string;
  recordedAt: string;
}
export interface Finding {
  id: string;
  title: string;
  severity: 'INFO' | 'WARNING' | 'URGENT';
  confidenceBasis: string;
  evidence: string[];
  recommendedTests: { id: string; title: string }[];
  limitations: string[];
}
export interface Analysis {
  aiExplanation?: {
    status: 'UNCONFIGURED' | 'UNAVAILABLE' | 'AVAILABLE';
    provider: string;
    narrative?: string;
    evidenceIds?: string[];
  };
  rulesVersion: string;
  provider: 'DETERMINISTIC';
  analyzedRevision: number;
  findings: Finding[];
  source: 'SIMULATOR' | 'IMPORT';
  limitations: string[];
}
export interface Confirmation {
  findingIds: string[];
  notes: string;
  actorId: string;
  confirmedAt: string;
  analysisRevision: number;
}
export interface EstimateItem {
  kind: 'LABOR' | 'PART' | 'OTHER';
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}
export interface Estimate {
  items: EstimateItem[];
  subtotal: string;
  vatRate: string;
  tax: string;
  total: string;
  currency: 'MAD';
  source: 'MANUAL';
  fitmentVerified: false;
  assumptions: string[];
}
export interface SessionData {
  events: StoredEvent[];
  dtcs: DtcEvidence[];
  analysis: Analysis | null;
  testResults: TestResult[];
  confirmation: Confirmation | null;
  estimate: Estimate | null;
  report: Record<string, unknown> | null;
  connectionEvents: { type: string; at: string }[];
}
export const emptySessionData = (): SessionData => ({
  events: [],
  dtcs: [],
  analysis: null,
  testResults: [],
  confirmation: null,
  estimate: null,
  report: null,
  connectionEvents: [],
});
