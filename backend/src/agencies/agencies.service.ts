import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgenciesService {
  constructor(private prisma: PrismaService) {}

  async getMyAgency(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!agency) throw new NotFoundException('Agency not found');
    return agency;
  }

  async updateMyAgency(agencyId: string, data: {
    name?: string;
    contactEmail?: string;
    businessPhone?: string;
    address?: string;
    website?: string;
  }) {
    return this.prisma.agency.update({
      where: { id: agencyId },
      data,
    });
  }

  async getStats(agencyId: string) {
    const [totalCars, totalCustomers, totalBookings, activeBookings] = await Promise.all([
      this.prisma.car.count({ where: { agencyId } }),
      this.prisma.customer.count({ where: { agencyId } }),
      this.prisma.booking.count({ where: { agencyId } }),
      this.prisma.booking.count({ where: { agencyId, status: 'ACTIVE' } }),
    ]);
    return { totalCars, totalCustomers, totalBookings, activeBookings };
  }
}
