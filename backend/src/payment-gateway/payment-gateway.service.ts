import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
 * Selects the active payment gateway from PAYMENT_PROVIDER (default MOCK) and
 * fronts the app with a stable API. Adding Stripe/CMI later is env config only —
 * no call-site changes.
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly providers: Record<PaymentProvider, PaymentGatewayProvider>;
  private readonly active: PaymentProvider;

  constructor(
    mock: MockGateway,
    stripe: StripeGateway,
    cmi: CmiGateway,
  ) {
    this.providers = { MOCK: mock, STRIPE: stripe, CMI: cmi };

    const configured = (process.env.PAYMENT_PROVIDER ?? 'mock').toUpperCase();
    if ((PAYMENT_PROVIDERS as readonly string[]).includes(configured)) {
      this.active = configured as PaymentProvider;
    } else {
      this.logger.warn(
        `Unknown PAYMENT_PROVIDER "${configured}" — falling back to MOCK`,
      );
      this.active = 'MOCK';
    }
    this.logger.log(`Payment gateway active provider: ${this.active}`);
  }

  get activeProvider(): PaymentProvider {
    return this.active;
  }

  createCheckout(input: CreateCheckoutInput) {
    return this.providers[this.active].createCheckout(input);
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
    if (provider.toUpperCase() !== this.active) {
      throw new BadRequestException(
        `Webhook provider "${provider}" is not the active gateway (${this.active}).`,
      );
    }
    return this.providers[this.active].parseWebhook(rawBody, headers);
  }
}
