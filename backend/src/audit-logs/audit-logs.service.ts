import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(
    agencyId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    beforeState?: any,
    afterState?: any,
  ) {
    return this.prisma.auditLog.create({
      data: {
        agencyId,
        actorId,
        action,
        entityType,
        entityId,
        beforeState: beforeState ? JSON.stringify(beforeState) : null,
        afterState: afterState ? JSON.stringify(afterState) : null,
      },
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.auditLog.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Platform-wide audit trail across ALL agencies — ROOT_ADMIN only (the caller
   * gates it; this method is deliberately un-scoped by agency). Paginated + hard-
   * capped (audit volume grows fast). Enriched with the agency name and the
   * actor's name/role for the SuperAdmin logs view (finding N5). NOTE: a
   * `@@index([createdAt])` on AuditLog would help this platform-ordered read at
   * scale — deferred (a serialized migration; beta volume is low).
   */
  async findAllPlatform(page = 1, pageSize = 50) {
    const safePage =
      Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const take = Number.isFinite(pageSize)
      ? Math.min(Math.max(Math.floor(pageSize), 1), 100)
      : 50;
    const skip = (safePage - 1) * take;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { agency: { select: { id: true, name: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);

    // Resolve actor names in one batched query (actorId is a bare string, no FK).
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const items = rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt,
      agency: r.agency,
      actor: actorMap.get(r.actorId) ?? {
        id: r.actorId,
        name: 'System',
        role: 'SYSTEM',
      },
    }));

    return { items, total, page: safePage, pageSize: take };
  }
}
