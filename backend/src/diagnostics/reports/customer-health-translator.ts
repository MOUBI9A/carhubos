import type { SessionData } from '../obd/telemetry.types';
import { aggregateEvidence } from '../obd/normalizer';

export type SystemHealthStatus = 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
export type OverallHealthRating =
  | 'HEALTHY'
  | 'ATTENTION_NEEDED'
  | 'CRITICAL_ACTION_REQUIRED';
export type DriveUrgency = 'NORMAL' | 'WITHIN_48_HOURS' | 'IMMEDIATE';

export interface SubsystemHealth {
  systemKey: 'engine' | 'cooling' | 'emissions' | 'fuelAir' | 'electrical';
  name: string;
  status: SystemHealthStatus;
  laymanSummary: string;
  evidence: string[];
}

export interface CustomerHealthReport {
  overallRating: OverallHealthRating;
  canDrive: boolean;
  driveabilityAdvice: string;
  urgency: DriveUrgency;
  subsystems: SubsystemHealth[];
  qAndA: {
    whatHappened: string;
    whatNeedsRepair: string;
    whatHappensIfIgnored: string;
    estimatedRepairDuration: string;
    estimatedCostRangeMad: string;
  };
  provenance: {
    dtcCodes: string[];
    dtcCount: number;
    hasFreezeFrame: boolean;
    confidence: string;
    technicianConfirmed: boolean;
    timestamp: string;
  };
}

export function translateCustomerHealth(data: SessionData): CustomerHealthReport {
  const aggregate = aggregateEvidence(data.events);
  const dtcCodes = data.dtcs.map((d) => d.code.toUpperCase());
  const hasCriticalCooling =
    (aggregate.coolantTemperature?.max ?? 0) > 115 || dtcCodes.includes('P0118');
  const hasMisfire = dtcCodes.some((c) => c.startsWith('P030'));
  const hasCatalystFault = dtcCodes.includes('P0420');
  const hasLeanFuel = dtcCodes.includes('P0171') || dtcCodes.includes('P0174');
  const hasSensorCircuit = dtcCodes.some((c) =>
    ['P0130', 'P0135', 'P0101', 'P0118'].includes(c),
  );

  // Subsystems evaluation without false precision:
  const engineStatus: SystemHealthStatus = hasMisfire
    ? 'CRITICAL'
    : dtcCodes.length > 0
      ? 'ATTENTION'
      : 'HEALTHY';

  const coolingStatus: SystemHealthStatus = hasCriticalCooling
    ? 'CRITICAL'
    : (aggregate.coolantTemperature?.max ?? 0) > 105
      ? 'ATTENTION'
      : 'HEALTHY';

  const emissionsStatus: SystemHealthStatus = hasCatalystFault
    ? 'CRITICAL'
    : dtcCodes.some((c) => c.startsWith('P04') || c.startsWith('P013'))
      ? 'ATTENTION'
      : 'HEALTHY';

  const fuelAirStatus: SystemHealthStatus = hasLeanFuel
    ? 'ATTENTION'
    : dtcCodes.includes('P0101')
      ? 'ATTENTION'
      : 'HEALTHY';

  const electricalStatus: SystemHealthStatus = hasSensorCircuit
    ? 'ATTENTION'
    : 'HEALTHY';

  const hasCritical = [
    engineStatus,
    coolingStatus,
    emissionsStatus,
    fuelAirStatus,
    electricalStatus,
  ].includes('CRITICAL');

  const hasAttention = [
    engineStatus,
    coolingStatus,
    emissionsStatus,
    fuelAirStatus,
    electricalStatus,
  ].includes('ATTENTION');

  const overallRating: OverallHealthRating = hasCritical
    ? 'CRITICAL_ACTION_REQUIRED'
    : hasAttention
      ? 'ATTENTION_NEEDED'
      : 'HEALTHY';

  const canDrive = !hasCritical;

  let driveabilityAdvice =
    'Your vehicle exhibits no active warning faults. Safe for regular driving.';
  let urgency: DriveUrgency = 'NORMAL';

  if (hasCritical) {
    urgency = 'IMMEDIATE';
    driveabilityAdvice =
      'Immediate attention required. Do not drive long distances. Driving with active cylinder misfire or severe overheating risks permanent engine or exhaust failure.';
  } else if (hasAttention) {
    urgency = 'WITHIN_48_HOURS';
    driveabilityAdvice =
      'Vehicle can be driven short distances to a certified garage. Schedule diagnostic testing within 48 hours to prevent worsening wear.';
  }

  // Layman summaries for subsystems
  const subsystems: SubsystemHealth[] = [
    {
      systemKey: 'engine',
      name: 'Engine & Combustion',
      status: engineStatus,
      laymanSummary: hasMisfire
        ? 'One or more cylinders are not firing fuel evenly, causing power loss or hesitation.'
        : 'Engine combustion is operating within normal parameters.',
      evidence: dtcCodes.filter((c) => c.startsWith('P03')),
    },
    {
      systemKey: 'cooling',
      name: 'Cooling & Engine Temperature',
      status: coolingStatus,
      laymanSummary: hasCriticalCooling
        ? 'Coolant temperature reached abnormal levels or temperature sensor circuit has failed.'
        : 'Engine operating temperature remained within safe thermal range.',
      evidence: aggregate.coolantTemperature?.max
        ? [`Peak coolant temp: ${aggregate.coolantTemperature.max}°C`]
        : [],
    },
    {
      systemKey: 'emissions',
      name: 'Emissions & Exhaust Control',
      status: emissionsStatus,
      laymanSummary: hasCatalystFault
        ? 'Catalyst efficiency monitor indicates exhaust gases are not being cleaned efficiently.'
        : 'Exhaust monitoring systems are functioning properly.',
      evidence: dtcCodes.filter((c) => c.startsWith('P04') || c.startsWith('P013')),
    },
    {
      systemKey: 'fuelAir',
      name: 'Fuel Delivery & Air Intake',
      status: fuelAirStatus,
      laymanSummary: hasLeanFuel
        ? 'Engine computer is adding extra fuel to compensate for unmetered air or low fuel pressure.'
        : 'Fuel trims and air intake volume are well balanced.',
      evidence: dtcCodes.filter((c) => ['P0171', 'P0101'].includes(c)),
    },
    {
      systemKey: 'electrical',
      name: 'Sensors & Electrical Circuits',
      status: electricalStatus,
      laymanSummary: hasSensorCircuit
        ? 'Diagnostic computer noted irregular voltage signals from one or more engine sensors.'
        : 'Engine control modules and sensor reference voltages are stable.',
      evidence: dtcCodes.filter((c) => ['P0130', 'P0118', 'P0101'].includes(c)),
    },
  ];

  // Practical customer Q&A
  let whatHappened = 'All tested electronic control systems reported normal operations.';
  let whatNeedsRepair = 'No immediate repair required. Continue routine scheduled maintenance.';
  let whatHappensIfIgnored = 'No adverse consequence anticipated.';
  let estimatedRepairDuration = '0 hours';
  let estimatedCostRangeMad = '0 MAD';

  if (hasMisfire) {
    whatHappened =
      'The engine computer detected that cylinder combustion did not produce expected power stroke timing, likely due to an ignition coil, spark plug, or fuel delivery fault.';
    whatNeedsRepair =
      'A technician should swap/inspect the ignition coil and spark plug, check wiring harness, and verify compression if fault persists.';
    whatHappensIfIgnored =
      'Unburned fuel escapes into the exhaust, which will melt or destroy the catalytic converter within several days, multiplying repair expenses by 5x.';
    estimatedRepairDuration = '1.0 - 2.0 hours';
    estimatedCostRangeMad = data.estimate
      ? `${data.estimate.total} MAD (exact estimate)`
      : '450 - 1,200 MAD (typical parts & labor)';
  } else if (hasLeanFuel) {
    whatHappened =
      'The engine is receiving more air than fuel (lean condition). This often points to a vacuum leak in intake hoses or a dirty Mass Air Flow sensor.';
    whatNeedsRepair =
      'Smoke test the intake system for vacuum leaks and inspect the airflow meter voltage.';
    whatHappensIfIgnored =
      'Poor acceleration, engine pinging (detonation), and increased cylinder head temperature.';
    estimatedRepairDuration = '1.0 - 2.5 hours';
    estimatedCostRangeMad = '350 - 1,500 MAD';
  } else if (hasCriticalCooling) {
    whatHappened =
      'The engine is running hot or the temperature sensor signal dropped out completely.';
    whatNeedsRepair =
      'Check coolant level, thermostat operation, radiator cooling fan operation, and temperature sensor wiring.';
    whatHappensIfIgnored =
      'Severe engine overheating causes blown cylinder head gaskets or warped engine blocks.';
    estimatedRepairDuration = '1.5 - 3.0 hours';
    estimatedCostRangeMad = '300 - 1,800 MAD';
  }

  return {
    overallRating,
    canDrive,
    driveabilityAdvice,
    urgency,
    subsystems,
    qAndA: {
      whatHappened,
      whatNeedsRepair,
      whatHappensIfIgnored,
      estimatedRepairDuration,
      estimatedCostRangeMad,
    },
    provenance: {
      dtcCodes,
      dtcCount: dtcCodes.length,
      hasFreezeFrame: data.dtcs.some((d) => Object.keys(d.freezeFrame).length > 0),
      confidence: data.confirmation ? 'CONFIRMED_BY_TECHNICIAN' : 'EVIDENCE_PRELIMINARY',
      technicianConfirmed: !!data.confirmation,
      timestamp: new Date().toISOString(),
    },
  };
}
