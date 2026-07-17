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
}
