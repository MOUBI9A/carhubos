import { Injectable } from '@nestjs/common';
import {
  CreateCheckoutInput,
  CreateCheckoutOutput,
  PaymentGatewayProvider,
  WebhookEvent,
} from '../payment-gateway.types';

/**
 * Stripe adapter — SCAFFOLD (mock-first: not wired to the `stripe` SDK yet, no
 * dependency added). Activated by PAYMENT_PROVIDER=stripe. Fails loud until it's
 * actually configured + implemented, so selecting it by mistake can never
 * silently no-op a real payment.
 *
 * To make it real (Stripe TEST mode needs only a free account — no LLC):
 *   1. `npm i stripe`; read STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET from env.
 *   2. createCheckout: `stripe.checkout.sessions.create({ mode: 'payment',
 *      line_items: [{ price_data: { currency, unit_amount: <amount in centimes,
 *      integer>, product_data: { name: input.description } }, quantity: 1 }],
 *      success_url: input.successUrl, cancel_url: input.cancelUrl,
 *      metadata: { sessionId: input.sessionId } })` → return
 *      { providerRef: session.id, redirectUrl: session.url }.
 *   3. parseWebhook: `stripe.webhooks.constructEvent(rawBody,
 *      headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)` — this is what
 *      authenticates the call; on `checkout.session.completed` return
 *      { providerRef: event.data.object.id, paid: true,
 *        amount: event.data.object.amount_total / 100 }. NEVER trust the body
 *      without constructEvent verifying the signature.
 *   Note: Stripe is not directly available to Morocco-based entities today —
 *   live use typically needs a foreign entity; test mode works regardless.
 */
@Injectable()
export class StripeGateway implements PaymentGatewayProvider {
  readonly name = 'STRIPE' as const;

  private notConfigured(): never {
    throw new Error(
      'Stripe gateway selected (PAYMENT_PROVIDER=stripe) but not implemented/' +
        'configured. Add the `stripe` SDK, set STRIPE_SECRET_KEY + ' +
        'STRIPE_WEBHOOK_SECRET, and implement StripeGateway (see the class doc).',
    );
  }

  async createCheckout(
    _input: CreateCheckoutInput,
  ): Promise<CreateCheckoutOutput> {
    return this.notConfigured();
  }

  async parseWebhook(
    _rawBody: string,
    _headers: Record<string, string | undefined>,
  ): Promise<WebhookEvent> {
    return this.notConfigured();
  }
}
