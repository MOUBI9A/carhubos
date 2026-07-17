import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import Stripe from 'stripe'; // Mocked for now

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  // private stripe: Stripe;

  constructor(private configService: ConfigService) {
    // this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
    //   apiVersion: '2023-10-16',
    // });
  }

  async createPaymentIntent(amount: number, currency: string = 'mad') {
    this.logger.log(
      `[STRIPE MOCK] Creating PaymentIntent for ${amount} ${currency}`,
    );
    // return this.stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Stripe expects cents/smallest unit
    //   currency,
    // });
    return {
      id: 'pi_mock_12345',
      client_secret: 'pi_mock_secret_67890',
      amount,
      status: 'requires_payment_method',
    };
  }

  async holdSecurityDeposit(customerId: string, amount: number) {
    this.logger.log(
      `[STRIPE MOCK] Holding caution deposit of ${amount} for customer ${customerId}`,
    );
    // Real implementation would place an authorization hold on the card.
    return { status: 'HELD', amount };
  }
}
