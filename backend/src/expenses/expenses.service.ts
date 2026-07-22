import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expenses.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private prisma: PrismaService) {}

  async create(agencyId: string, data: CreateExpenseDto) {
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

    // amount is Prisma.Decimal — coerce to number per addend so we never
    // string-concatenate a Decimal into these numeric summary totals.
    const byCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount.toNumber();
      return acc;
    }, {} as Record<string, number>);

    const total = expenses.reduce((sum, exp) => sum + exp.amount.toNumber(), 0);

    return {
      total,
      byCategory,
      count: expenses.length,
    };
  }

  async update(agencyId: string, id: string, data: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, agencyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async remove(agencyId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, agencyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
