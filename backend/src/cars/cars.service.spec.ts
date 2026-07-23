import { ConflictException } from '@nestjs/common';
import { CarsService } from './cars.service';

/**
 * Coverage for MASTER_BACKLOG §4 ("cars — unique-plate constraint, tenant
 * scoping") + the P2 unbounded-list cap on findAll. findOne's cross-tenant
 * 404 is already covered in common/multi-tenant-boundary.spec.ts — not
 * duplicated here.
 */
function makeServices() {
  return {
    auditLogs: { log: jest.fn() },
    entitlements: {
      assertOperating: jest.fn().mockResolvedValue(undefined),
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('CarsService.create — unique license plate', () => {
  it('409s a duplicate plate within the same agency (scoped by agencyId, not global)', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'existing-car' });
    const create = jest.fn();
    const services = makeServices();
    const svc = new CarsService(
      { car: { findFirst, create } } as any,
      services.auditLogs as any,
      services.entitlements as any,
    );

    await expect(
      svc.create('agency-a', { licensePlate: 'A-123-45' } as any, 'actor-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(findFirst.mock.calls[0][0].where).toEqual({
      agencyId: 'agency-a',
      licensePlate: 'A-123-45',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates when the plate is free within this agency, stamping agencyId from the caller', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn((args: any) => Promise.resolve({ id: 'car-1', ...args.data }));
    const services = makeServices();
    const svc = new CarsService(
      { car: { findFirst, create } } as any,
      services.auditLogs as any,
      services.entitlements as any,
    );

    const result = await svc.create(
      'agency-a',
      { licensePlate: 'A-123-45', brand: 'Dacia', model: 'Duster' } as any,
      'actor-1',
    );

    expect(create.mock.calls[0][0].data.agencyId).toBe('agency-a');
    expect(result.id).toBe('car-1');
    expect(services.auditLogs.log).toHaveBeenCalledWith(
      'agency-a',
      'actor-1',
      'CREATE_CAR',
      'CAR',
      'car-1',
      null,
      expect.any(Object),
    );
  });

  it('checks entitlements before touching the DB at all', async () => {
    const services = makeServices();
    services.entitlements.assertWithinLimit = jest
      .fn()
      .mockRejectedValue(new Error('PLAN_LIMIT_REACHED'));
    const findFirst = jest.fn();
    const svc = new CarsService(
      { car: { findFirst } } as any,
      services.auditLogs as any,
      services.entitlements as any,
    );

    await expect(
      svc.create('agency-a', { licensePlate: 'X' } as any, 'actor-1'),
    ).rejects.toThrow('PLAN_LIMIT_REACHED');
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe('CarsService.findAll — list cap (P2 backlog)', () => {
  it('caps the result at 500 rows, scoped by agencyId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const services = makeServices();
    const svc = new CarsService(
      { car: { findMany } } as any,
      services.auditLogs as any,
      services.entitlements as any,
    );

    await svc.findAll('agency-a');

    expect(findMany.mock.calls[0][0].take).toBe(500);
    expect(findMany.mock.calls[0][0].where).toEqual({ agencyId: 'agency-a' });
  });
});
