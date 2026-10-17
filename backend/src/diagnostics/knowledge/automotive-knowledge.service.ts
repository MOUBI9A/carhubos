import { Injectable, NotFoundException } from '@nestjs/common';
import { DTC_KNOWLEDGE_BASE } from './dtc-knowledge-base';
import {
  DiagnosticSeverity,
  DtcKnowledgeEntry,
  TechnicianCopilotGuide,
  VehicleSystem,
} from './knowledge.types';

@Injectable()
export class AutomotiveKnowledgeService {
  /**
   * Retrieve a specific DTC knowledge entry by standard 5-character code.
   */
  getByCode(code: string): DtcKnowledgeEntry | null {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    return DTC_KNOWLEDGE_BASE[normalized] ?? null;
  }

  /**
   * Search knowledge base by code, title, subsystem, or symptom text.
   */
  search(query?: string, system?: VehicleSystem): DtcKnowledgeEntry[] {
    let entries = Object.values(DTC_KNOWLEDGE_BASE);

    if (system) {
      entries = entries.filter((e) => e.system === system);
    }

    if (!query || !query.trim()) {
      return entries;
    }

    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q) ||
        e.component.toLowerCase().includes(q) ||
        e.subsystem.toLowerCase().includes(q) ||
        e.probableCauses.some((c) => c.toLowerCase().includes(q)) ||
        e.symptoms.some((s) => s.toLowerCase().includes(q)),
    );
  }

  /**
   * List all entries within a specific vehicle system.
   */
  listBySystem(system: VehicleSystem): DtcKnowledgeEntry[] {
    return Object.values(DTC_KNOWLEDGE_BASE).filter((e) => e.system === system);
  }

  /**
   * Synthesize multiple active DTCs into a unified Technician Copilot Guide.
   * Correlates common root causes, prioritizes action steps, and calculates labor.
   */
  generateCopilotGuide(dtcCodes: string[]): TechnicianCopilotGuide {
    const uniqueCodes = Array.from(
      new Set(
        dtcCodes
          .filter((c) => typeof c === 'string' && c.trim().length > 0)
          .map((c) => c.trim().toUpperCase()),
      ),
    );

    const knownEntries = uniqueCodes
      .map((code) => this.getByCode(code))
      .filter((e): e is DtcKnowledgeEntry => e !== null);

    // If no known entries, return a safe fallback guide
    if (knownEntries.length === 0) {
      return {
        analyzedCodes: uniqueCodes,
        primarySystem: 'POWERTRAIN',
        overallSeverity: 'MODERATE',
        rootCauseHypothesis:
          'Detected DTC codes are outside standard onboard screening set. Verify code descriptions with OEM technical documentation.',
        correlatedFindings: uniqueCodes.map(
          (c) => `${c}: Unindexed DTC captured; perform standard pinout and circuit testing.`,
        ),
        prioritizedActionPlan: [
          {
            phase: 1,
            phaseName: 'Initial Diagnostic Screening',
            description: 'Record freeze frame records and perform visual inspection of wiring and fuses.',
            actionSteps: uniqueCodes.map((c) => ({
              dtcCode: c,
              stepTitle: `Verify ${c} with OEM Service Manual`,
              procedure: 'Inspect harness, verify connector seating, and read live sensor parameters.',
              expectedValue: 'Within OEM specified voltage and resistance bands',
              tool: 'Diagnostic Scan Tool & DMM',
              type: 'SCAN_TOOL',
            })),
          },
        ],
        estimatedTotalLaborHours: Math.max(1.0, uniqueCodes.length * 0.5),
        requiredTools: ['OBD-II Scan Tool', 'Digital Multimeter'],
        moroccanFieldAlerts: [
          'Verify battery state-of-charge (>12.4V) before diagnosing electronic control codes.',
        ],
        safetyWarnings: ['Exercise appropriate high-voltage and hot exhaust precautions.'],
      };
    }

    // Determine overall severity
    const severities: DiagnosticSeverity[] = ['CRITICAL', 'MAJOR', 'MODERATE', 'MINOR'];
    const overallSeverity =
      severities.find((s) => knownEntries.some((e) => e.severity === s)) ?? 'MODERATE';

    // Determine primary system by frequency
    const systemCounts = knownEntries.reduce((acc, e) => {
      acc[e.system] = (acc[e.system] || 0) + 1;
      return acc;
    }, {} as Record<VehicleSystem, number>);

    const primarySystem = (Object.keys(systemCounts) as VehicleSystem[]).reduce((a, b) =>
      systemCounts[a] >= systemCounts[b] ? a : b,
    );

    // Root cause correlation rules
    const codesSet = new Set(uniqueCodes);
    let rootCauseHypothesis = '';
    const correlatedFindings: string[] = [];

    if (codesSet.has('P0300') && codesSet.has('P0171')) {
      rootCauseHypothesis =
        'CORRELATED LEAN MISFIRE: Sustained positive fuel trim (P0171) is directly inducing random/multiple misfires (P0300). Root cause is likely an unmetered intake vacuum leak or restricted fuel delivery, NOT ignition coil failure.';
      correlatedFindings.push(
        'Intake vacuum leak (PCV, intake boot) or low fuel rail pressure is starving cylinders of fuel.',
        'Do not replace ignition coils or spark plugs until vacuum integrity is confirmed via smoke test.',
      );
    } else if (codesSet.has('P2463') && (codesSet.has('P0401') || codesSet.has('P0299'))) {
      rootCauseHypothesis =
        'DIESEL INDUCTION & EXHAUST SYSTEM SOOT ACCUMULATION: Severe particulate filter blockage (P2463) with correlated EGR/Turbo restriction. Heavy urban driving has prevented passive regeneration.',
      correlatedFindings.push(
        'DPF soot mass exceeds safe passive burn threshold; check differential pressure sensor hoses.',
        'Inspect EGR valve and cooler for heavy carbon sludge restriction.',
      );
    } else if (codesSet.has('U0100') || codesSet.has('U0121')) {
      rootCauseHypothesis =
        'CAN COMMUNICATION / POWER DISTRIBUTION DROPOUT: Loss of module heartbeat suggests main fuse/relay failure or damaged twisted-pair CAN network line.',
      correlatedFindings.push(
        'Measure 60 Ω termination resistance at DLC pins 6 & 14 before condemning modules.',
        'Check engine bay fuse/relay box for water ingress or corrosion from pressure washing.',
      );
    } else if (codesSet.has('C0035') && codesSet.has('C006B')) {
      rootCauseHypothesis =
        'CHASSIS SPEED SENSOR & STABILITY FAULT: Left front wheel speed sensor dropout is disabling ESP/ABS. Tone ring or harness damage on front wheel.',
      correlatedFindings.push(
        'Inspect LF wheel bearing magnetic encoder for reverse installation or dirt contamination.',
      );
    } else {
      rootCauseHypothesis = `Multiple diagnostic trouble codes active across ${primarySystem.toLowerCase()} subsystem. Follow prioritized phase-based testing to isolate primary root cause.`;
      correlatedFindings.push(...knownEntries.map((e) => `${e.code}: ${e.title}`));
    }

    // Build Phased Action Plan
    // Phase 1: Scan Tool & Visual Verification
    const phase1Steps = knownEntries.flatMap((e) =>
      [...e.electricalTests, ...e.mechanicalTests]
        .filter((t) => t.type === 'SCAN_TOOL' || t.type === 'VISUAL')
        .map((t) => ({
          dtcCode: e.code,
          stepTitle: `${e.code} - ${t.title}`,
          procedure: t.procedure,
          expectedValue: t.expectedValue,
          tool: t.tool,
          type: t.type,
        })),
    );

    // Phase 2: Electrical & Resistance Testing
    const phase2Steps = knownEntries.flatMap((e) =>
      e.electricalTests
        .filter((t) => t.type === 'ELECTRICAL')
        .map((t) => ({
          dtcCode: e.code,
          stepTitle: `${e.code} - ${t.title}`,
          procedure: t.procedure,
          expectedValue: t.expectedValue,
          tool: t.tool,
          type: t.type,
        })),
    );

    // Phase 3: Mechanical & Pressure Testing
    const phase3Steps = knownEntries.flatMap((e) =>
      e.mechanicalTests
        .filter((t) => t.type === 'MECHANICAL')
        .map((t) => ({
          dtcCode: e.code,
          stepTitle: `${e.code} - ${t.title}`,
          procedure: t.procedure,
          expectedValue: t.expectedValue,
          tool: t.tool,
          type: t.type,
        })),
    );

    // Phase 4: Repair & Adaptation
    const phase4Steps = knownEntries.map((e) => ({
      dtcCode: e.code,
      stepTitle: `Service Procedure: ${e.component}`,
      procedure: e.standardRepairProcedure,
      expectedValue: e.torqueSpecs ? `Torque: ${e.torqueSpecs}` : 'System cleared & adaptation relearned',
      tool: e.specialTools[0] || 'Standard Technician Hand Tools',
      type: 'MECHANICAL' as const,
    }));

    const prioritizedActionPlan = [
      {
        phase: 1,
        phaseName: 'Phase 1: Non-Invasive Screening & Visual Inspection',
        description: 'Verify live sensor parameters, freeze frame data, and physical harness/hose condition.',
        actionSteps: phase1Steps,
      },
      {
        phase: 2,
        phaseName: 'Phase 2: Electrical Pinout & Resistance Verification',
        description: 'Back-probe circuits with DMM or scope to confirm 5V reference, ground, and coil resistance.',
        actionSteps: phase2Steps,
      },
      {
        phase: 3,
        phaseName: 'Phase 3: Mechanical & Pressure Verification',
        description: 'Execute smoke leakdown, fuel pressure, compression, or vacuum testing.',
        actionSteps: phase3Steps,
      },
      {
        phase: 4,
        phaseName: 'Phase 4: Component Repair, Torque Specs & Post-Repair Relearn',
        description: 'Execute component replacement to factory torque specs, clear DTCs, and perform drive cycle.',
        actionSteps: phase4Steps,
      },
    ].filter((p) => p.actionSteps.length > 0);

    // Labor calculation with shared setup deduction
    const rawLabor = knownEntries.reduce((sum, e) => sum + e.estimatedLaborHours, 0);
    // When multiple DTCs are worked simultaneously in the same bay, deduct 15% overlap
    const totalLabor = knownEntries.length > 1 ? Math.round(rawLabor * 0.85 * 10) / 10 : rawLabor;

    // Deduplicate tools
    const toolSet = new Set<string>();
    for (const entry of knownEntries) {
      entry.specialTools.forEach((t) => toolSet.add(t));
      entry.electricalTests.forEach((t) => toolSet.add(t.tool));
      entry.mechanicalTests.forEach((t) => toolSet.add(t.tool));
    }

    // Deduplicate Moroccan Field Alerts
    const alertsSet = new Set<string>();
    for (const entry of knownEntries) {
      if (entry.moroccanOperatingContext.fieldNotes) {
        alertsSet.add(`[${entry.code}] ${entry.moroccanOperatingContext.fieldNotes}`);
      }
      if (entry.moroccanOperatingContext.climateRisk) {
        alertsSet.add(`[Climate] ${entry.moroccanOperatingContext.climateRisk}`);
      }
      if (entry.moroccanOperatingContext.fuelQualityFactor && entry.moroccanOperatingContext.fuelQualityFactor !== 'N/A') {
        alertsSet.add(`[Fuel Quality] ${entry.moroccanOperatingContext.fuelQualityFactor}`);
      }
    }

    // Safety warnings
    const safetySet = new Set<string>();
    for (const entry of knownEntries) {
      entry.electricalTests.forEach((t) => {
        if (t.safetyCaution) safetySet.add(t.safetyCaution);
      });
      if (entry.system === 'BODY' && entry.code.startsWith('B00')) {
        safetySet.add('SRS AIRBAG SYSTEM: Disconnect battery and wait 10 minutes before probing any yellow connectors.');
      }
      if (entry.subsystem.toLowerCase().includes('cool')) {
        safetySet.add('COOLING SYSTEM: Never open pressurized reservoir or radiator cap when engine is hot.');
      }
    }

    return {
      analyzedCodes: uniqueCodes,
      primarySystem,
      overallSeverity,
      rootCauseHypothesis,
      correlatedFindings,
      prioritizedActionPlan,
      estimatedTotalLaborHours: totalLabor,
      requiredTools: Array.from(toolSet),
      moroccanFieldAlerts: Array.from(alertsSet),
      safetyWarnings: Array.from(safetySet),
    };
  }
}
