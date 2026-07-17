import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService
  ) {}

  async findAllPending(agencyId: string) {
    return this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        invoice: { agencyId }
      },
      include: {
        invoice: {
          include: {
            booking: {
              include: { customer: true, car: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async verify(paymentId: string, userId: string, role: string) {
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new UnauthorizedException('Only Owners or Managers can verify liquidity.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { booking: true } } }
    });

    if (!payment) throw new NotFoundException('Payment record not found.');

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'VERIFIED',
        verifiedById: userId,
        date: new Date()
      }
    });

    // BP Pillar C: Trigger ROI recalculation as new real liquidity entered the system
    await this.analytics.calculateCarRoi(payment.invoice.booking.carId);

    return updatedPayment;
  }
}
