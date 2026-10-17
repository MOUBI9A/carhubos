import { AutomotiveKnowledgeService } from './automotive-knowledge.service';

describe('AutomotiveKnowledgeService', () => {
  let service: AutomotiveKnowledgeService;

  beforeEach(() => {
    service = new AutomotiveKnowledgeService();
  });

  describe('DTC Code Lookup', () => {
    it('retrieves detailed technical entry for P0300 case-insensitively', () => {
      const entry = service.getByCode('p0300');
      expect(entry).not.toBeNull();
      expect(entry?.code).toBe('P0300');
      expect(entry?.system).toBe('POWERTRAIN');
      expect(entry?.severity).toBe('MAJOR');
      expect(entry?.electricalTests.length).toBeGreaterThan(0);
      expect(entry?.mechanicalTests.length).toBeGreaterThan(0);
      expect(entry?.moroccanOperatingContext.fieldNotes).toBeDefined();
    });

    it('retrieves diesel DPF entry for P2463 with Moroccan city driving context', () => {
      const entry = service.getByCode('P2463');
      expect(entry).not.toBeNull();
      expect(entry?.code).toBe('P2463');
      expect(entry?.severity).toBe('CRITICAL');
      expect(entry?.subsystem).toContain('DPF');
      expect(entry?.moroccanOperatingContext.climateRisk).toContain('Casablanca');
    });

    it('returns null for unknown DTC code', () => {
      expect(service.getByCode('P9999')).toBeNull();
      expect(service.getByCode('')).toBeNull();
    });
  });

  describe('Fuzzy Search and System Filtering', () => {
    it('searches by keyword across code, title, and components', () => {
      const misfires = service.search('misfire');
      expect(misfires.length).toBeGreaterThanOrEqual(2);
      expect(misfires.some((e) => e.code === 'P0300')).toBe(true);

      const dpfResults = service.search('particulate');
      expect(dpfResults.some((e) => e.code === 'P2463')).toBe(true);
    });

    it('filters entries by vehicle system', () => {
      const chassis = service.listBySystem('CHASSIS');
      expect(chassis.length).toBeGreaterThanOrEqual(2);
      expect(chassis.every((e) => e.system === 'CHASSIS')).toBe(true);

      const network = service.listBySystem('NETWORK');
      expect(network.some((e) => e.code === 'U0100')).toBe(true);
    });
  });

  describe('Technician Copilot Multi-Code Synthesis', () => {
    it('correlates P0300 + P0171 into a lean misfire hypothesis with smoke test priority', () => {
      const guide = service.generateCopilotGuide(['P0300', 'P0171']);

      expect(guide.analyzedCodes).toEqual(['P0300', 'P0171']);
      expect(guide.overallSeverity).toBe('MAJOR');
      expect(guide.rootCauseHypothesis).toContain('CORRELATED LEAN MISFIRE');
      expect(guide.correlatedFindings.some((f) => f.includes('vacuum integrity'))).toBe(true);

      // Tool checklist must include smoke machine
      expect(guide.requiredTools.some((t) => t.toLowerCase().includes('smoke'))).toBe(true);

      // Phased action plan should have 4 phases
      expect(guide.prioritizedActionPlan.length).toBe(4);
      expect(guide.prioritizedActionPlan[0].phaseName).toContain('Phase 1');

      // Labor should incorporate multi-code synergy discount (< sum of individual)
      const p300 = service.getByCode('P0300')!.estimatedLaborHours;
      const p171 = service.getByCode('P0171')!.estimatedLaborHours;
      expect(guide.estimatedTotalLaborHours).toBeLessThan(p300 + p171);
    });

    it('flags Moroccan urban traffic risks for diesel DPF soot accumulation (P2463)', () => {
      const guide = service.generateCopilotGuide(['P2463', 'P0401']);

      expect(guide.overallSeverity).toBe('CRITICAL');
      expect(guide.rootCauseHypothesis).toContain('DIESEL INDUCTION');
      expect(guide.moroccanFieldAlerts.some((a) => a.includes('Casablanca'))).toBe(true);
    });

    it('synthesizes airbag safety warning for B0001', () => {
      const guide = service.generateCopilotGuide(['B0001']);

      expect(guide.overallSeverity).toBe('CRITICAL');
      expect(guide.primarySystem).toBe('BODY');
      expect(guide.safetyWarnings.some((w) => w.includes('AIRBAG'))).toBe(true);
    });

    it('handles unknown codes gracefully without throwing', () => {
      const guide = service.generateCopilotGuide(['P9999', 'U9999']);

      expect(guide.analyzedCodes).toEqual(['P9999', 'U9999']);
      expect(guide.prioritizedActionPlan.length).toBeGreaterThan(0);
      expect(guide.estimatedTotalLaborHours).toBeGreaterThan(0);
    });
  });
});
