import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateCheckoutDto } from './dto/checkout.dto';

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

  async createCheckout(
    agencyId: string,
    invoiceId: string,
    urls: CreateCheckoutDto,
  ) {
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

  async handleWebhook(
    provider: string,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
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
