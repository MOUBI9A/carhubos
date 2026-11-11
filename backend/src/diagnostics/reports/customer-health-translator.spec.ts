import { translateCustomerHealth } from './customer-health-translator';
import { emptySessionData, type SessionData, type StoredEvent } from '../obd/telemetry.types';

function makeStoredEvent(metric: string, value: number, unit = ''): StoredEvent {
  return {
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    streamId: 'stream-1',
    sequence: 1,
    observedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    mode: 1,
    pid: 5,
    bytes: [0],
    hash: 'hash-abc',
    observation: { metric, value, unit },
    quality: 'ACCEPTED',
  };
}

describe('CustomerHealthTranslator', () => {
  it('translates clean session with no faults as healthy with normal driving advice', () => {
    const session: SessionData = {
      ...emptySessionData(),
      events: [
        makeStoredEvent('engineRpm', 1200, 'rpm'),
        makeStoredEvent('vehicleSpeed', 45, 'km/h'),
        makeStoredEvent('coolantTemperature', 87, 'C'),
      ],
    };

    const result = translateCustomerHealth(session);
    expect(result.overallRating).toBe('HEALTHY');
    expect(result.canDrive).toBe(true);
    expect(result.urgency).toBe('NORMAL');
    expect(result.subsystems.every((s) => s.status === 'HEALTHY')).toBe(true);
  });

  it('translates P0301 misfire into CRITICAL engine warning with clear customer advice', () => {
    const session: SessionData = {
      ...emptySessionData(),
      dtcs: [
        {
          code: 'P0301',
          status: 'CONFIRMED',
          freezeFrame: { coolantTemp: 88, rpm: 2100 },
          freezeFrameSource: 'SIMULATED',
        },
      ],
      events: [
        makeStoredEvent('engineRpm', 2100, 'rpm'),
        makeStoredEvent('coolantTemperature', 88, 'C'),
      ],
    };

    const result = translateCustomerHealth(session);
    expect(result.overallRating).toBe('CRITICAL_ACTION_REQUIRED');
    expect(result.canDrive).toBe(false);
    expect(result.urgency).toBe('IMMEDIATE');
    expect(result.subsystems.find((s) => s.systemKey === 'engine')?.status).toBe('CRITICAL');
    expect(result.qAndA.whatHappensIfIgnored).toContain('catalytic converter');
    expect(result.provenance.dtcCodes).toContain('P0301');
  });

  it('translates coolant temperature above 115 into CRITICAL cooling alert', () => {
    const session: SessionData = {
      ...emptySessionData(),
      events: [
        makeStoredEvent('coolantTemperature', 118, 'C'),
      ],
    };

    const result = translateCustomerHealth(session);
    expect(result.overallRating).toBe('CRITICAL_ACTION_REQUIRED');
    expect(result.subsystems.find((s) => s.systemKey === 'cooling')?.status).toBe('CRITICAL');
    expect(result.qAndA.whatHappensIfIgnored).toContain('overheating');
  });

  it('translates P0171 lean condition into ATTENTION with vacuum leak explanation', () => {
    const session: SessionData = {
      ...emptySessionData(),
      dtcs: [
        {
          code: 'P0171',
          status: 'PENDING',
          freezeFrame: { stft: 18.5, ltft: 22.0 },
          freezeFrameSource: 'SIMULATED',
        },
      ],
      events: [
        makeStoredEvent('coolantTemperature', 89, 'C'),
      ],
    };

    const result = translateCustomerHealth(session);
    expect(result.overallRating).toBe('ATTENTION_NEEDED');
    expect(result.canDrive).toBe(true);
    expect(result.urgency).toBe('WITHIN_48_HOURS');
    expect(result.subsystems.find((s) => s.systemKey === 'fuelAir')?.status).toBe('ATTENTION');
    expect(result.qAndA.whatHappened).toContain('lean condition');
  });
});
