import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import { CreateSubscriptionCheckoutDto } from './dto/checkout-subscription.dto';

/**
 * Orchestrates online payment for a booking invoice: create a checkout session
 * via the configured gateway, and settle it when the gateway's webhook confirms.
 * Tenant-scoped (agencyId from the JWT on create); the webhook has no auth (the
 * gateway is the caller) but is authenticated by the adapter's signature check
 * and keyed by the unique providerRef.
 */
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGatewayService,
    private readonly payments: PaymentsService,
  ) {}

  private requireOnlinePayments() {
    if (this.gateway.activeProvider === 'DISABLED') {
      throw new ServiceUnavailableException({
        code: 'ONLINE_PAYMENTS_DISABLED',
        message: 'Online payments are disabled. Contact the agency for manual payment.',
      });
    }
  }

  async createCheckout(
    agencyId: string,
    invoiceId: string,
    urls: CreateCheckoutDto,
  ) {
    this.requireOnlinePayments();
    // Tenant scope: a cross-tenant invoiceId resolves to nothing → 404.
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, agencyId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    if (invoice.status === 'PAID') {
      throw new ConflictException('Invoice is already paid.');
    }
    if (invoice.status === 'CANCELLED') {
      throw new ConflictException('Invoice is cancelled.');
    }

    const sessionId = randomUUID();
    const base = process.env.PUBLIC_APP_URL ?? 'http://localhost:3002';
    const successUrl = urls.successUrl ?? `${base}/portal/bookings`;
    const cancelUrl = urls.cancelUrl ?? `${base}/portal/bookings`;

    const { providerRef, redirectUrl } = await this.gateway.createCheckout({
      sessionId,
      // Informational to the gateway; the money OF RECORD is the Decimal stored
      // on the session below and used at settlement.
      amount: invoice.amount.toNumber(),
      currency: 'MAD',
      description: `Invoice ${invoice.id.slice(0, 8)}`,
      successUrl,
      cancelUrl,
    });

    await this.prisma.checkoutSession.create({
      data: {
        id: sessionId,
        provider: this.gateway.activeProvider,
        providerRef,
        status: 'PENDING',
        amount: invoice.amount, // Prisma.Decimal — money of record
        currency: 'MAD',
        purpose: 'BOOKING_INVOICE',
        agencyId,
        invoiceId,
      },
    });

    return {
      sessionId,
      providerRef,
      provider: this.gateway.activeProvider,
      redirectUrl,
    };
  }

  /**
   * Agency starts an online checkout to upgrade their Fider plan → returns the
   * hosted redirect URL. V1 rules (founder-locked, 2026-07-27): one-shot full
   * price (no proration), upgrades only (sortOrder must strictly increase — a
   * downgrade or a re-pick of the current plan 400s with a "contact support"
   * message), and a BETA agency can't self-serve at all (BETA is unlimited/free,
   * so by price/sortOrder alone it would look like an "upgrade" onto a plan with
   * real maxCars/maxStaff caps — exactly the retroactive-over-limit edge case
   * the no-downgrade rule exists to avoid). The plan itself only actually
   * changes on webhook settlement (see PaymentsService.settleCheckout); a
   * failed/abandoned checkout leaves the agency on its current plan untouched.
   */
  async createSubscriptionCheckout(
    agencyId: string,
    dto: CreateSubscriptionCheckoutDto,
  ) {
    this.requireOnlinePayments();
    const sub = await this.prisma.subscription.findUnique({
      where: { agencyId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('This agency has no subscription.');
    }
    if (sub.plan.key === 'BETA') {
      throw new ConflictException(
        'Beta agencies cannot self-serve a plan upgrade yet — contact support.',
      );
    }

    const targetPlan = await this.prisma.plan.findUnique({
      where: { key: dto.planKey },
    });
    if (!targetPlan) {
      throw new BadRequestException('Unknown plan.');
    }
    if (targetPlan.sortOrder <= sub.plan.sortOrder) {
      throw new ConflictException(
        'Only plan upgrades are supported. To move to an equal or lower plan, contact support.',
      );
    }

    const sessionId = randomUUID();
    const base = process.env.PUBLIC_APP_URL ?? 'http://localhost:3002';
    const successUrl = dto.successUrl ?? `${base}/dashboard/billing`;
    const cancelUrl = dto.cancelUrl ?? `${base}/dashboard/billing`;

    const { providerRef, redirectUrl } = await this.gateway.createCheckout({
      sessionId,
      // Informational to the gateway; the money OF RECORD is the Decimal
      // stored on the session below (targetPlan.priceMonthly) and used at
      // settlement — full price, no proration, per the V1 product rules.
      amount: targetPlan.priceMonthly.toNumber(),
      currency: 'MAD',
      description: `Fider ${targetPlan.name} plan — next billing cycle`,
      successUrl,
      cancelUrl,
    });

    await this.prisma.checkoutSession.create({
      data: {
        id: sessionId,
        provider: this.gateway.activeProvider,
        providerRef,
        status: 'PENDING',
        amount: targetPlan.priceMonthly, // Prisma.Decimal — money of record
        currency: 'MAD',
        purpose: 'SAAS_SUBSCRIPTION',
        agencyId,
        targetPlanId: targetPlan.id,
      },
    });

    return {
      sessionId,
      providerRef,
      provider: this.gateway.activeProvider,
      redirectUrl,
    };
  }

  async handleWebhook(
    provider: string,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
    this.requireOnlinePayments();
    // Adapter verifies the signature (throws on invalid) and that this is the
    // active provider.
    const event = await this.gateway.parseWebhook(provider, rawBody, headers);

    if (!event.paid) {
      // Best-effort: mark a still-pending session FAILED. No-op if already settled.
      await this.prisma.checkoutSession.updateMany({
        where: { providerRef: event.providerRef, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      return { received: true, settled: false };
    }

    const result = await this.payments.settleCheckout(event.providerRef);
    return { received: true, ...result };
  }
}
