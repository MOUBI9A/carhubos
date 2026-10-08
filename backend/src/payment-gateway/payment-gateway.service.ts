import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  CreateCheckoutInput,
  PAYMENT_PROVIDERS,
  PaymentGatewayProvider,
  PaymentProvider,
} from './payment-gateway.types';
import { MockGateway } from './providers/mock.gateway';
import { StripeGateway } from './providers/stripe.gateway';
import { CmiGateway } from './providers/cmi.gateway';

/**
 * Selects the active payment gateway from PAYMENT_PROVIDER (production default DISABLED; local default MOCK) and
 * fronts the app with a stable API. Adding Stripe/CMI later is env config only —
 * no call-site changes.
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly providers: Record<PaymentProvider, PaymentGatewayProvider>;
  private readonly active: PaymentProvider | 'DISABLED';

  constructor(
    mock: MockGateway,
    stripe: StripeGateway,
    cmi: CmiGateway,
  ) {
    this.providers = { MOCK: mock, STRIPE: stripe, CMI: cmi };

    const configured = (process.env.PAYMENT_PROVIDER?.trim() ||
      (process.env.NODE_ENV === 'production' ? 'disabled' : 'mock')).toUpperCase();
    if (configured === 'DISABLED') {
      this.active = 'DISABLED';
    } else if ((PAYMENT_PROVIDERS as readonly string[]).includes(configured)) {
      this.active = configured as PaymentProvider;
    } else {
      throw new Error('Unknown PAYMENT_PROVIDER. Use DISABLED, MOCK, STRIPE or CMI.');
    }

    // Fail-fast, no fallbacks (CLAUDE.md §3, same idiom as JWT_SECRET/
    // IDENTITY_PEPPER). MockGateway accepts an unsigned {providerRef,
    // status:'PAID'} body as proof of payment — fine for local dev, but in
    // production it would let anyone settle their own invoice for free via
    // a direct POST to /payments/webhooks/mock. Refuse to boot rather than
    // run it in production. Missing configuration selects DISABLED; unknown
    // provider names fail rather than weakening authentication.
    if (this.active === 'MOCK' && process.env.NODE_ENV === 'production') {
      throw new Error(
        'PAYMENT_PROVIDER resolved to MOCK while NODE_ENV=production — refusing to start. ' +
          'Set PAYMENT_PROVIDER to DISABLED for manual billing, or STRIPE (see backend/.env.example).',
      );
    }

    this.logger.log(`Payment gateway active provider: ${this.active}`);
  }

  get activeProvider(): PaymentProvider | 'DISABLED' {
    return this.active;
  }

  private onlineProvider(): PaymentProvider {
    if (this.active === 'DISABLED') {
      throw new ServiceUnavailableException({
        code: 'ONLINE_PAYMENTS_DISABLED',
        message: 'Online payments are disabled. Contact the agency for manual payment.',
      });
    }
    return this.active;
  }

  createCheckout(input: CreateCheckoutInput) {
    return this.providers[this.onlineProvider()].createCheckout(input);
  }

  /**
   * Verify + parse an incoming webhook. Only the CONFIGURED provider's webhooks
   * are accepted — a call to `/payments/webhooks/stripe` while MOCK is active is
   * rejected, so a stray/forged endpoint for an inactive provider can't settle.
   */
  async parseWebhook(
    provider: string,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
    const active = this.onlineProvider();
    if (provider.toUpperCase() !== this.active) {
      throw new BadRequestException(
        `Webhook provider "${provider}" is not the active gateway (${this.active}).`,
      );
    }
    return this.providers[active].parseWebhook(rawBody, headers);
  }
}
