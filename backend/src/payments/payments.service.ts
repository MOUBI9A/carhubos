import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async verify(paymentId: string, userId: string, role: string, agencyId: string) {
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new UnauthorizedException('Only Owners or Managers can verify liquidity.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { booking: true } } }
    });

    // Tenant scope (IDOR): a payment whose invoice belongs to another agency is
    // invisible to this caller — surface as 404, never leak its existence.
    if (!payment || payment.invoice.agencyId !== agencyId) {
      throw new NotFoundException('Payment record not found.');
    }

    // Only PENDING payments can be verified — blocks double-verify / VOID replay.
    if (payment.status !== 'PENDING') {
      throw new ConflictException('Only pending payments can be verified.');
    }

    const invoiceId = payment.invoiceId;
    // Money is Prisma.Decimal (see @db.Decimal(12,2)). Reconcile on EXACT
    // integer cents: a (_,2) column can hold at most 2 fraction digits, so
    // `.times(100)` yields a whole-number Decimal and `.toNumber()` is lossless.
    // Integer comparison then avoids any binary-float drift.
    const totalCents = payment.invoice.amount.times(100).toNumber();

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const verified = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'VERIFIED',
          verifiedById: userId,
          date: new Date()
        }
      });

      // Reconcile the invoice: sum every VERIFIED income payment (includes the
      // one just verified above, same transaction) and compare to the total.
      const agg = await tx.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'INCOME' },
        _sum: { amount: true }
      });
      const paidCents = (agg._sum.amount ?? new Prisma.Decimal(0))
        .times(100)
        .toNumber();

      const invoiceStatus =
        paidCents >= totalCents ? 'PAID' : paidCents > 0 ? 'PARTIAL' : 'DUE';

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: invoiceStatus }
      });

      return verified;
    });

    // BP Pillar C: Trigger ROI recalculation as new real liquidity entered the system
    await this.analytics.calculateCarRoi(payment.invoice.booking.carId);

    return updatedPayment;
  }
}
