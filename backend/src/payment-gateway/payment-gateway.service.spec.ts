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
    const key = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      // Stripe is real now but dormant without a key.
      await expect(
        new StripeGateway().createCheckout({} as any),
      ).rejects.toThrow(/STRIPE_SECRET_KEY/i);
    } finally {
      if (key !== undefined) process.env.STRIPE_SECRET_KEY = key;
    }
    // CMI is still a scaffold (needs a bank merchant contract).
    await expect(new CmiGateway().createCheckout({} as any)).rejects.toThrow(
      /not implemented\/configured/i,
    );
  });

  describe('MOCK gateway production fail-safe (audit 2026-07-26 #5)', () => {
    const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
    afterEach(() => {
      if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    });

    it('refuses to construct when NODE_ENV=production and PAYMENT_PROVIDER is unset (would silently default to MOCK)', () => {
      delete process.env.PAYMENT_PROVIDER;
      process.env.NODE_ENV = 'production';
      expect(() => make()).toThrow(/PAYMENT_PROVIDER resolved to MOCK/i);
    });

    it('refuses to construct when NODE_ENV=production and PAYMENT_PROVIDER is explicitly "mock"', () => {
      process.env.PAYMENT_PROVIDER = 'mock';
      process.env.NODE_ENV = 'production';
      expect(() => make()).toThrow(/PAYMENT_PROVIDER resolved to MOCK/i);
    });

    it('refuses to construct when NODE_ENV=production and PAYMENT_PROVIDER is unrecognized (falls back to MOCK)', () => {
      process.env.PAYMENT_PROVIDER = 'paypal';
      process.env.NODE_ENV = 'production';
      expect(() => make()).toThrow(/PAYMENT_PROVIDER resolved to MOCK/i);
    });

    it('still allows MOCK outside production', () => {
      delete process.env.PAYMENT_PROVIDER;
      process.env.NODE_ENV = 'test';
      expect(make().activeProvider).toBe('MOCK');
    });

    it('allows a real provider (STRIPE) in production', () => {
      process.env.PAYMENT_PROVIDER = 'stripe';
      process.env.NODE_ENV = 'production';
      expect(make().activeProvider).toBe('STRIPE');
    });
  });
});
