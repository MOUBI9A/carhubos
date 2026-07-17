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
    const where: any = { status: 'AVAILABLE' };

    if (agencyId) {
      where.agencyId = agencyId;
    }

    if (city) {
      where.agency = { city: { contains: city } };
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
    return this.prisma.agency.findUnique({
      where: { subdomain },
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
