import { Controller, Get, Param, Query } from '@nestjs/common';
import { CarsService } from '../cars/cars.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carsService: CarsService,
  ) {}

  @Get('fleet')
  async getPublicFleet(
    @Query('city') city?: string,
    @Query('agencyId') agencyId?: string,
  ) {
    // `agency.deletedAt: null` is NOT optional here. Soft-deleted agencies are
    // tombstones, not live tenants — `auth.service.ts` refuses their logins and
    // `saas-admin` drops them from the roster. Without the same filter this
    // unauthenticated endpoint kept renting out an offboarded tenant's fleet.
    const where: any = { status: 'AVAILABLE', agency: { deletedAt: null } };

    if (agencyId) {
      where.agencyId = agencyId;
    }

    if (city) {
      // Merge into the existing agency filter — assigning `where.agency` here
      // would clobber the deletedAt guard above.
      where.agency.city = { contains: city };
    }

    return this.prisma.car.findMany({
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
    });
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
