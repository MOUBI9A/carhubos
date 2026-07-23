/**
 * Provider-agnostic payment gateway port. The app depends only on this shape;
 * concrete adapters (mock / stripe / cmi) implement it and are selected at
 * runtime by the PAYMENT_PROVIDER env var. Money note: `amount` here is the
 * informational major-unit figure handed to the gateway for display/charge; the
 * money OF RECORD stays the Invoice's Prisma.Decimal, and settlement reconciles
 * against that (never against a gateway-reported number) — see the settlement
 * service. The gateway-reported amount is only cross-checked, in integer cents.
 */
export const PAYMENT_PROVIDERS = ['MOCK', 'STRIPE', 'CMI'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export interface CreateCheckoutInput {
  /** Our own CheckoutSession.id — echoed back so the webhook can find it. */
  sessionId: string;
  /** Major currency units (e.g. 4500.00). Informational to the gateway. */
  amount: number;
  /** ISO currency, e.g. "MAD". */
  currency: string;
  description: string;
  /** Where the gateway sends the customer after success / cancel. */
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutOutput {
  /** The gateway's own session/intent id. Stored as CheckoutSession.providerRef
   *  (UNIQUE) — the idempotency key for webhook replay protection. */
  providerRef: string;
  /** Where to send the customer to complete payment (hosted checkout). */
  redirectUrl: string;
}

export interface WebhookEvent {
  /** Which checkout this callback settles (matches CheckoutSession.providerRef). */
  providerRef: string;
  /** True only for a confirmed successful payment. */
  paid: boolean;
  /** Gateway-reported amount in major units, for a cross-check against the
   *  invoice. Optional — absence just skips the cross-check. */
  amount?: number;
}

/** A concrete gateway adapter. */
export interface PaymentGatewayProvider {
  readonly name: PaymentProvider;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput>;
  /**
   * Verify + parse an incoming webhook. MUST throw on an invalid signature —
   * never return a `paid:true` it couldn't authenticate.
   */
  parseWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookEvent>;
}
