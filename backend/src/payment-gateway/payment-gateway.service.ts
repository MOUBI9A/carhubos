import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
 * Selects the active payment gateway from PAYMENT_PROVIDER and fronts the app
 * with a stable API. DISABLED is the production-safe pilot mode: the rest of the
 * ERP can run, but no checkout or payment webhook can be accepted until a real
 * provider is configured.
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly providers: Record<Exclude<PaymentProvider, 'DISABLED'>, PaymentGatewayProvider>;
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

    // MockGateway accepts an unsigned {providerRef, status:'PAID'} body as proof
    // of payment. It must never be active in production. A pilot that has not
    // connected Stripe/CMI should set PAYMENT_PROVIDER=DISABLED instead.
    if (this.active === 'MOCK' && process.env.NODE_ENV === 'production') {
      throw new Error(
        'PAYMENT_PROVIDER resolved to MOCK while NODE_ENV=production — refusing to start. ' +
          'Set PAYMENT_PROVIDER to DISABLED, STRIPE or CMI (see backend/.env.example).',
      );
    }

    this.logger.log(`Payment gateway active provider: ${this.active}`);
  }

  get activeProvider(): PaymentProvider {
    return this.active;
  }

  createCheckout(input: CreateCheckoutInput) {
    if (this.active === 'DISABLED') {
      throw new ServiceUnavailableException(
        'Online payments are not enabled for this environment.',
      );
    }
    return this.providers[this.active].createCheckout(input);
  }

  /**
   * Verify + parse an incoming webhook. Only the CONFIGURED provider's webhooks
   * are accepted. In DISABLED mode all payment callbacks are rejected.
   */
  async parseWebhook(
    provider: string,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
    if (this.active === 'DISABLED') {
      throw new ServiceUnavailableException(
        'Online payments are not enabled for this environment.',
      );
    }
    if (provider.toUpperCase() !== this.active) {
      throw new BadRequestException(
        `Webhook provider "${provider}" is not the active gateway (${this.active}).`,
      );
    }
    return this.providers[this.active].parseWebhook(rawBody, headers);
  }
}
