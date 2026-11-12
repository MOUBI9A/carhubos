"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface PublicPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  currency: string;
  maxCars: number | null;
  maxStaff: number | null;
  maxBookingsPerMonth: number | null;
  features: string[];
  sortOrder: number;
}

const FEATURE_LABELS: Record<string, string> = {
  trust_network: 'Trust Network access',
  hub: 'B2B Hub listings',
  ai_vision: 'AI-vision inspections',
  reports: 'Report Factory & exports',
  api_access: 'API & webhooks',
  priority_support: 'Priority support',
};

function limitLine(plan: PublicPlan): string[] {
  const cars = plan.maxCars === null ? 'Unlimited vehicles' : `Up to ${plan.maxCars} vehicles`;
  const staff = plan.maxStaff === null ? 'Unlimited staff seats' : `${plan.maxStaff} staff seats`;
  const bkg = plan.maxBookingsPerMonth === null ? 'Unlimited bookings' : `${plan.maxBookingsPerMonth} bookings / month`;
  return [cars, staff, bkg];
}

export default function PricingSection() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<PublicPlan[]>('/platform/plans')
      .then((res) => setPlans(res.data))
      .catch(() => setPlans([]))
      .finally(() => setLoaded(true));
  }, []);

  // Render nothing until we have real plans (no fabricated pricing).
  if (!loaded || plans.length === 0) return null;

  const featured = 'PRO';

  return (
    <section id="pricing" className="relative py-24 md:py-32 scroll-mt-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
          <div className="flex justify-center mb-5">
            <Badge variant="trust">Published plan information</Badge>
          </div>
          <h2 className="display text-4xl md:text-5xl lg:text-6xl text-foreground mb-5">
            Simple, honest pricing.
          </h2>
          <p className="text-lg text-text-muted leading-relaxed">
            Compare the plans and their current published rates. Any beta discount,
            taxes and future renewal price must be confirmed before you agree to pay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isFeatured = plan.key === featured;
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl p-8',
                  isFeatured
                    ? 'bg-surface-raised border border-metal/30 shadow-soft md:-translate-y-3'
                    : 'bg-surface border border-hairline',
                )}
              >
                {isFeatured && (
                  <span className="absolute -top-3 start-1/2 -translate-x-1/2">
                    <Badge variant="trust">Highlighted plan</Badge>
                  </span>
                )}
                <p className="eyebrow mb-4">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span
                    className={cn(
                      'font-mono tabular text-4xl font-semibold',
                      isFeatured ? 'metal-text' : 'text-foreground',
                    )}
                  >
                    {new Intl.NumberFormat('en-US').format(plan.priceMonthly)}
                  </span>
                  <span className="text-xs text-text-faint mb-1.5">{plan.currency}/mo</span>
                </div>
                <p className="text-sm text-text-muted leading-relaxed min-h-[2.5rem] mb-6">
                  {plan.description}
                </p>

                <div className="border-t border-hairline pt-6 space-y-2.5 flex-1">
                  {limitLine(plan).map((l) => (
                    <div key={l} className="flex items-center gap-2.5 text-sm text-text-muted">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {l}
                    </div>
                  ))}
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-text-muted">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {FEATURE_LABELS[f] ?? f}
                    </div>
                  ))}
                </div>

                <Link href="/signup" className="mt-8">
                  <Button variant={isFeatured ? 'premium' : 'outline'} className="w-full">
                    Explore this plan
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-text-faint mt-10">
          Prices and applicable taxes must be confirmed before any payment. No card required at signup.
        </p>
      </div>
    </section>
  );
}
