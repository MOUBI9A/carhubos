import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefusalLogsService {
  constructor(private prisma: PrismaService) {}

  async create(agencyId: string, data: any) {
    return this.prisma.refusalLog.create({
      data: {
        ...data,
        agencyId,
      },
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.refusalLog.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRecovered(id: string) {
    return this.prisma.refusalLog.update({
      where: { id },
      data: { status: 'RECOVERED' },
    });
  }

  /** Update a refusal log status (RECOVERED | LOST) with agency ownership guard. */
  async updateStatus(agencyId: string, id: string, status: string) {
    const log = await this.prisma.refusalLog.findFirst({
      where: { id, agencyId },
    });
    if (!log) {
      throw new NotFoundException('Refusal log not found');
    }
    return this.prisma.refusalLog.update({
      where: { id },
      data: { status },
    });
  }
}
