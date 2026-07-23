import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreatePaymentDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
  ) {}

  // Capped like findRecent below (100 rows) — same "stays snappy, full
  // history is a reports job" rationale, this endpoint just had no cap yet.
  async findAllPending(agencyId: string) {
    return this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        invoice: { agencyId },
      },
      include: {
        invoice: {
          include: {
            booking: {
              include: { customer: true, car: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Recent verified payments (income + refunds) for the finance ledger.
   * Caps at 100 rows so the UI stays snappy; full history is a later reports job.
   */
  async findRecent(agencyId: string, limit = 100) {
    return this.prisma.payment.findMany({
      where: {
        status: 'VERIFIED',
        invoice: { agencyId },
      },
      include: {
        invoice: {
          include: {
            booking: {
              include: { customer: true, car: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  /**
   * Record a partial/full income payment or a refund against an invoice.
   * Reconciles the invoice when the payment is VERIFIED (auto-verify or explicit).
   */
  async create(
    agencyId: string,
    userId: string,
    role: string,
    dto: CreatePaymentDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, agencyId },
      include: { booking: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    if (invoice.status === 'CANCELLED') {
      throw new ConflictException('Cannot record payments against a cancelled invoice.');
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    // OWNER/MANAGER may auto-verify; agents recording cash land as PENDING.
    const canAutoVerify = role === 'OWNER' || role === 'MANAGER';
    const autoVerify = dto.autoVerify !== false && canAutoVerify;
    const status = autoVerify ? 'VERIFIED' : 'PENDING';

    if (dto.type === 'REFUND') {
      // Refunds cannot exceed net verified income already on this invoice.
      const netCents = await this.netVerifiedIncomeCents(invoice.id);
      const refundCents = amount.times(100).toNumber();
      if (refundCents > netCents) {
        throw new BadRequestException(
          `Refund of ${amount.toFixed(2)} MAD exceeds net verified income ` +
            `(${(netCents / 100).toFixed(2)} MAD) on this invoice.`,
        );
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          amount,
          type: dto.type,
          method: dto.method ?? 'CASH',
          reference: dto.reference,
          status,
          verifiedById: autoVerify ? userId : null,
          date: new Date(),
          invoiceId: invoice.id,
        },
      });

      if (autoVerify) {
        await this.reconcileInvoice(tx, invoice.id, invoice.amount);
      }

      return created;
    });

    if (autoVerify && dto.type === 'INCOME' && invoice.booking?.carId) {
      await this.analytics.calculateCarRoi(agencyId, invoice.booking.carId);
    }

    return payment;
  }

  async verify(paymentId: string, userId: string, role: string, agencyId: string) {
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new UnauthorizedException('Only Owners or Managers can verify liquidity.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { booking: true } } },
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

    if (payment.type === 'REFUND') {
      // When verifying a pending refund, ensure net income still covers it
      // (excluding this payment which is still PENDING).
      const netCents = await this.netVerifiedIncomeCents(payment.invoiceId);
      const refundCents = payment.amount.times(100).toNumber();
      if (refundCents > netCents) {
        throw new BadRequestException(
          `Refund of ${payment.amount.toFixed(2)} MAD exceeds net verified income ` +
            `(${(netCents / 100).toFixed(2)} MAD) on this invoice.`,
        );
      }
    }

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const verified = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'VERIFIED',
          verifiedById: userId,
          date: new Date(),
        },
      });

      await this.reconcileInvoice(tx, payment.invoiceId, payment.invoice.amount);

      return verified;
    });

    // BP Pillar C: Trigger ROI recalculation as new real liquidity entered the system
    if (payment.type === 'INCOME') {
      await this.analytics.calculateCarRoi(agencyId, payment.invoice.booking.carId);
    }

    return updatedPayment;
  }

  /**
   * Settle an online CheckoutSession from a confirmed gateway payment. Called by
   * the webhook path (no auth context — the gateway is the caller; the session's
   * own agencyId/invoice are the authority). IDEMPOTENT: the PENDING→PAID
   * transition is an updateMany guard inside the transaction, so a webhook the
   * gateway delivers more than once (or two racing deliveries) settles the
   * invoice exactly once — only the delivery that actually flips the row creates
   * the VERIFIED payment and reconciles. The amount charged is the session's own
   * Prisma.Decimal (set from the invoice at checkout time) — never a
   * gateway-reported number — so a tampered webhook amount can't over-settle.
   * Reuses reconcileInvoice, the same path manual payments use.
   */
  async settleCheckout(providerRef: string, method = 'CARD') {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.checkoutSession.findUnique({
        where: { providerRef },
        include: { invoice: true },
      });
      if (!session) {
        throw new NotFoundException('Checkout session not found.');
      }
      if (!session.invoiceId || !session.invoice) {
        // Non-invoice checkout (e.g. a future SaaS-subscription purpose) — no
        // invoice to reconcile here; leave that to its own settler.
        return { settled: false as const, reason: 'no-invoice' };
      }

      // Idempotency guard: only the first delivery flips PENDING → PAID.
      const flip = await tx.checkoutSession.updateMany({
        where: { id: session.id, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (flip.count === 0) {
        return { settled: false as const, alreadySettled: true };
      }

      await tx.payment.create({
        data: {
          amount: session.amount,
          method,
          type: 'INCOME',
          status: 'VERIFIED',
          reference: providerRef,
          invoiceId: session.invoiceId,
          date: new Date(),
        },
      });

      await this.reconcileInvoice(tx, session.invoiceId, session.invoice.amount);
      return { settled: true as const };
    });
  }

  /** Net verified INCOME − REFUND in integer cents for an invoice. */
  private async netVerifiedIncomeCents(invoiceId: string): Promise<number> {
    const [incomeAgg, refundAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'REFUND' },
        _sum: { amount: true },
      }),
    ]);
    const income = (incomeAgg._sum.amount ?? new Prisma.Decimal(0)).times(100).toNumber();
    const refund = (refundAgg._sum.amount ?? new Prisma.Decimal(0)).times(100).toNumber();
    return income - refund;
  }

  /**
   * Reconcile invoice status from verified payments.
   * Net paid = VERIFIED INCOME − VERIFIED REFUND (integer cents).
   * PAID when net ≥ invoice.amount; PARTIAL when net > 0; else DUE.
   */
  private async reconcileInvoice(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    invoiceAmount: Prisma.Decimal,
  ) {
    const totalCents = invoiceAmount.times(100).toNumber();

    const [incomeAgg, refundAgg] = await Promise.all([
      tx.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'INCOME' },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'REFUND' },
        _sum: { amount: true },
      }),
    ]);

    const incomeCents = (incomeAgg._sum.amount ?? new Prisma.Decimal(0))
      .times(100)
      .toNumber();
    const refundCents = (refundAgg._sum.amount ?? new Prisma.Decimal(0))
      .times(100)
      .toNumber();
    const paidCents = incomeCents - refundCents;

    const invoiceStatus =
      paidCents >= totalCents ? 'PAID' : paidCents > 0 ? 'PARTIAL' : 'DUE';

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: invoiceStatus },
    });
  }
}
