import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Both list reads below returned every row for the agency with no cap — fine
// at demo scale, not at the market-ready "holds at 10k+" bar. Capped rather
// than paginated (no envelope) so the existing flat-array response shape and
// its frontend consumers are unchanged.
const TASK_LIST_CAP = 500;

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
    if (data.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: data.assigneeId, agencyId },
        select: { id: true },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }
    }

    return this.prisma.task.create({
      data: { ...data, agencyId },
    });
  }

  async findAllByAssignee(agencyId: string, assigneeId: string) {
    return this.prisma.task.findMany({
      where: { agencyId, assigneeId },
      include: { assignee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: TASK_LIST_CAP,
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.task.findMany({
      where: { agencyId },
      include: { assignee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: TASK_LIST_CAP,
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
