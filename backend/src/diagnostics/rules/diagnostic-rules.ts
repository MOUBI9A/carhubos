import type {
  Analysis,
  DtcEvidence,
  Finding,
  StoredEvent,
} from '../obd/telemetry.types';
import { aggregateEvidence } from '../obd/normalizer';
export const RULES_VERSION = 'obd-evidence-v1';
const DTC_RULES: Record<
  string,
  { title: string; test: string; testTitle: string; limitation: string }
> = {
  P0300: {
    title: 'Random/multiple-cylinder misfire recorded',
    test: 'misfire-inspection',
    testTitle:
      'Inspect ignition, fuel delivery and compression using applicable service procedure',
    limitation:
      'A DTC cannot distinguish ignition, fuel, mechanical or wiring causes.',
  },
  P0301: {
    title: 'Cylinder 1 misfire recorded',
    test: 'cylinder-one-test',
    testTitle: 'Inspect cylinder 1 ignition/fuel and compare compression',
    limitation: 'Do not replace a coil or injector based solely on this DTC.',
  },
  P0171: {
    title: 'Lean fuel correction recorded',
    test: 'lean-leak-test',
    testTitle: 'Check intake leaks, fuel supply and MAF plausibility',
    limitation:
      'Positive fuel trim may have several causes and depends on operating conditions.',
  },
  P0420: {
    title: 'Catalyst monitor efficiency concern',
    test: 'catalyst-verification',
    testTitle:
      'Check exhaust leaks and upstream/downstream sensor response before catalyst assessment',
    limitation: 'P0420 alone does not justify catalyst replacement.',
  },
  P0130: {
    title: 'Oxygen sensor circuit concern',
    test: 'oxygen-circuit-test',
    testTitle: 'Check sensor circuit and response using manufacturer procedure',
    limitation: 'Generic PID voltage is not valid for every wideband sensor.',
  },
  P0101: {
    title: 'MAF plausibility concern',
    test: 'maf-plausibility',
    testTitle:
      'Compare MAF against engine context; check intake leaks and circuit',
    limitation: 'No displacement-specific OEM airflow threshold is available.',
  },
  P0118: {
    title: 'Coolant-temperature circuit concern',
    test: 'coolant-circuit-test',
    testTitle:
      'Compare cold-soak temperature and inspect coolant sensor circuit',
    limitation:
      'Unavailable sensor data is not proof of an overheating engine.',
  },
};
export function analyzeEvidence(
  events: StoredEvent[],
  dtcs: DtcEvidence[],
  source: 'SIMULATOR' | 'IMPORT',
  revision: number,
): Analysis {
  const aggregate = aggregateEvidence(events);
  const findings: Finding[] = [];
  for (const dtc of dtcs) {
    const rule = DTC_RULES[dtc.code];
    findings.push({
      id: `dtc-${dtc.code}`,
      title:
        rule?.title ??
        `${dtc.code}: DTC captured; definition not in local knowledge set`,
      severity: 'WARNING',
      confidenceBasis: `Observed ${dtc.status.toLowerCase()} DTC; cause unconfirmed`,
      evidence: [
        `${dtc.code} (${dtc.status})`,
        ...Object.entries(dtc.freezeFrame).map(
          ([k, v]) => `Freeze frame ${k}: ${v}`,
        ),
      ],
      recommendedTests: [
        {
          id: rule?.test ?? `verify-${dtc.code}`,
          title:
            rule?.testTitle ??
            'Verify code definition and diagnostic procedure with licensed vehicle-specific service information',
        },
      ],
      limitations: [
        rule?.limitation ??
          'No OEM definition, repair procedure or parts fitment is available.',
      ],
    });
  }
  const add = (
    id: string,
    title: string,
    severity: Finding['severity'],
    evidence: string[],
    testId: string,
    testTitle: string,
    limitation: string,
  ) =>
    findings.push({
      id,
      title,
      severity,
      confidenceBasis:
        'Deterministic screening threshold; requires technician testing',
      evidence,
      recommendedTests: [{ id: testId, title: testTitle }],
      limitations: [limitation],
    });
  if (aggregate.coolantTemperature?.max > 110)
    add(
      'high-coolant',
      'Elevated coolant temperature',
      'URGENT',
      [`Maximum coolant ${aggregate.coolantTemperature.max} °C`],
      'cooling-system-check',
      'Safely inspect cooling system and verify temperature',
      'Stop safely if overheating is suspected; do not open a hot pressurized cooling system.',
    );
  if (aggregate.controlModuleVoltage?.min < 12.2)
    add(
      'low-voltage',
      'Low control-module voltage',
      'WARNING',
      [`Minimum module voltage ${aggregate.controlModuleVoltage.min} V`],
      'charging-system-check',
      'Measure battery and charging voltage under appropriate load',
      'OBD module voltage alone cannot diagnose battery or alternator failure.',
    );
  if (
    (aggregate.shortTermFuelTrim?.mean ?? 0) +
      (aggregate.longTermFuelTrim?.mean ?? 0) >
    25
  )
    add(
      'positive-fuel-trim',
      'Sustained positive fuel correction',
      'WARNING',
      [
        `STFT mean ${aggregate.shortTermFuelTrim?.mean}%; LTFT mean ${aggregate.longTermFuelTrim?.mean}%`,
      ],
      'lean-leak-test',
      'Check intake leaks, fuel pressure and sensor plausibility',
      'A generic threshold is a screening rule, not an OEM diagnosis.',
    );
  if (!aggregate.coolantTemperature)
    add(
      'missing-coolant',
      'Coolant-temperature evidence unavailable',
      'INFO',
      ['No accepted coolant readings'],
      'coolant-data-check',
      'Verify adapter support and coolant sensor response',
      'Missing data must not be substituted with zero.',
    );
  if (
    aggregate.rpm &&
    aggregate.coolantTemperature &&
    aggregate.coolantTemperature.count < aggregate.rpm.count
  )
    add(
      'sensor-dropout',
      'Incomplete coolant sample coverage',
      'WARNING',
      [
        `${aggregate.coolantTemperature.count} coolant samples vs ${aggregate.rpm.count} RPM samples`,
      ],
      'sensor-dropout-check',
      'Check support, sensor circuit and repeat synchronized capture',
      'Different polling rates can also cause unequal sample counts.',
    );
  if (
    aggregate.rpm &&
    aggregate.rpm.max - aggregate.rpm.min > 1000 &&
    aggregate.speed?.max === 0
  )
    add(
      'unstable-idle',
      'Wide stationary RPM variation',
      'WARNING',
      [`RPM range ${aggregate.rpm.min}–${aggregate.rpm.max}`],
      'idle-stability-check',
      'Confirm stationary operating context and inspect the signal quality and symptoms',
      'Noisy capture or intentional throttle input can explain this variation.',
    );
  const excluded = events.filter((e) => e.quality !== 'ACCEPTED').length;
  if (excluded)
    add(
      'data-quality',
      'Telemetry quality limits analysis',
      'WARNING',
      [`${excluded} late or clock-drift samples excluded`],
      'telemetry-quality-check',
      'Check adapter timestamps, connectivity and repeat data capture',
      'Excluded data remains evidence but cannot drive current signal averages.',
    );
  if (!findings.length)
    add(
      'no-rule-alert',
      'No alert triggered by the supported rules',
      'INFO',
      [`${events.length} validated samples; no captured DTCs`],
      'baseline-verification',
      'Confirm reported symptoms and perform applicable inspection',
      'This bounded generic scan does not prove the vehicle is fault-free or safe to drive.',
    );
  return {
    rulesVersion: RULES_VERSION,
    provider: 'DETERMINISTIC',
    analyzedRevision: revision,
    findings,
    source,
    limitations: [
      'No AI model, OEM manual, parts supplier, fitment database or labor-time provider was used.',
      source === 'SIMULATOR'
        ? 'SIMULATED vehicle data: demonstration and development only.'
        : 'Imported OBD data: transport and hardware authenticity are not independently verified.',
    ],
  };
}
