import { MaintenanceService } from './maintenance.service';

/**
 * Coverage for the unbounded-list hardening (MASTER_BACKLOG P2): both history
 * reads previously had no `take` at all. Capped, not paginated, so the
 * existing flat-array shape is unchanged. Tenant scoping (already boundary-
 * tested in common/multi-tenant-boundary.spec.ts for findAllForCar) is
 * unrelated to this change and untouched.
 */
describe('MaintenanceService — list caps', () => {
  function makeService(carRow: any, findMany: jest.Mock) {
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue(carRow) },
      maintenanceRecord: { findMany },
    };
    return new MaintenanceService(prisma as any, {} as any);
  }

  it('findAllForCar caps the result at 200 rows', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = makeService({ id: 'car-1', mileage: 1000 }, findMany);

    await svc.findAllForCar('agency-1', 'car-1');

    expect(findMany.mock.calls[0][0].take).toBe(200);
    expect(findMany.mock.calls[0][0].where).toEqual({ carId: 'car-1' });
  });

  it('getGlobalHistory caps the result at 500 rows', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = makeService(null, findMany);

    await svc.getGlobalHistory('agency-1');

    expect(findMany.mock.calls[0][0].take).toBe(500);
    expect(findMany.mock.calls[0][0].where).toEqual({ car: { agencyId: 'agency-1' } });
  });
});
