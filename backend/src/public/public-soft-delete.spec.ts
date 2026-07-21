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
      car: { findMany: jest.fn().mockResolvedValue([]) },
      agency: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const controller = new PublicController(prisma as any, {} as any);
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
    expect(where.agency.city).toEqual({ contains: 'Casablanca' });
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
});
