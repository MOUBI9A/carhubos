import { Controller, Get, Param, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CarsService } from '../cars/cars.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Hard ceiling for the bare (unpaginated) call. `GET /public/fleet` is the only
 * list an unauthenticated stranger can trigger, and the global ThrottlerGuard
 * caps request *rate*, not response *size* — without a `take`, one request over
 * a 10k-car tenant serializes the whole table into a single response body.
 * 60 comfortably covers a real agency's browsable fleet page.
 */
const PUBLIC_FLEET_DEFAULT_LIMIT = 60;

/** Upper bound a caller may request via `pageSize`, so the ceiling can't be opted out of. */
const PUBLIC_FLEET_MAX_PAGE_SIZE = 100;

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carsService: CarsService,
  ) {}

  /**
   * `page`/`pageSize` are optional and additive, mirroring the shape already
   * proven on `GET /bookings` (Phase 6): omit both and you get a flat array
   * (now capped at `PUBLIC_FLEET_DEFAULT_LIMIT`), pass either and you get
   * `{items,total,page,pageSize}`. The bare shape is kept so an older caller
   * degrades to "first page" rather than breaking.
   */
  @Get('fleet')
  async getPublicFleet(
    @Query('city') city?: string,
    @Query('agencyId') agencyId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // `deletedAt: null` is NOT optional here. Soft-deleted agencies are
    // tombstones, not live tenants — `auth.service.ts` refuses their logins and
    // `saas-admin` drops them from the roster. Without the same filter this
    // unauthenticated endpoint kept renting out an offboarded tenant's fleet.
    // Building the agency filter as its own object makes the old clobber bug
    // (`where.agency = { city }` dropping the guard) structurally impossible.
    const agencyFilter: Prisma.AgencyWhereInput = { deletedAt: null };

    if (city) {
      // `startsWith`, not `contains`: a leading wildcard (`LIKE '%casa%'`) can
      // never use an index and forces a sequential scan as tenants grow — the
      // same reasoning Phase 6 applied to `search.service.ts`.
      agencyFilter.city = { startsWith: city, mode: 'insensitive' };
    }

    const where: Prisma.CarWhereInput = {
      status: 'AVAILABLE',
      agency: agencyFilter,
    };

    if (agencyId) {
      where.agencyId = agencyId;
    }

    const findManyArgs: Prisma.CarFindManyArgs = {
      where,
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        pricePerDay: true,
        fuelType: true,
        gearbox: true,
        status: true,
        agency: {
          select: {
            name: true,
            businessPhone: true,
            city: true,
            subdomain: true,
          },
        },
      },
      orderBy: { pricePerDay: 'asc' },
    };

    const paginate = page !== undefined || pageSize !== undefined;

    if (!paginate) {
      return this.prisma.car.findMany({
        ...findManyArgs,
        take: PUBLIC_FLEET_DEFAULT_LIMIT,
      });
    }

    // Query params arrive as strings; a non-numeric one falls back to the
    // default rather than producing `NaN` skip/take.
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(
      PUBLIC_FLEET_MAX_PAGE_SIZE,
      Math.max(1, Number(pageSize) || PUBLIC_FLEET_DEFAULT_LIMIT),
    );

    const [items, total] = await Promise.all([
      this.prisma.car.findMany({
        ...findManyArgs,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.car.count({ where }),
    ]);

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  @Get('agency-by-subdomain/:subdomain')
  async getAgencyBySubdomain(@Param('subdomain') subdomain: string) {
    // `findFirst`, not `findUnique`: Prisma only accepts unique fields in a
    // findUnique `where`, and `deletedAt` isn't one. Returning null for a
    // soft-deleted agency is deliberate — a tombstoned tenant should be
    // indistinguishable from one that never existed, and this endpoint is
    // public (it was leaking a churned tenant's contactEmail).
    return this.prisma.agency.findFirst({
      where: { subdomain, deletedAt: null },
      select: {
        id: true,
        name: true,
        businessPhone: true,
        contactEmail: true,
        city: true,
      },
    });
  }
}
