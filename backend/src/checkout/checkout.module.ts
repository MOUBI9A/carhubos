import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  // PaymentGatewayModule → the configured gateway; PaymentsModule → settlement
  // (reuses the existing reconcile). No cycle: neither imports CheckoutModule.
  imports: [PrismaModule, PaymentGatewayModule, PaymentsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
