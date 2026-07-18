import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgenciesService {
  constructor(private prisma: PrismaService) {}

  async getMyAgency(agencyId: string) {
    const agency = await this.prisma.agency.findFirst({
      // A soft-deleted agency is treated as gone — never resolve it.
      where: { id: agencyId, deletedAt: null },
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

  /**
   * Soft-delete an agency: stamp deletedAt instead of removing the row. This
   * preserves the cross-tenant trust graph (its authored reviews/flags survive,
   * anonymized via SetNull) and stops all of its users from operating, since
   * login and getMyAgency both filter deletedAt: null. NEVER hard-delete.
   */
  async softDelete(agencyId: string) {
    const agency = await this.prisma.agency.findFirst({
      where: { id: agencyId, deletedAt: null },
    });
    if (!agency) throw new NotFoundException('Agency not found');
    return this.prisma.agency.update({
      where: { id: agencyId },
      data: { deletedAt: new Date() },
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
