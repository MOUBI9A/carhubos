import { Module } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { MockGateway } from './providers/mock.gateway';
import { StripeGateway } from './providers/stripe.gateway';
import { CmiGateway } from './providers/cmi.gateway';

/**
 * The provider-agnostic payment gateway. Exports only PaymentGatewayService so
 * the rest of the app (checkout + webhook flow) never touches a concrete gateway.
 */
@Module({
  providers: [PaymentGatewayService, MockGateway, StripeGateway, CmiGateway],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
