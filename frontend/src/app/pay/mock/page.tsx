"use client";

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

/**
 * Stand-in "hosted checkout" page for the MOCK payment gateway
 * (PaymentGatewayService / MockGateway). Not auth-gated — a real Stripe
 * Checkout page isn't part of this app either, and the webhook it posts to
 * is itself public (the gateway is the caller). Generic across every
 * CheckoutSession purpose (booking invoice or SaaS subscription); the
 * caller decides where successUrl/cancelUrl point.
 */
export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<MockCheckoutFallback />}>
      <MockCheckoutInner />
    </Suspense>
  );
}

function MockCheckoutFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 rounded-2xl bg-surface border border-hairline flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
    </div>
  );
}

function MockCheckoutInner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') ?? '';
  const amount = searchParams.get('amount') ?? '0';
  const currency = searchParams.get('currency') ?? 'MAD';
  const successUrl = searchParams.get('successUrl') ?? '/';
  const cancelUrl = searchParams.get('cancelUrl') ?? '/';

  const [submitting, setSubmitting] = useState<'pay' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settle = async (
    status: 'PAID' | 'FAILED',
    redirectTo: string,
    which: 'pay' | 'cancel',
  ) => {
    setSubmitting(which);
    setError(null);
    try {
      await api.post('/payments/webhooks/mock', {
        providerRef: ref,
        status,
        amount: Number(amount),
      });
      window.location.href = redirectTo;
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Could not reach the mock gateway.',
      );
      setSubmitting(null);
    }
  };

  if (!ref) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
          <p className="font-medium text-foreground">Missing checkout reference</p>
          <p className="text-sm text-text-muted mt-1">
            This page is only reachable via a real checkout redirect.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Mock checkout</p>
            <p className="text-xs text-text-muted">Fider dev gateway — no real charge occurs</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-raised border border-hairline p-5 mb-6 text-center">
          <p className="eyebrow mb-1">Amount due</p>
          <p className="text-3xl font-semibold font-mono tabular text-foreground">
            {Number(amount).toFixed(2)} {currency}
          </p>
        </div>

        {error && <p className="text-xs text-danger mb-4 text-center">{error}</p>}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => settle('FAILED', cancelUrl, 'cancel')}
            isLoading={submitting === 'cancel'}
            disabled={submitting !== null}
          >
            Cancel
          </Button>
          <Button
            variant="premium"
            className="flex-1"
            onClick={() => settle('PAID', successUrl, 'pay')}
            isLoading={submitting === 'pay'}
            disabled={submitting !== null}
          >
            Pay now
          </Button>
        </div>

        <p className="text-[11px] text-text-faint text-center mt-5">
          Reference: <span className="font-mono">{ref}</span>
        </p>
      </Card>
    </div>
  );
}
