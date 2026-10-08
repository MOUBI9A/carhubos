import { ServiceUnavailableException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

describe('disabled checkout cannot mutate financial records', () => {
  const query = jest.fn();
  const settleCheckout = jest.fn();
  const service = new CheckoutService({ invoice: { findFirst: query }, subscription: { findUnique: query }, checkoutSession: { create: query, updateMany: query } } as unknown as PrismaService,
    { activeProvider: 'DISABLED' } as PaymentGatewayService,
    { settleCheckout } as unknown as PaymentsService);
  it('rejects invoice checkout, subscription checkout and forged webhook before DB or settlement', async () => {
    await expect(service.createCheckout('agency', 'invoice', {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.createSubscriptionCheckout('agency', { planKey: 'PRO' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.handleWebhook('mock', '{"paid":true}', {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
    expect(settleCheckout).not.toHaveBeenCalled();
  });
});
