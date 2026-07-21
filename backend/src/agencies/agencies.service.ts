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
   *
   * `subdomain` and `contactEmail` are plain Postgres `@unique` indexes NOT
   * scoped to `deletedAt IS NULL` (Prisma's DSL can't express a partial unique
   * index without a raw migration). A tombstoned row therefore keeps occupying
   * both unique slots forever, so re-provisioning the same subdomain/email —
   * e.g. the same business re-signs after offboarding — would fail with a
   * permanent 409 and no code path to reclaim the value (finding #8). We rename
   * both fields off the tombstone here: the row keeps its historical identity as
   * a readable prefix, and we append `deleted-<id>` (the row's own uuid, so the
   * retired value is globally unique and can never re-collide) to free the slot.
   * The deletedAt guard above means this runs at most once per row (no
   * double-suffixing on a second call).
   */
  async softDelete(agencyId: string) {
    const agency = await this.prisma.agency.findFirst({
      where: { id: agencyId, deletedAt: null },
    });
    if (!agency) throw new NotFoundException('Agency not found');
    const tombstone = `deleted-${agency.id}`;
    return this.prisma.agency.update({
      where: { id: agencyId },
      data: {
        deletedAt: new Date(),
        contactEmail: `${agency.contactEmail}.${tombstone}`,
        // subdomain is nullable; a null already occupies no unique slot, so only
        // a set value needs to be moved aside.
        subdomain: agency.subdomain
          ? `${agency.subdomain}.${tombstone}`
          : agency.subdomain,
      },
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
