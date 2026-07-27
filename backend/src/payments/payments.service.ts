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
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreatePaymentDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private auditLogs: AuditLogsService,
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
      // Fast, advisory pre-check outside any transaction — rejects an
      // obviously-bad refund immediately with a clear message. NOT the
      // enforcement boundary: a PENDING (non-auto-verified) refund doesn't
      // touch the net-income aggregate until it's later verified, and an
      // auto-verified refund is re-checked below UNDER LOCK, which is what
      // actually closes the race.
      const netCents = await this.netVerifiedIncomeCents(this.prisma, invoice.id);
      const refundCents = amount.times(100).toNumber();
      if (refundCents > netCents) {
        throw new BadRequestException(
          `Refund of ${amount.toFixed(2)} MAD exceeds net verified income ` +
            `(${(netCents / 100).toFixed(2)} MAD) on this invoice.`,
        );
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      // An auto-verified refund mutates the aggregate immediately (unlike a
      // PENDING one), so THIS is the actual race window — re-check under
      // the invoice row lock, using a read through `tx` so it sees any
      // concurrent refund that committed while this transaction waited for
      // the lock.
      if (dto.type === 'REFUND' && autoVerify) {
        await this.lockInvoiceForRefund(tx, invoice.id);
        const netCents = await this.netVerifiedIncomeCents(tx, invoice.id);
        const refundCents = amount.times(100).toNumber();
        if (refundCents > netCents) {
          throw new BadRequestException(
            `Refund of ${amount.toFixed(2)} MAD exceeds net verified income ` +
              `(${(netCents / 100).toFixed(2)} MAD) on this invoice.`,
          );
        }
      }

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

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      if (payment.type === 'REFUND') {
        // THE RACE this closes: two concurrent verify() calls on two
        // DIFFERENT pending refunds for the same invoice. Previously this
        // check read via `this.prisma` outside any transaction, so both
        // could read the same pre-commit net-income figure, both pass, both
        // commit — refunding more than was ever paid in. Locking the
        // invoice row first serializes the two transactions; the second to
        // acquire the lock re-reads (via `tx`) an aggregate that already
        // reflects the first's committed refund.
        await this.lockInvoiceForRefund(tx, payment.invoiceId);
        const netCents = await this.netVerifiedIncomeCents(tx, payment.invoiceId);
        const refundCents = payment.amount.times(100).toNumber();
        if (refundCents > netCents) {
          throw new BadRequestException(
            `Refund of ${payment.amount.toFixed(2)} MAD exceeds net verified income ` +
              `(${(netCents / 100).toFixed(2)} MAD) on this invoice.`,
          );
        }
      }

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
        include: { invoice: true, targetPlan: true },
      });
      if (!session) {
        throw new NotFoundException('Checkout session not found.');
      }

      if (session.purpose === 'SAAS_SUBSCRIPTION') {
        return this.settleSubscriptionCheckout(tx, session);
      }

      if (!session.invoiceId || !session.invoice) {
        // Non-invoice, non-subscription checkout — nothing to reconcile.
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

  /**
   * Settle a SAAS_SUBSCRIPTION checkout (V1, founder-locked 2026-07-27):
   * one-shot, full new-plan price, no proration, applies immediately on this
   * settlement. Mirrors SaasAdminService.updateSubscription's field writes
   * (Subscription.planId + status, Agency.subscriptionTier mirror, an
   * AuditLog 'SUBSCRIPTION_UPDATE' with the same before/after shape) so the
   * founder console's manual path and this webhook path stay consistent no
   * matter which one touched a given agency last — the founder accepted the
   * concurrent-write risk between them for V1 rather than adding cross-path
   * locking.
   *
   * The PlatformInvoice is created HERE, already PAID — not at
   * checkout-creation time — so a failed/expired checkout never leaves a
   * phantom ISSUED invoice behind. V1's failed-payment rule is a silent
   * no-op: the CheckoutSession fails (handled generically in
   * CheckoutService.handleWebhook) and nothing else ever changes.
   */
  private async settleSubscriptionCheckout(
    tx: Prisma.TransactionClient,
    session: Prisma.CheckoutSessionGetPayload<{
      include: { invoice: true; targetPlan: true };
    }>,
  ) {
    // Idempotency guard: only the first delivery flips PENDING → PAID.
    const flip = await tx.checkoutSession.updateMany({
      where: { id: session.id, status: 'PENDING' },
      data: { status: 'PAID', paidAt: new Date() },
    });
    if (flip.count === 0) {
      return { settled: false as const, alreadySettled: true };
    }

    if (!session.targetPlanId || !session.targetPlan) {
      // Defensive: createSubscriptionCheckout always sets this. A session
      // that reaches here without it is a data-integrity error, not a normal
      // decline — surface it rather than silently "succeeding" into a
      // no-op plan change nobody would ever notice.
      throw new ConflictException(
        'Subscription checkout is missing its target plan.',
      );
    }

    const sub = await tx.subscription.findUnique({
      where: { agencyId: session.agencyId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found for this agency.');
    }

    // Sequential-ish human invoice number: FIDER-<year>-<seq> — same scheme
    // as SaasAdminService.issueInvoice's manual invoices.
    const year = new Date().getFullYear();
    const count = await tx.platformInvoice.count();
    const number = `FIDER-${year}-${String(count + 1).padStart(4, '0')}`;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const invoice = await tx.platformInvoice.create({
      data: {
        number,
        agencyId: session.agencyId,
        subscriptionId: sub.id,
        amount: session.amount,
        status: 'PAID',
        periodStart,
        periodEnd,
        paidAt: new Date(),
        note: `Self-serve upgrade to ${session.targetPlan.name} via ${session.provider}.`,
      },
    });

    await tx.checkoutSession.update({
      where: { id: session.id },
      data: { platformInvoiceId: invoice.id },
    });

    const updatedSub = await tx.subscription.update({
      where: { agencyId: session.agencyId },
      data: { planId: session.targetPlanId, status: 'ACTIVE' },
      include: { plan: { select: { key: true, name: true } } },
    });

    await tx.agency.update({
      where: { id: session.agencyId },
      data: { subscriptionTier: session.targetPlan.key },
    });

    await this.auditLogs.log(
      session.agencyId,
      `webhook:${session.provider}`,
      'SUBSCRIPTION_UPDATE',
      'SUBSCRIPTION',
      updatedSub.id,
      { plan: sub.plan.key, status: sub.status, trialEndsAt: sub.trialEndsAt },
      {
        plan: updatedSub.plan.key,
        status: updatedSub.status,
        trialEndsAt: updatedSub.trialEndsAt,
      },
    );

    return { settled: true as const };
  }

  /**
   * Net verified INCOME − REFUND in integer cents for an invoice. Takes an
   * explicit client so callers protecting against the refund race (see
   * `lockInvoiceForRefund`) can pass the transaction's own `tx` and read
   * under that transaction's row lock, instead of always reading through
   * `this.prisma` outside any transaction.
   */
  private async netVerifiedIncomeCents(
    client: Pick<PrismaService, 'payment'> | Prisma.TransactionClient,
    invoiceId: string,
  ): Promise<number> {
    const [incomeAgg, refundAgg] = await Promise.all([
      client.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'INCOME' },
        _sum: { amount: true },
      }),
      client.payment.aggregate({
        where: { invoiceId, status: 'VERIFIED', type: 'REFUND' },
        _sum: { amount: true },
      }),
    ]);
    const income = (incomeAgg._sum.amount ?? new Prisma.Decimal(0)).times(100).toNumber();
    const refund = (refundAgg._sum.amount ?? new Prisma.Decimal(0)).times(100).toNumber();
    return income - refund;
  }

  /**
   * Pessimistic row lock on the invoice for the lifetime of the current
   * transaction — closes the refund-verification race (two concurrent
   * verifies of two DIFFERENT PENDING refunds on the SAME invoice, each
   * reading the same pre-commit net-income figure via `this.prisma` before
   * either committed, both passing the affordability check, both over-
   * refunding). `SELECT ... FOR UPDATE` blocks a second transaction taking
   * the same lock until the first commits/rolls back, so the second
   * transaction's own `netVerifiedIncomeCents` read (below, using `tx`)
   * always sees the first refund's committed effect before deciding its own.
   */
  private async lockInvoiceForRefund(tx: Prisma.TransactionClient, invoiceId: string) {
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
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
