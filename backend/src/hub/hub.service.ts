import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HubService {
  constructor(private prisma: PrismaService) {}

  /**
   * Agencies list their idle cars for the network
   */
  async listAsset(agencyId: string, carId: string, b2bRate: number) {
    return this.prisma.hubListing.create({
      data: {
        agencyId,
        carId,
        dailyRateB2B: b2bRate,
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
