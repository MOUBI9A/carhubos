"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Check, Sparkles } from 'lucide-react';
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
    <section id="pricing" className="py-32 bg-black relative scroll-mt-24">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Free during the beta</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-6">
            Simple, honest <span className="text-primary">pricing.</span>
          </h2>
          <p className="text-white/50 font-medium tracking-tight leading-relaxed">
            Every plan is <span className="text-white font-bold">free while we&apos;re in beta</span> — pick the tier that
            fits your fleet and pay nothing until we launch. Prices below are what you&apos;ll pay after.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isFeatured = plan.key === featured;
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-[2rem] p-8 border transition-all',
                  isFeatured
                    ? 'bg-primary/[0.07] border-primary/40 shadow-2xl shadow-primary/10 md:-translate-y-3'
                    : 'glass border-white/10',
                )}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[9px] font-black uppercase tracking-widest">
                    Most Popular
                  </span>
                )}
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">{plan.name}</p>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-4xl font-black text-white tracking-tighter">
                    {new Intl.NumberFormat('en-US').format(plan.priceMonthly)}
                  </span>
                  <span className="text-xs font-bold text-white/40 mb-1.5">{plan.currency}/mo</span>
                </div>
                <p className="text-[11px] font-medium text-white/40 mt-2 leading-relaxed min-h-[2.5rem]">
                  {plan.description}
                </p>

                <div className="mt-6 pt-6 border-t border-white/5 space-y-2.5 flex-1">
                  {limitLine(plan).map((l) => (
                    <div key={l} className="flex items-center gap-2.5 text-xs text-white/70 font-medium">
                      <Check className="w-4 h-4 text-success shrink-0" /> {l}
                    </div>
                  ))}
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-xs text-white/70 font-medium">
                      <Check className="w-4 h-4 text-primary shrink-0" /> {FEATURE_LABELS[f] ?? f}
                    </div>
                  ))}
                </div>

                <Link href="/signup" className="mt-8">
                  <Button
                    variant={isFeatured ? 'primary' : 'outline'}
                    className="w-full h-12 text-xs font-black uppercase tracking-[0.2em]"
                  >
                    Start free
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/25 mt-10">
          Prices in MAD, VAT included · No card required during beta
        </p>
      </div>
    </section>
  );
}
