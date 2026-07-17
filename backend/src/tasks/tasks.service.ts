import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: Date;
  }) {
    return this.prisma.task.create({
      data,
    });
  }

  async findAllByAssignee(assigneeId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }
}
