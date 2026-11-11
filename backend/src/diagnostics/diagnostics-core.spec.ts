import { BadRequestException, ConflictException } from '@nestjs/common';
import { decodeObd } from './obd/obd-decoder';
import { ingestEvents, MAX_EVENTS } from './obd/normalizer';
import { simulateScenario } from './simulator/simulator';
import { SCENARIOS } from './simulator/scenarios';
import { analyzeEvidence } from './rules/diagnostic-rules';
import { calculateEstimate } from './estimates/estimate-calculator';
import { canonicalReportJson } from './reports/report-integrity';
import { reportHtml } from './reports/diagnostic-report.service';
import type { ObdEvent } from './obd/telemetry.types';
const epoch = new Date('2026-01-01T12:00:00Z');
const event: ObdEvent = {
  eventId: 'reading',
  streamId: 'adapter',
  sequence: 0,
  observedAt: epoch.toISOString(),
  mode: 1,
  pid: 0x0c,
  bytes: [0x1a, 0xf8],
};
describe('OBD diagnostics deterministic core', () => {
  it('decodes known SAE Mode01 vectors with units', () => {
    expect(decodeObd(event)).toEqual({
      metric: 'rpm',
      unit: 'rpm',
      value: 1726,
    });
    expect(decodeObd({ ...event, pid: 5, bytes: [100] }).value).toBe(60);
    expect(decodeObd({ ...event, pid: 6, bytes: [160] }).value).toBe(25);
    expect(decodeObd({ ...event, pid: 0x42, bytes: [0x37, 0x14] }).value).toBe(
      14.1,
    );
  });
  it.each([
    { mode: 9 },
    { pid: 0xff },
    { bytes: [0] },
    { bytes: [NaN, 2] },
    { bytes: [256, 2] },
  ])('rejects unsupported/malformed packet %p', (change) => {
    expect(() => decodeObd({ ...event, ...change })).toThrow(
      BadRequestException,
    );
  });
  it('deduplicates exact canonical events and rejects changed payload reuse', () => {
    const stored = ingestEvents([], [event], epoch);
    expect(ingestEvents(stored, [{ ...event }], epoch)).toHaveLength(1);
    expect(() =>
      ingestEvents(stored, [{ ...event, bytes: [1, 2] }], epoch),
    ).toThrow(ConflictException);
  });
  it('retains late and clock-drift evidence without allowing it into analysis averages', () => {
    const latest = {
      ...event,
      observedAt: new Date(epoch.getTime() + 60000).toISOString(),
    };
    const stored = ingestEvents(
      [],
      [
        latest,
        { ...event, eventId: 'late' },
        {
          ...event,
          eventId: 'clock',
          observedAt: new Date(epoch.getTime() + 600000).toISOString(),
        },
      ],
      new Date(epoch.getTime() + 60000),
    );
    expect(stored.map((e) => e.quality)).toEqual([
      'ACCEPTED',
      'LATE',
      'CLOCK_DRIFT',
    ]);
  });
  it('caps ingestion rather than growing transactional raw storage indefinitely', () => {
    const many = Array.from({ length: MAX_EVENTS }, (_, i) => ({
      ...event,
      eventId: String(i),
    }));
    let result = ingestEvents([], many.slice(0, 250), epoch);
    for (let i = 250; i < MAX_EVENTS; i += 250)
      result = ingestEvents(result, many.slice(i, i + 250), epoch);
    expect(() =>
      ingestEvents(result, [{ ...event, eventId: 'overflow' }], epoch),
    ).toThrow(BadRequestException);
  });
  it.each(
    SCENARIOS.filter((s) => s.id !== 'malformed_packet').map((s) => [s.id]),
  )('replays supported simulator scenario %s deterministically', (scenario) => {
    const first = simulateScenario(scenario, 42, epoch);
    expect(first).toEqual(simulateScenario(scenario, 42, epoch));
    const stored = ingestEvents(
      [],
      first.events,
      new Date(epoch.getTime() + 12000),
    );
    const analysis = analyzeEvidence(stored, first.dtcs, 'SIMULATOR', 1);
    expect(analysis.source).toBe('SIMULATOR');
    expect(analysis.findings.length).toBeGreaterThan(0);
  });
  it('rejects malformed simulation through production decoder', () => {
    expect(() =>
      ingestEvents([], simulateScenario('malformed_packet').events, epoch),
    ).toThrow(BadRequestException);
  });
  it('does not turn a P0420 code into a catalyst-replacement instruction', () => {
    const simulation = simulateScenario('p0420', 1, epoch);
    const analysis = analyzeEvidence(
      ingestEvents([], simulation.events, new Date(epoch.getTime() + 12000)),
      simulation.dtcs,
      'SIMULATOR',
      1,
    );
    const catalyst = analysis.findings.find((f) => f.id === 'dtc-P0420');
    expect(catalyst?.limitations).toContain(
      'P0420 alone does not justify catalyst replacement.',
    );
    expect(catalyst?.recommendedTests[0].id).toBe('catalyst-verification');
  });
  it('uses explicit Decimal rounding and never invents parts fitment', () => {
    const result = calculateEstimate([
      {
        kind: 'LABOR',
        description: 'Inspection',
        quantity: '1.333',
        unitPrice: '100.05',
      },
      {
        kind: 'PART',
        description: 'Manual quotation',
        quantity: '1',
        unitPrice: '0.10',
      },
    ]);
    expect(result.subtotal).toBe('133.47');
    expect(result.tax).toBe('26.69');
    expect(result.total).toBe('160.16');
    expect(result.fitmentVerified).toBe(false);
    expect(() =>
      calculateEstimate([
        { kind: 'LABOR', description: 'bad', quantity: '0', unitPrice: '10' },
      ]),
    ).toThrow();
  });
  it('canonicalizes report keys without reordering evidence arrays', () => {
    expect(
      canonicalReportJson({ z: 1, a: { q: 2, b: 3 }, events: [2, 1] }),
    ).toBe(canonicalReportJson({ events: [2, 1], a: { b: 3, q: 2 }, z: 1 }));
    expect(
      canonicalReportJson({ mean: 14.099999999999996, price: '100.05' }),
    ).toBe(canonicalReportJson({ mean: 14.1, price: '100.05' }));
    expect(canonicalReportJson({ events: [2, 1] })).not.toBe(
      canonicalReportJson({ events: [1, 2] }),
    );
  });
  it('escapes malicious vehicle/test/item strings in customer-ready HTML', () => {
    const simulation = simulateScenario('normal_idle', 1, epoch);
    const analysis = analyzeEvidence(
      ingestEvents([], simulation.events, new Date(epoch.getTime() + 12000)),
      [],
      'SIMULATOR',
      1,
    );
    const html = reportHtml({
      vehicle: { brand: '<script>bad()</script>', model: 'Demo' },
      analysis,
      estimate: calculateEstimate([
        {
          kind: 'OTHER',
          description: '<img src="https://evil">',
          quantity: '1',
          unitPrice: '1',
        },
      ]),
      confirmation: {
        findingIds: ['no-rule-alert'],
        notes: '<iframe>',
        actorId: 'tester',
        confirmedAt: epoch.toISOString(),
      },
      testResults: [],
      provenance: 'SIMULATED',
      limitations: [],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=');
    expect(html).toContain('&lt;script&gt;');
  });
});
