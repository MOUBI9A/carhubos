export type VehicleSystem = 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK';

export type DiagnosticSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';

export interface DiagnosticTestStep {
  step: number;
  title: string;
  type: 'ELECTRICAL' | 'MECHANICAL' | 'SCAN_TOOL' | 'VISUAL';
  procedure: string;
  expectedValue: string;
  tool: string;
  safetyCaution?: string;
}

export interface MoroccanOperatingContext {
  climateRisk: string;
  fuelQualityFactor: string;
  fieldNotes: string;
}

export interface DtcKnowledgeEntry {
  code: string;
  standard: 'SAE_J2012' | 'ISO_14229' | 'OEM_SPECIFIC';
  system: VehicleSystem;
  subsystem: string;
  severity: DiagnosticSeverity;
  title: string;
  definition: string;
  component: string;
  probableCauses: string[];
  symptoms: string[];
  electricalTests: DiagnosticTestStep[];
  mechanicalTests: DiagnosticTestStep[];
  standardRepairProcedure: string;
  estimatedLaborHours: number;
  torqueSpecs?: string;
  specialTools: string[];
  moroccanOperatingContext: MoroccanOperatingContext;
  relatedDtcs: string[];
}

export interface TechnicianCopilotGuide {
  analyzedCodes: string[];
  primarySystem: VehicleSystem;
  overallSeverity: DiagnosticSeverity;
  rootCauseHypothesis: string;
  correlatedFindings: string[];
  prioritizedActionPlan: {
    phase: number;
    phaseName: string;
    description: string;
    actionSteps: {
      dtcCode: string;
      stepTitle: string;
      procedure: string;
      expectedValue: string;
      tool: string;
      type: 'ELECTRICAL' | 'MECHANICAL' | 'SCAN_TOOL' | 'VISUAL';
    }[];
  }[];
  estimatedTotalLaborHours: number;
  requiredTools: string[];
  moroccanFieldAlerts: string[];
  safetyWarnings: string[];
}
