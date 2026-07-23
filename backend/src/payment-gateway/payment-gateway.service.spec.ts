import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { MockGateway } from './providers/mock.gateway';
import { StripeGateway } from './providers/stripe.gateway';
import { CmiGateway } from './providers/cmi.gateway';

describe('PaymentGatewayService (provider selection + mock adapter)', () => {
  const ORIGINAL = process.env.PAYMENT_PROVIDER;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = ORIGINAL;
  });

  const make = () =>
    new PaymentGatewayService(
      new MockGateway(),
      new StripeGateway(),
      new CmiGateway(),
    );

  it('defaults to MOCK when PAYMENT_PROVIDER is unset', () => {
    delete process.env.PAYMENT_PROVIDER;
    expect(make().activeProvider).toBe('MOCK');
  });

  it('falls back to MOCK on an unknown PAYMENT_PROVIDER', () => {
    process.env.PAYMENT_PROVIDER = 'paypal';
    expect(make().activeProvider).toBe('MOCK');
  });

  it('MOCK createCheckout returns a deterministic providerRef + redirect url', async () => {
    delete process.env.PAYMENT_PROVIDER;
    const out = await make().createCheckout({
      sessionId: 'sess-123',
      amount: 4500,
      currency: 'MAD',
      description: 'Booking payment',
      successUrl: 'http://localhost:3002/ok',
      cancelUrl: 'http://localhost:3002/cancel',
    });
    expect(out.providerRef).toBe('mock_sess-123');
    expect(out.redirectUrl).toContain('ref=mock_sess-123');
  });

  it('MOCK parseWebhook reads paid/failed and rejects a missing ref', async () => {
    delete process.env.PAYMENT_PROVIDER;
    const svc = make();
    await expect(
      svc.parseWebhook(
        'mock',
        JSON.stringify({ providerRef: 'mock_x', status: 'PAID', amount: 4500 }),
        {},
      ),
    ).resolves.toEqual({ providerRef: 'mock_x', paid: true, amount: 4500 });

    await expect(
      svc.parseWebhook(
        'mock',
        JSON.stringify({ providerRef: 'mock_x', status: 'FAILED' }),
        {},
      ),
    ).resolves.toEqual({ providerRef: 'mock_x', paid: false, amount: undefined });

    await expect(svc.parseWebhook('mock', '{}', {})).rejects.toThrow();
  });

  it('rejects a webhook for a provider that is not the active one', async () => {
    delete process.env.PAYMENT_PROVIDER; // MOCK active
    await expect(make().parseWebhook('stripe', '{}', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('STRIPE/CMI adapters fail loud until configured — never silently no-op', async () => {
    await expect(
      new StripeGateway().createCheckout({} as any),
    ).rejects.toThrow(/not implemented\/configured/i);
    await expect(new CmiGateway().createCheckout({} as any)).rejects.toThrow(
      /not implemented\/configured/i,
    );
  });
});
