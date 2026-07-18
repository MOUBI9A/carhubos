import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HubService {
  constructor(private prisma: PrismaService) {}

  /**
   * Agencies list their idle cars for the network
   */
  async listAsset(agencyId: string, carId: string, b2bRate: number) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    const existing = await this.prisma.hubListing.findUnique({
      where: { carId },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Car is already listed on the hub');

    return this.prisma.hubListing.create({
      data: {
        agencyId,
        carId,
        dailyRateB2B: new Prisma.Decimal(b2bRate.toString()),
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Search for cars available from other agencies
   */
  async discoverAssets(myAgencyId: string) {
    return this.prisma.hubListing.findMany({
      where: {
        agencyId: { not: myAgencyId },
        status: 'ACTIVE',
        car: { status: 'AVAILABLE' },
      },
      include: {
        car: true,
        agency: {
          select: { name: true, city: true },
        },
      },
    });
  }
}
