"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { SealDivider } from '@/components/ui/Seal';
import {
  Fingerprint,
  Receipt,
  Building2,
  FileWarning,
} from 'lucide-react';
import SolutionsSection from './_components/SolutionsSection';
import PricingSection from './_components/PricingSection';
import ContactSection from './_components/ContactSection';

export default function LandingPage() {
  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Hero Section — editorial, photographic, one brass CTA + one brass accent word */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <p className="eyebrow mb-5">Now in early access</p>
            <h1 className="display text-5xl md:text-6xl lg:text-7xl text-foreground mb-6">
              Run your rental agency on{' '}
              <span className="metal-text font-display italic">one trusted spine.</span>
            </h1>
            <p className="text-lg md:text-xl text-text-muted leading-relaxed max-w-xl mb-9">
              The operating system for Morocco&apos;s car-rental agencies — trust, fleet and
              finance in one place. Know a renter&apos;s history before you hand over the keys.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button variant="premium" size="lg">Get started free</Button>
              </Link>
              <Link href="#solutions">
                <Button variant="outline" size="lg">See how it works</Button>
              </Link>
            </div>
          </div>

          {/* Right: hero photography (real photo drops in via src later) */}
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            <AgencyImage
              slot="hero"
              alt="An agency owner handing over the keys"
              ratio="4 / 3"
              rounded="rounded-2xl"
              className="shadow-soft"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-24 md:py-32 scroll-mt-24 border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl mb-14 md:mb-16">
            <p className="eyebrow mb-4">What you get</p>
            <h2 className="display text-4xl md:text-5xl lg:text-6xl text-foreground mb-5">
              Four moving parts. One system of record.
            </h2>
            <p className="text-lg text-text-muted leading-relaxed">
              Trust, finance, compliance and fleet-sharing — the whole agency on a single
              spine, so nothing lives in a spreadsheet or a group chat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Trust Network',
                description: 'Privacy-hashed CIN (HMAC-SHA256) plus a cross-agency review score — collective renter trust, not a credit bureau.',
                icon: Fingerprint,
                tag: 'Trust · Reviews · Blacklist',
              },
              {
                title: 'Financial Engine',
                description: 'MAD invoicing with 20% VAT, security deposits, and PAID / PARTIAL / DUE reconciliation to the cent.',
                icon: Receipt,
                tag: 'Invoices · Payments · VAT',
              },
              {
                title: 'Compliance Guardrails',
                description: 'Document-expiry enforcement and inspection gates stop a non-compliant car — or an unverified renter — before handover.',
                icon: FileWarning,
                tag: 'Documents · Inspections',
              },
              {
                title: 'B2B Hub',
                description: 'Share fleet across the agency network so an idle car earns from demand sitting at another agency.',
                icon: Building2,
                tag: 'Fleet sharing · Network',
              },
            ].map((feature, i) => (
              <Card key={i} padding="lg" className="group h-full">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised border border-hairline transition-colors group-hover:border-metal/40">
                  <feature.icon className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-4">{feature.description}</p>
                <p className="eyebrow">{feature.tag}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions + interactive Trust Console + Enterprise strip */}
      <SolutionsSection />

      {/* Honest capability tiles (was: fabricated stats) */}
      <section className="relative py-24 border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
            {[
              { value: 'MAD + 20% VAT', label: 'Native ledger — reconciled to the cent' },
              { value: 'Per-vehicle ROI', label: 'Live P&L on every asset' },
              { value: 'Paid · Partial · Due', label: 'Invoices auto-reconciled' },
              { value: 'HMAC-SHA256', label: 'Hashed identities · tenant-isolated · audit-logged' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="font-mono tabular text-2xl md:text-3xl text-foreground mb-3 leading-tight">{stat.value}</p>
                <p className="eyebrow">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public pricing (real, from GET /platform/plans) */}
      <PricingSection />

      {/* CTA Section */}
      <section className="relative py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <SealDivider className="mb-14 md:mb-16" />
          <Card padding="lg" className="text-center p-10 md:p-16">
            <h2 className="display text-4xl md:text-5xl lg:text-6xl text-foreground mb-6">
              Be a founding agency on the network.
            </h2>
            <p className="text-lg text-text-muted leading-relaxed max-w-lg mx-auto mb-10">
              The trust graph gets stronger with every agency that joins — and founders shape the
              signal everyone else inherits. Come see it on your own fleet.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#contact" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full">Request early access</Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="ghost" size="lg" className="w-full">Sign in</Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <ContactSection email="hamzamoadin37@gmail.com" whatsapp="+212616880653" />
    </div>
  );
}
