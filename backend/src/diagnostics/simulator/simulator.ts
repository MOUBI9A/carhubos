import { BadRequestException } from '@nestjs/common';
import type { DtcEvidence, ObdEvent } from '../obd/telemetry.types';
import { SCENARIOS } from './scenarios';
const two = (value: number) => [(value >>> 8) & 255, value & 255];
export function simulateScenario(
  scenario: string,
  seed = 1,
  start = new Date('2026-01-01T12:00:00Z'),
) {
  if (!SCENARIOS.some((s) => s.id === scenario))
    throw new BadRequestException('Unknown simulator scenario');
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const events: ObdEvent[] = [];
  const connectionEvents: { type: string; at: string }[] = [];
  const codeMap: Record<string, string[]> = {
    p0300: ['P0300'],
    p0301: ['P0301'],
    p0171: ['P0171'],
    p0420: ['P0420'],
    o2_sensor: ['P0130'],
    abnormal_maf: ['P0101'],
    coolant_sensor_failure: ['P0118'],
    multiple_dtcs: ['P0300', 'P0171'],
    intermittent_fault: ['P0301'],
  };
  for (let tick = 0; tick < 12; tick++) {
    if (
      (scenario === 'connection_loss' || scenario === 'reconnection') &&
      tick >= 4 &&
      tick < 7
    )
      continue;
    const driving =
      scenario === 'city_driving' || scenario === 'highway_driving';
    const cold = scenario === 'cold_start';
    const rpm = Math.round(
      driving ? 1800 + random() * 700 : 780 + random() * 60,
    );
    const speed =
      scenario === 'highway_driving'
        ? 100 + Math.round(random() * 15)
        : scenario === 'city_driving'
          ? Math.round(random() * 50)
          : 0;
    const coolant =
      scenario === 'overheating'
        ? 112 + tick
        : cold
          ? 15 + tick * 3
          : 88 + Math.round(random() * 3);
    const lean =
      scenario === 'p0171' ||
      scenario === 'fuel_trim' ||
      scenario === 'multiple_dtcs';
    const voltage =
      scenario === 'low_battery'
        ? 11.3
        : scenario === 'alternator_failure'
          ? 11.8
          : 14.1;
    const signals: [number, number[]][] = [
      [0x0c, two(rpm * 4)],
      [0x0d, [speed]],
      [0x05, [coolant + 40]],
      [0x06, [lean ? 160 : 130]],
      [0x07, [lean ? 154 : 129]],
      [
        0x10,
        two(
          Math.round(
            (scenario === 'abnormal_maf' ? 0.1 : driving ? 20 : 3.5) * 100,
          ),
        ),
      ],
      [0x0b, [driving ? 70 : 35]],
      [0x11, [driving ? 80 : 12]],
      [0x04, [driving ? 100 : 35]],
      [
        0x14,
        [scenario === 'o2_sensor' ? 0 : Math.round(60 + random() * 110), 128],
      ],
      [0x42, two(Math.round(voltage * 1000))],
    ];
    for (const [pid, bytes] of signals) {
      if (
        (scenario === 'sensor_dropout' ||
          scenario === 'coolant_sensor_failure') &&
        pid === 0x05 &&
        tick >= 3
      )
        continue;
      if (scenario === 'noisy_data' && pid === 0x0c)
        bytes.splice(0, 2, ...two(Math.round((500 + random() * 2000) * 4)));
      const streamId =
        scenario === 'reconnection' && tick >= 7
          ? 'simulator-b'
          : 'simulator-a';
      const observedAt = new Date(
        start.getTime() +
          tick * 1000 +
          (scenario === 'clock_drift' ? 600_000 : 0),
      ).toISOString();
      events.push({
        eventId: `${scenario}-${tick}-${pid}`,
        streamId,
        sequence: tick * 11 + signals.findIndex((s) => s[0] === pid),
        observedAt,
        mode: 1,
        pid,
        bytes,
      });
    }
  }
  if (scenario === 'malformed_packet')
    events.push({
      eventId: 'malformed',
      streamId: 'simulator-a',
      sequence: 999,
      observedAt: start.toISOString(),
      mode: 1,
      pid: 0x0c,
      bytes: [255],
    });
  if (scenario === 'duplicate_event')
    events.push({ ...events[0], bytes: [...events[0].bytes] });
  if (scenario === 'late_event')
    events.push({
      ...events[0],
      eventId: 'late',
      sequence: 999,
      observedAt: new Date(start.getTime() - 60_000).toISOString(),
    });
  if (scenario === 'out_of_order') events.reverse();
  if (scenario === 'connection_loss' || scenario === 'reconnection') {
    connectionEvents.push({
      type: 'DISCONNECTED',
      at: new Date(start.getTime() + 4000).toISOString(),
    });
    if (scenario === 'reconnection')
      connectionEvents.push({
        type: 'RECONNECTED',
        at: new Date(start.getTime() + 7000).toISOString(),
      });
  }
  const freezeFrame = {
    rpm: 800,
    coolantTemperature: 88,
    speed: 0,
    shortTermFuelTrim: scenario === 'p0171' ? 25 : 1.5625,
    longTermFuelTrim: scenario === 'p0171' ? 20.3125 : 0.78125,
  };
  const dtcs: DtcEvidence[] = (codeMap[scenario] ?? []).map((code) => ({
    code,
    status: scenario === 'intermittent_fault' ? 'PENDING' : 'CONFIRMED',
    freezeFrame,
    freezeFrameSource: 'SIMULATED',
  }));
  return { events, dtcs, connectionEvents };
}
