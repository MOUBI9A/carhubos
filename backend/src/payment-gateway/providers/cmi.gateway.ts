import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  CreateCheckoutInput,
  CreateCheckoutOutput,
  PaymentGatewayProvider,
  WebhookEvent,
} from '../payment-gateway.types';

/**
 * CMI adapter (Centre Monétique Interbancaire — Morocco's bank card gateway) —
 * SCAFFOLD. Activated by PAYMENT_PROVIDER=cmi. Fails loud until implemented, so
 * a mis-selection can never silently no-op a payment.
 *
 * CMI needs a MERCHANT CONTRACT with a Moroccan acquiring bank (not just an
 * account) — so this stays a scaffold until those credentials exist. Protocol
 * shape when implementing:
 *   - createCheckout: build an auto-submitting HTML form POST to CMI's hosted
 *     payment page with clientid, oid (= our sessionId), amount, currency (504
 *     for MAD), okUrl/failUrl/callbackUrl, rnd, and a `hash` computed as
 *     Base64(SHA-512(sorted request params joined with `|` + storeKey)). Return
 *     { providerRef: oid, redirectUrl } (or hand the form back to render).
 *   - parseWebhook (CMI callback POST): recompute the SHA-512 HASH over the
 *     posted params + storeKey and compare to the posted `HASH` — THIS is the
 *     authentication; reject on mismatch. `ProcReturnCode === '00'` &&
 *     `Response === 'Approved'` ⇒ paid. providerRef = posted `oid`. Read
 *     CMI_CLIENT_ID + CMI_STORE_KEY + CMI_GATEWAY_URL from env.
 */
@Injectable()
export class CmiGateway implements PaymentGatewayProvider {
  readonly name = 'CMI' as const;

  // Still fails loud, but as 503 "not available" rather than 500 "app broke" —
  // selecting an unimplemented gateway is a configuration state, not a crash,
  // and the distinction matters once error tracking is watching 5xx.
  private notConfigured(): never {
    throw new ServiceUnavailableException(
      'CMI gateway selected (PAYMENT_PROVIDER=cmi) but not implemented/' +
        'configured. Requires a CMI merchant contract; set CMI_CLIENT_ID + ' +
        'CMI_STORE_KEY + CMI_GATEWAY_URL and implement CmiGateway (see the doc).',
    );
  }

  async createCheckout(
    _input: CreateCheckoutInput,
  ): Promise<CreateCheckoutOutput> {
    return this.notConfigured();
  }

  async parseWebhook(
    _rawBody: string,
    _headers: Record<string, string | undefined>,
  ): Promise<WebhookEvent> {
    return this.notConfigured();
  }
}
