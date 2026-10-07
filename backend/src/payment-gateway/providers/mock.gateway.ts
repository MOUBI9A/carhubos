import { Injectable, Logger } from '@nestjs/common';
import {
  CreateCheckoutInput,
  CreateCheckoutOutput,
  PaymentGatewayProvider,
  WebhookEvent,
} from '../payment-gateway.types';

/**
 * Credential-free gateway for local/dev + demos. It drives the SAME flow a real
 * gateway does — createCheckout hands back a redirect to a mock hosted-checkout
 * page, and the "gateway" later POSTs a webhook to settle — but needs no account.
 *
 * Security: the mock webhook is trusted (no cryptographic signature), so this
 * provider is dev-only. It is reachable ONLY when PAYMENT_PROVIDER=mock (the
 * webhook controller rejects a provider that isn't the configured one), and the
 * settlement path still cross-checks the amount against the invoice's own
 * Decimal, so a wrong mock amount can't over-settle.
 */
@Injectable()
export class MockGateway implements PaymentGatewayProvider {
  readonly name = 'MOCK' as const;
  private readonly logger = new Logger(MockGateway.name);

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutOutput> {
    const providerRef = `mock_${input.sessionId}`;
    // Points at a simple dev "hosted checkout" surface; the actual settlement
    // happens when that surface (or a test) POSTs the webhook back. Uses
    // successUrl's origin as the app base so it works wherever the app runs.
    // successUrl/cancelUrl are carried through as params so that surface knows
    // where to send the browser after it "pays" or cancels.
    const base = safeOrigin(input.successUrl) ?? 'http://localhost:3002';
    const params = new URLSearchParams({
      ref: providerRef,
      amount: String(input.amount),
      currency: input.currency,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    const redirectUrl = `${base}/pay/mock?${params.toString()}`;
    this.logger.log(
      `MOCK checkout created for session ${input.sessionId} (${input.amount} ${input.currency})`,
    );
    return { providerRef, redirectUrl };
  }

  async parseWebhook(rawBody: string): Promise<WebhookEvent> {
    // Mock webhook body: { providerRef, status: 'PAID'|'FAILED', amount }.
    let body: { providerRef?: string; status?: string; amount?: number };
    try {
      body = JSON.parse(rawBody || '{}');
    } catch {
      throw new Error('MOCK webhook: body is not valid JSON');
    }
    if (!body.providerRef) {
      throw new Error('MOCK webhook: missing providerRef');
    }
    return {
      providerRef: body.providerRef,
      paid: body.status === 'PAID',
      amount: typeof body.amount === 'number' ? body.amount : undefined,
    };
  }
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
