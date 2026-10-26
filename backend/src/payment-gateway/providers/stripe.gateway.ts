import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
 *
 * PRODUCTION HARDENING (per Stripe best-practices): prefer a RESTRICTED key
 * (`rk_`, least privilege — only Checkout Sessions write + webhook) over the full
 * secret key; keep it in a real secrets vault, not a committed file; and
 * IP-allowlist Stripe's webhook source ranges on the endpoint. This adapter takes
 * an `rk_` or `sk_` transparently — only the STRIPE_SECRET_KEY env value changes.
 * The integration follows the current guidance: Checkout Sessions, no
 * `payment_method_types` (dynamic payment methods), signature-verified webhook.
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
        // Config fault, not a caller fault: the gateway was selected but never
        // given a key. 503 rather than 500 so it reads as "not available yet"
        // in logs and monitoring instead of "the app is broken".
        throw new ServiceUnavailableException(
          'Online payment is not available: the Stripe gateway is selected but ' +
            'STRIPE_SECRET_KEY is not set (see backend/.env.example).',
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
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe().checkout.sessions.create({
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
    } catch (err) {
      // Stripe refusing the call is an UPSTREAM failure, not an app bug — an
      // unhandled throw here surfaced to the agency as a bare 500 "Internal
      // server error", which tells the person taking the payment nothing and
      // hides the real cause (e.g. an account-level setting Stripe requires
      // before Checkout works at all).
      //
      // The provider's own message goes to the log, NOT to the response: it is
      // written for whoever owns the Stripe account — the platform — and an
      // agency user is not that person. They get an actionable operational
      // message and still have the manual "record a payment" path.
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(
        // Spell out the unit: `472500 MAD` in a log at 2am reads as four hundred
        // seventy-two thousand dirhams, not 4725.00.
        `Stripe refused a checkout session (amount=${unitAmount} centimes = ` +
          `${input.amount} ${input.currency}, sessionId=${input.sessionId}): ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException(
        'The payment provider rejected this request, so no payment link was ' +
          'created. Record the payment manually, or try again shortly.',
      );
    }
    if (!session.url) {
      this.logger.error(
        `Stripe created session ${session.id} without a checkout URL.`,
      );
      throw new BadGatewayException(
        'The payment provider did not return a payment link. Record the ' +
          'payment manually, or try again shortly.',
      );
    }
    return { providerRef: session.id, redirectUrl: session.url };
  }

  async parseWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      // Config fault. 503 also tells Stripe to retry later, which is what we
      // want — the delivery is legitimate, we just can't verify it yet.
      throw new ServiceUnavailableException(
        'Cannot verify the webhook signature: STRIPE_WEBHOOK_SECRET is not set.',
      );
    }

    // This endpoint is PUBLIC and unauthenticated — anyone on the internet can
    // POST to it. Every rejection below therefore has to be a 4xx: an unsigned
    // or forged request is a bad REQUEST, not an internal fault. Throwing a
    // bare Error made each one a 500 with a stack trace, which meant background
    // internet noise looked identical to a real outage in the logs, and would
    // page whoever is on call once error tracking lands in Phase 9.
    const signature = headers['stripe-signature'];
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }
    // constructEvent throws on a bad signature — this authenticates the call.
    // Never trust the body without it.
    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      // Worth seeing (someone is posting forged webhooks) but not as an error
      // with a stack — it is an expected, handled rejection.
      this.logger.warn(
        `Rejected a Stripe webhook with an invalid signature: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

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
