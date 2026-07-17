import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private prisma: PrismaService) {}

  async create(agencyId: string, data: { category: string; description: string; amount: number; date?: string }) {
    return this.prisma.expense.create({
      data: {
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        status: 'PENDING',
        agencyId,
      },
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.expense.findMany({
      where: { agencyId },
      orderBy: { date: 'desc' },
    });
  }

  async getSummary(agencyId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { agencyId },
    });

    const byCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      total,
      byCategory,
      count: expenses.length,
    };
  }

  async update(agencyId: string, id: string, data: { category?: string; description?: string; amount?: number; status?: string }) {
    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async remove(agencyId: string, id: string) {
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
