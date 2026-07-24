import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  CreateCheckoutInput,
  CreateCheckoutOutput,
  PaymentGatewayProvider,
  WebhookEvent,
} from '../payment-gateway.types';

/**
 * Stripe adapter — real, but DORMANT until configured. Activated by
 * PAYMENT_PROVIDER=stripe + STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET). Uses
 * Stripe Checkout Sessions (hosted payment page); the webhook is authenticated
 * by verifying its signature against the RAW request body (main.ts enables
 * rawBody, the controller passes req.rawBody).
 *
 * Stripe TEST mode needs only a free account — no LLC. Keys live in backend/.env
 * (gitignored); this code only reads env vars, never embeds a key. Live charges
 * need a business entity; Stripe isn't offered to Morocco-based entities
 * directly (use CMI for a Moroccan merchant, or a foreign entity for Stripe).
 */
@Injectable()
export class StripeGateway implements PaymentGatewayProvider {
  readonly name = 'STRIPE' as const;
  private readonly logger = new Logger(StripeGateway.name);
  private client: Stripe | null = null;

  private stripe(): Stripe {
    if (!this.client) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error(
          'Stripe gateway selected but STRIPE_SECRET_KEY is not set. Add a ' +
            'sk_test_… key (https://dashboard.stripe.com/test/apikeys) to backend/.env.',
        );
      }
      this.client = new Stripe(key);
    }
    return this.client;
  }

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutOutput> {
    // Stripe expects the amount in the currency's minor unit as an integer.
    // MAD is 2-decimal, so centimes = round(amount * 100) — integer, no float drift.
    const unitAmount = Math.round(input.amount * 100);
    const session = await this.stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: { name: input.description },
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // Echoed back so we can correlate to our CheckoutSession if ever needed;
      // settlement keys off the session id (providerRef).
      metadata: { sessionId: input.sessionId },
    });
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }
    return { providerRef: session.id, redirectUrl: session.url };
  }

  async parseWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET is not set — cannot verify the webhook signature.',
      );
    }
    const signature = headers['stripe-signature'];
    if (!signature) {
      throw new Error('Missing stripe-signature header.');
    }
    // constructEvent throws on a bad signature — this authenticates the call.
    // Never trust the body without it.
    const event = this.stripe().webhooks.constructEvent(
      rawBody,
      signature,
      secret,
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      return {
        providerRef: session.id,
        paid: session.payment_status === 'paid',
        amount:
          session.amount_total != null
            ? session.amount_total / 100
            : undefined,
      };
    }
    // Any other event type is acknowledged (200) but is not a settlement signal.
    this.logger.debug(`Ignoring Stripe event ${event.type}`);
    return { providerRef: '', paid: false };
  }
}
