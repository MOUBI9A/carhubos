import {
  BadGatewayException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StripeGateway } from './stripe.gateway';
import { CmiGateway } from './cmi.gateway';

/**
 * Error mapping for the Stripe adapter.
 *
 * Found by a live test-mode smoke test (2026-08-11): every failure in here used
 * to throw a bare `Error`, which Nest turns into `500 Internal server error`
 * plus a stack trace. Two of those paths are reachable by anyone on the
 * internet — `/api/payments/webhooks/stripe` is public and unauthenticated —
 * so an unsigned POST was indistinguishable in the logs from a real outage.
 *
 * The rules these tests pin down:
 *   - a bad/forged/unsigned webhook is a 4xx (bad REQUEST), never a 5xx
 *   - missing configuration is 503 (not available yet), never 500 (we crashed)
 *   - an upstream refusal is 502, and the provider's own wording stays in the
 *     log rather than going out in the response
 */
describe('StripeGateway — error mapping', () => {
  const ENV = { ...process.env };
  let errorLogs: string[];
  let warnLogs: string[];

  beforeEach(() => {
    errorLogs = [];
    warnLogs = [];
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((m: any) => void errorLogs.push(String(m)));
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((m: any) => void warnLogs.push(String(m)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ENV };
  });

  const input = {
    sessionId: 'sess-1',
    amount: 4725,
    currency: 'MAD',
    description: 'Invoice 915284c7',
    successUrl: 'https://app.example.ma/ok',
    cancelUrl: 'https://app.example.ma/cancel',
  };

  /** Swap in a fake Stripe client, bypassing the lazy real-client construction. */
  const withClient = (client: unknown) => {
    const g = new StripeGateway();
    (g as unknown as { client: unknown }).client = client;
    return g;
  };

  describe('configuration faults are 503, not 500', () => {
    it('createCheckout without STRIPE_SECRET_KEY', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      await expect(new StripeGateway().createCheckout(input)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('the 503 keeps naming the missing variable, so it is self-diagnosing', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      await expect(new StripeGateway().createCheckout(input)).rejects.toThrow(
        /STRIPE_SECRET_KEY/,
      );
    });

    it('parseWebhook without STRIPE_WEBHOOK_SECRET', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      await expect(
        new StripeGateway().parseWebhook('{}', { 'stripe-signature': 't=1,v1=x' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('webhook rejections are 400, not 500 (public unauthenticated endpoint)', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    });

    it('a request with no stripe-signature header', async () => {
      const g = withClient({ webhooks: { constructEvent: jest.fn() } });
      await expect(g.parseWebhook('{"type":"x"}', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('a request whose signature does not verify', async () => {
      const g = withClient({
        webhooks: {
          constructEvent: jest.fn(() => {
            throw new Error('No signatures found matching the expected signature');
          }),
        },
      });
      await expect(
        g.parseWebhook('{"type":"x"}', { 'stripe-signature': 't=1,v1=forged' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('logs a forged signature as a warning, not an error with a stack', async () => {
      const g = withClient({
        webhooks: {
          constructEvent: jest.fn(() => {
            throw new Error('No signatures found matching the expected signature');
          }),
        },
      });
      await expect(
        g.parseWebhook('{}', { 'stripe-signature': 'forged' }),
      ).rejects.toThrow();
      expect(warnLogs.join('\n')).toMatch(/invalid signature/i);
      expect(errorLogs).toHaveLength(0);
    });

    it('still parses a genuine checkout.session.completed', async () => {
      const g = withClient({
        webhooks: {
          constructEvent: jest.fn(() => ({
            type: 'checkout.session.completed',
            data: {
              object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 472500 },
            },
          })),
        },
      });
      await expect(
        g.parseWebhook('{}', { 'stripe-signature': 'valid' }),
      ).resolves.toEqual({ providerRef: 'cs_test_1', paid: true, amount: 4725 });
    });
  });

  describe('an upstream refusal is 502 and does not leak the provider message', () => {
    // The real message that surfaced during the live smoke test.
    const STRIPE_MESSAGE =
      'In order to use Checkout, you must set an account or business name at ' +
      'https://dashboard.stripe.com/account.';

    const refusing = () =>
      withClient({
        checkout: {
          sessions: {
            create: jest.fn(() => Promise.reject(new Error(STRIPE_MESSAGE))),
          },
        },
      });

    it('maps to 502 Bad Gateway', async () => {
      await expect(refusing().createCheckout(input)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('the response tells the agency what to do instead', async () => {
      await expect(refusing().createCheckout(input)).rejects.toThrow(
        /record the payment manually/i,
      );
    });

    it('the provider wording goes to the log, never to the response', async () => {
      await expect(refusing().createCheckout(input)).rejects.not.toThrow(
        /dashboard\.stripe\.com/,
      );
      expect(errorLogs.join('\n')).toContain(STRIPE_MESSAGE);
    });

    it('a session created without a URL is also 502, not a bare 500', async () => {
      const g = withClient({
        checkout: {
          sessions: { create: jest.fn(() => Promise.resolve({ id: 'cs_1' })) },
        },
      });
      await expect(g.createCheckout(input)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('does not swallow a 503 config fault into a 502', async () => {
      // Reaching Stripe at all requires a key; that failure must keep its own
      // meaning rather than being reported as "the provider rejected us".
      delete process.env.STRIPE_SECRET_KEY;
      await expect(new StripeGateway().createCheckout(input)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('still sends MAD to Stripe as integer centimes', async () => {
      const create = jest.fn((_params: Record<string, any>) =>
        Promise.resolve({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' }),
      );
      const g = withClient({ checkout: { sessions: { create } } });
      await expect(g.createCheckout({ ...input, amount: 999.99 })).resolves.toEqual({
        providerRef: 'cs_1',
        redirectUrl: 'https://checkout.stripe.com/c/pay/cs_1',
      });
      const params = create.mock.calls[0][0];
      expect(params.line_items[0].price_data).toMatchObject({
        currency: 'mad',
        unit_amount: 99999, // 999.99 MAD → integer centimes, no float drift
      });
    });
  });
});

describe('CmiGateway — unimplemented is 503, not 500', () => {
  it('createCheckout', async () => {
    await expect(
      new CmiGateway().createCheckout({} as never),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('parseWebhook', async () => {
    await expect(
      new CmiGateway().parseWebhook('{}', {}),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps naming what is needed to configure it', async () => {
    await expect(new CmiGateway().createCheckout({} as never)).rejects.toThrow(
      /CMI_CLIENT_ID/,
    );
  });
});
