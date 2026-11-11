# CarHub OS — AI Diagnostic & Evidence Architecture

This document specifies the artificial intelligence reasoning engine, evidence grounding framework, prompt architecture, and safety protocols powering CarHub OS.

---

## 1. Grounded Evidence Architecture

To prevent diagnostic hallucinations, CarHub OS adopts a **strict evidence-first pipeline**:

```
[ Ingested DTCs + Freeze Frames + Real-time Telemetry + Symptoms ]
                                │
                                ▼
               [ Deterministic Rules Engine ]
                                │
           ┌────────────────────┴────────────────────┐
           ▼                                         ▼
[ Rule-Based Assertions ]               [ Ambiguous / Multi-Signal Evidence ]
(e.g., P0301 = Cyl 1 Misfire)                      │
           │                                         ▼
           │                         [ Provider-Neutral AI Reasoning ]
           │                                (Claude 3.5 Sonnet)
           │                                         │
           └────────────────────┬────────────────────┘
                                │
                                ▼
                 [ Structured Diagnostic Output ]
                     - Primary Hypothesis
                     - Alternative Hypotheses
                     - Confidence Score (0.0 - 1.0)
                     - Correlating Evidence List
                     - Recommended Verification Tests
                                │
                                ▼
               [ Human Technician Review & Sign-Off ]
```

---

## 2. Confidence Scoring Model

Diagnoses must assign one of five standardized confidence levels:

1. **`CONFIRMED` (1.00)**: Physical verification performed by technician (e.g. spark plug swapped, compression tested).
2. **`HIGH` (0.80 - 0.99)**: Explicit DTC with matching freeze-frame telemetry and typical sensor deviations (e.g. P0171 with LTFT > +20% and lean O2).
3. **`PROBABLE` (0.60 - 0.79)**: DTC present or significant sensor anomaly, but requires secondary test to rule out related component failure (e.g., vacuum leak vs MAF sensor failure).
4. **`POSSIBLE` (0.35 - 0.59)**: Intermittent symptom or borderline sensor reading without hard DTC.
5. **`INSUFFICIENT_EVIDENCE` (<0.35)**: Inconclusive sensor stream; prompts the technician for additional specific physical checks or extended road test.

---

## 3. Provider Abstraction Contract

```typescript
export interface DiagnosticReasoningRequest {
  vehicle: {
    vin?: string;
    brand: string;
    model: string;
    year?: number;
    mileage?: number;
  };
  symptoms?: string;
  dtcs: Array<{ code: string; description?: string; freezeFrame?: Record<string, unknown> }>;
  telemetrySummary: {
    sampleCount: number;
    anomalies: string[];
    sensorRanges: Record<string, { min: number; max: number; avg: number }>;
  };
}

export interface DiagnosticReasoningResponse {
  summary: string;
  primaryHypothesis: {
    faultCode?: string;
    system: string;
    description: string;
    confidence: number;
    confidenceLevel: 'CONFIRMED' | 'HIGH' | 'PROBABLE' | 'POSSIBLE' | 'INSUFFICIENT_EVIDENCE';
  };
  alternativeHypotheses: Array<{
    system: string;
    description: string;
    likelihood: number;
  }>;
  evidence: string[];
  recommendedTests: Array<{
    step: number;
    procedure: string;
    expectedResult: string;
  }>;
  suggestedRepairs: Array<{
    operation: string;
    urgency: 'IMMEDIATE' | 'SOON' | 'MONITOR';
    estimatedHours: number;
  }>;
}
```

---

## 4. Safety & Immutability Rules

1. **Never Overwrite Confirmed Findings**: Once a technician marks a diagnosis as `CONFIRMED`, subsequent telemetry or AI runs cannot overwrite the primary cause without an explicit superseding revision.
2. **Auditable Provenance**: Every AI execution stores model name, prompt template version, input hash, output token count, and latency.
3. **No Phantom Parts**: AI recommendations cannot reference fabricated part numbers. All repair recommendations are fed into a verified parts cross-reference index before quoting.
