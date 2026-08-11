process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-credentials-encryption-key-2026';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TelematicsService } from './telematics.service';
import { encryptSecret } from '../common/crypto';

/**
 * The safety interlock is the whole point of this module, so it gets the
 * bulk of the coverage: immobilizing a vehicle is a physical act on a
 * customer's car, and the failure mode of a bug here is someone's engine
 * being disabled at the wrong moment — or a refusal going unrecorded when a
 * dispute later depends on it.
 *
 * Mocked Prisma + a stub adapter: what is under test is the DECISION logic
 * (which states are refused, what gets persisted, what reaches the audit
 * log), not the DB or any vendor's HTTP dialect.
 */
const AGENCY = 'agency-1';
const CAR = 'car-1';
const ACTOR = 'actor-1';
const REASON = 'Renter 6 days overdue and unreachable by phone.';

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

/** A vehicle parked with a fresh fix — the only state that may be immobilized. */
function safeState(overrides: Record<string, any> = {}) {
  return {
    latitude: 33.57,
    longitude: -7.58,
    speedKph: 0,
    ignitionOn: false,
    lastFixAt: new Date(),
    online: true,
    batteryPercent: 80,
    odometerKm: 42_000,
    ...overrides,
  };
}

/**
 * Wires a service whose provider is MOCK (so buildAdapter succeeds) but whose
 * adapter methods we control, by stubbing getVehicleState/immobilize on the
 * instance the service builds.
 */
function makeService(opts: {
  state?: any;
  car?: any;
  integration?: any;
  immobilizeImpl?: jest.Mock;
  restoreImpl?: jest.Mock;
}) {
  const commandCreate = jest.fn((args: any) =>
    Promise.resolve({ id: 'cmd-1', ...args.data }),
  );
  const prisma = {
    car: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          opts.car === undefined
            ? { id: CAR, telematicsDeviceId: 'device-9' }
            : opts.car,
        ),
      update: jest.fn().mockResolvedValue({ id: CAR }),
    },
    telematicsIntegration: {
      findUnique: jest.fn().mockResolvedValue(
        opts.integration === undefined
          ? {
              provider: 'MOCK',
              baseUrl: null,
              status: 'ACTIVE',
              credentials: encryptSecret('{}'),
            }
          : opts.integration,
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    telematicsCommand: {
      create: commandCreate,
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const audit = makeAudit();
  const svc = new TelematicsService(prisma as any, audit as any);

  const immobilize =
    opts.immobilizeImpl ?? jest.fn().mockResolvedValue({ providerRef: 'p-1' });
  const restore =
    opts.restoreImpl ?? jest.fn().mockResolvedValue({ providerRef: 'p-2' });

  // Intercept adapter construction so the decision logic runs against a
  // controlled vehicle state.
  jest.spyOn(svc as any, 'buildAdapter').mockReturnValue({
    provider: 'MOCK',
    testConnection: jest.fn().mockResolvedValue(undefined),
    getVehicleState: jest
      .fn()
      .mockResolvedValue(opts.state ?? safeState()),
    immobilize,
    restoreMobility: restore,
  });

  return { svc, prisma, audit, commandCreate, immobilize, restore };
}

describe('TelematicsService.immobilize — safety interlock', () => {
  it('sends the command when the vehicle is stopped, ignition off, on a fresh fix', async () => {
    const { svc, immobilize, commandCreate, audit } = makeService({});

    const cmd = await svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON });

    expect(immobilize).toHaveBeenCalledWith('device-9');
    expect(commandCreate.mock.calls[0][0].data).toMatchObject({
      type: 'IMMOBILIZE',
      status: 'SENT',
      reason: REASON,
      requestedByUserId: ACTOR,
    });
    expect(audit.log).toHaveBeenCalledWith(
      AGENCY,
      ACTOR,
      'TELEMATICS_IMMOBILIZE',
      'CAR',
      CAR,
      null,
      expect.objectContaining({ reason: REASON }),
    );
    expect(cmd).toBeDefined();
  });

  it('REFUSES while the vehicle is moving, and never reaches the provider', async () => {
    const { svc, immobilize } = makeService({
      state: safeState({ speedKph: 84 }),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(immobilize).not.toHaveBeenCalled();
  });

  it('REFUSES on a stale fix — a 0 km/h reading from an hour ago proves nothing', async () => {
    const { svc, immobilize } = makeService({
      state: safeState({ lastFixAt: new Date(Date.now() - 60 * 60 * 1000) }),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toThrow(/stale/i);
    expect(immobilize).not.toHaveBeenCalled();
  });

  it('REFUSES when the device has never had a GPS fix', async () => {
    const { svc, immobilize } = makeService({
      state: safeState({ lastFixAt: null, latitude: null, longitude: null }),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toThrow(/no GPS fix has ever been received/i);
    expect(immobilize).not.toHaveBeenCalled();
  });

  it('REFUSES while the ignition is still on', async () => {
    const { svc, immobilize } = makeService({
      state: safeState({ ignitionOn: true }),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toThrow(/ignition/i);
    expect(immobilize).not.toHaveBeenCalled();
  });

  it('reports "moving" ahead of "stale" when both are true (most alarming first)', async () => {
    const { svc } = makeService({
      state: safeState({
        speedKph: 110,
        lastFixAt: new Date(Date.now() - 60 * 60 * 1000),
      }),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toThrow(/moving/i);
  });

  it('tolerates GPS jitter at a standstill (2 km/h is still stopped)', async () => {
    const { svc, immobilize } = makeService({
      state: safeState({ speedKph: 2 }),
    });

    await svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON });
    expect(immobilize).toHaveBeenCalled();
  });

  it('PERSISTS a refusal with the telemetry it decided on — refusals are never silent', async () => {
    const { svc, commandCreate, audit } = makeService({
      state: safeState({ speedKph: 90 }),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(commandCreate.mock.calls[0][0].data).toMatchObject({
      type: 'IMMOBILIZE',
      status: 'REJECTED',
      speedKphAtRequest: 90,
      reason: REASON,
    });
    expect(audit.log).toHaveBeenCalledWith(
      AGENCY,
      ACTOR,
      'TELEMATICS_IMMOBILIZE_REFUSED',
      'CAR',
      CAR,
      null,
      expect.objectContaining({ speedKph: 90 }),
    );
  });

  it('records FAILED (not SENT) when the provider call throws, and rethrows', async () => {
    const { svc, commandCreate } = makeService({
      immobilizeImpl: jest.fn().mockRejectedValue(new Error('device offline')),
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toThrow('device offline');

    expect(commandCreate.mock.calls[0][0].data).toMatchObject({
      status: 'FAILED',
      failureReason: 'device offline',
    });
  });
});

describe('TelematicsService.restoreMobility', () => {
  it('is NOT gated on the safety interlock — releasing is the safe direction', async () => {
    // Moving + stale fix: every immobilize guard would refuse this.
    const { svc, restore, commandCreate } = makeService({
      state: safeState({
        speedKph: 130,
        lastFixAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      }),
    });

    await svc.restoreMobility(AGENCY, CAR, ACTOR, { reason: REASON });

    expect(restore).toHaveBeenCalledWith('device-9');
    expect(commandCreate.mock.calls[0][0].data).toMatchObject({
      type: 'RESTORE_MOBILITY',
      status: 'SENT',
    });
  });

  it('still releases when live state cannot be read at all', async () => {
    const { svc, restore } = makeService({});
    // Make the state read blow up — a stranded renter must not stay stranded
    // because the tracker has no signal.
    const adapter = (svc as any).buildAdapter();
    adapter.getVehicleState.mockRejectedValue(new Error('no signal'));

    await svc.restoreMobility(AGENCY, CAR, ACTOR, { reason: REASON });
    expect(restore).toHaveBeenCalled();
  });
});

describe('TelematicsService — tenant scoping and preconditions', () => {
  it('404s a car from another agency (no existence leak)', async () => {
    const { svc } = makeService({ car: null });

    await expect(
      svc.immobilize(AGENCY, 'someone-elses-car', ACTOR, { reason: REASON }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes the car lookup by agencyId', async () => {
    const { svc, prisma } = makeService({});
    await svc.getCarState(AGENCY, CAR);
    expect(prisma.car.findFirst.mock.calls[0][0].where).toEqual({
      id: CAR,
      agencyId: AGENCY,
    });
  });

  it('400s a car with no device linked', async () => {
    const { svc } = makeService({
      car: { id: CAR, telematicsDeviceId: null },
    });

    await expect(
      svc.immobilize(AGENCY, CAR, ACTOR, { reason: REASON }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('503s when the agency has connected no GPS provider', async () => {
    const { svc } = makeService({ integration: null });

    await expect(svc.getCarState(AGENCY, CAR)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('503s when the integration is DISABLED', async () => {
    const { svc } = makeService({
      integration: {
        provider: 'MOCK',
        baseUrl: null,
        status: 'DISABLED',
        credentials: encryptSecret('{}'),
      },
    });

    await expect(svc.getCarState(AGENCY, CAR)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('TelematicsService.getIntegration — credential exposure', () => {
  it('never selects the credentials column into an API-facing response', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const prisma = { telematicsIntegration: { findUnique } };
    const svc = new TelematicsService(prisma as any, makeAudit() as any);

    await svc.getIntegration(AGENCY);

    const select = findUnique.mock.calls[0][0].select;
    expect(select.credentials).toBeUndefined();
    expect(select.provider).toBe(true);
  });
});
