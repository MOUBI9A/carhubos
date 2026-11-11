import { PublicController } from './public.controller';

/**
 * Soft-deleted agencies must not be reachable from the UNAUTHENTICATED surface.
 *
 * A soft-deleted agency is a tombstone, not a live tenant: `auth.service.ts`
 * refuses its logins (`where: { id, deletedAt: null }`) and `saas-admin` drops
 * it from the platform roster. `public.controller.ts` is the only endpoint pair
 * with no guard in front of it, and it was the one place that skipped the
 * filter — so an offboarded tenant's fleet stayed publicly rentable and its
 * `contactEmail` stayed publicly readable (verified live before the fix:
 * `GET /public/agency-by-subdomain/<sub>` returned 200 with the owner's email
 * while `POST /auth/login` for the same tenant correctly returned 401).
 *
 * A mocked Prisma is the right level here — this is about the WHERE clause, not
 * the database.
 */
describe('Public endpoints exclude soft-deleted agencies', () => {
  const makeController = () => {
    const prisma = {
      car: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      agency: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const controller = new PublicController(prisma as any, {} as any, {} as any);
    return { controller, prisma };
  };

  it('GET /public/fleet scopes cars to live agencies', async () => {
    const { controller, prisma } = makeController();
    await controller.getPublicFleet();

    const { where } = prisma.car.findMany.mock.calls[0][0];
    expect(where.agency).toEqual({ deletedAt: null });
  });

  it('keeps the deletedAt guard when a city filter is also applied', () => {
    // Regression guard: `where.agency = { city }` used to CLOBBER the deletedAt
    // filter, so the leak reappeared for exactly the search-by-city path the
    // public site actually uses.
    const { controller, prisma } = makeController();
    void controller.getPublicFleet('Casablanca');

    const { where } = prisma.car.findMany.mock.calls[0][0];
    expect(where.agency.deletedAt).toBeNull();
    // `startsWith` (not `contains`) so the predicate stays index-friendly —
    // finding #3. Case-insensitive so "casa" still matches "Casablanca".
    expect(where.agency.city).toEqual({ startsWith: 'Casablanca', mode: 'insensitive' });
  });

  it('still narrows by agencyId without dropping the guard', async () => {
    const { controller, prisma } = makeController();
    await controller.getPublicFleet(undefined, 'agency-123');

    const { where } = prisma.car.findMany.mock.calls[0][0];
    expect(where.agencyId).toBe('agency-123');
    expect(where.agency).toEqual({ deletedAt: null });
  });

  it('GET /public/agency-by-subdomain filters deletedAt via findFirst', async () => {
    const { controller, prisma } = makeController();
    await controller.getAgencyBySubdomain('atlas');

    // findUnique cannot express this — deletedAt is not a unique field — so the
    // query must be a findFirst carrying both conditions.
    expect(prisma.agency.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subdomain: 'atlas', deletedAt: null } }),
    );
  });

  it('never exposes a soft-deleted agency, even by exact subdomain', async () => {
    // A tombstoned tenant must be indistinguishable from one that never
    // existed: same null answer, no existence leak.
    const { controller } = makeController();
    await expect(controller.getAgencyBySubdomain('offboarded')).resolves.toBeNull();
  });

  /**
   * Finding #3 — `GET /public/fleet` is the only list an unauthenticated
   * stranger can trigger, and it had no `take` at all. The global
   * ThrottlerGuard bounds request *rate*, not response *size*, so a single
   * request over a 10k-car tenant serialized the whole table.
   */
  describe('is bounded (finding #3)', () => {
    const makeControllerWith = (cars: unknown[], total: number) => {
      const prisma = {
        car: {
          findMany: jest.fn().mockResolvedValue(cars),
          count: jest.fn().mockResolvedValue(total),
        },
        agency: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      return { controller: new PublicController(prisma as any, {} as any, {} as any), prisma };
    };

    it('caps the bare call instead of returning the whole table', async () => {
      const { controller, prisma } = makeControllerWith([], 0);
      await controller.getPublicFleet();

      expect(prisma.car.findMany.mock.calls[0][0].take).toBe(60);
    });

    it('returns a paginated envelope only when page/pageSize are supplied', async () => {
      const { controller, prisma } = makeControllerWith([{ id: 'c1' }], 4200);
      const result = await controller.getPublicFleet(undefined, undefined, '3', '25');

      expect(result).toEqual({ items: [{ id: 'c1' }], total: 4200, page: 3, pageSize: 25 });
      expect(prisma.car.findMany.mock.calls[0][0].skip).toBe(50); // (page - 1) * pageSize
      expect(prisma.car.findMany.mock.calls[0][0].take).toBe(25);
    });

    it('still returns a flat array when unpaginated, so old callers keep working', async () => {
      const { controller } = makeControllerWith([{ id: 'c1' }], 1);
      await expect(controller.getPublicFleet()).resolves.toEqual([{ id: 'c1' }]);
    });

    it('clamps an oversized pageSize to the ceiling', async () => {
      // The bound must not be opt-out-able from the query string.
      const { controller, prisma } = makeControllerWith([], 0);
      await controller.getPublicFleet(undefined, undefined, '1', '99999');

      expect(prisma.car.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('falls back to defaults on junk page/pageSize instead of NaN skip/take', async () => {
      // `Number('abc')` is NaN; an unguarded NaN skip/take throws in Prisma —
      // on an endpoint anyone on the internet can call.
      const { controller, prisma } = makeControllerWith([], 0);
      const result = await controller.getPublicFleet(undefined, undefined, 'abc', 'xyz');

      const args = prisma.car.findMany.mock.calls[0][0];
      expect(args.skip).toBe(0);
      expect(args.take).toBe(60);
      expect(result).toMatchObject({ page: 1, pageSize: 60 });
    });

    it('counts with the same WHERE the page is drawn from', async () => {
      // A total computed off a different predicate silently lies about how many
      // pages exist — and here it could count soft-deleted tenants' cars.
      const { controller, prisma } = makeControllerWith([], 0);
      await controller.getPublicFleet('Casablanca', 'agency-1', '1', '10');

      expect(prisma.car.count).toHaveBeenCalledWith({
        where: prisma.car.findMany.mock.calls[0][0].where,
      });
    });
  });
});
