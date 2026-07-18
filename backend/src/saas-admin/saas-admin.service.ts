import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SaasAdminService {
  constructor(private prisma: PrismaService) {}

  async getPlatformOverview() {
    const [agenciesCount, activeBookings, totalRevenue] = await Promise.all([
      // Soft-deleted agencies are excluded from the platform roster.
      this.prisma.agency.count({ where: { deletedAt: null } }),
      this.prisma.booking.count({ where: { status: 'ACTIVE' } }),
      this.prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
    ]);

    const agencies = await this.prisma.agency.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { cars: true, bookings: true, users: true },
        },
      },
    });

    return {
      stats: {
        totalAgencies: agenciesCount,
        liveBookings: activeBookings,
        platformGMV: totalRevenue._sum.amount || 0,
      },
      agencies: agencies.map((a) => ({
        id: a.id,
        name: a.name,
        tier: a.subscriptionTier,
        fleetSize: a._count.cars,
        totalBookings: a._count.bookings,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  }

  async updateAgencyTier(id: string, tier: string) {
    return this.prisma.agency.update({
      where: { id },
      data: { subscriptionTier: tier as any },
    });
  }
}
