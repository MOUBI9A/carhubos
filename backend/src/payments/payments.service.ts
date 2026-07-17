import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    // Money is Float today (Decimal is Phase 2) — reconcile on rounded cents to
    // avoid floating-point drift when summing/comparing amounts.
    const totalCents = Math.round(payment.invoice.amount * 100);

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
      const paidCents = Math.round((agg._sum.amount ?? 0) * 100);

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
