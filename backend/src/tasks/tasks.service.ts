import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // Every Task belongs to exactly one agency. agencyId always comes from the
  // authenticated caller (@CurrentUser), never from the request body — scoping
  // all reads/writes by it is what closes the cross-tenant IDOR.
  async create(
    agencyId: string,
    data: {
      title: string;
      description?: string;
      assigneeId?: string;
      priority?: string;
      status?: string;
      dueDate?: Date;
    },
  ) {
    return this.prisma.task.create({
      data: { ...data, agencyId },
    });
  }

  async findAllByAssignee(agencyId: string, assigneeId: string) {
    return this.prisma.task.findMany({
      where: { agencyId, assigneeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.task.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(agencyId: string, id: string, status: string) {
    // Ownership guard: a task from another tenant must be invisible (404), not
    // silently updatable. updateMany scopes the write so a cross-tenant id no-ops.
    const result = await this.prisma.task.updateMany({
      where: { id, agencyId },
      data: { status },
    });
    if (result.count === 0) {
      throw new NotFoundException('Task not found');
    }
    return this.prisma.task.findUnique({ where: { id } });
  }
}
