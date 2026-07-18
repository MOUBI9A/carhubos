import React from 'react';
import Link from 'next/link';
import {
  Fingerprint,
  CalendarCheck,
  Receipt,
  Car,
  Building2,
  Network,
  ShieldCheck,
  KeyRound,
  ScrollText,
  FileWarning,
  Gauge,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { AgencyImage } from '@/components/ui/AgencyImage';
import TrustConsole from './TrustConsole';

const PILLARS = [
  {
    name: 'The Trust Network',
    pain: 'You hand keys to strangers — and hope.',
    valueProp:
      "A renter's CIN is HMAC-hashed on device, then reviews and blacklist flags from every agency resolve into one cross-network risk band and deposit rule — seen before the keys leave your hand. No shared list of names, and no competitor shares renter trust across agencies.",
    icon: Fingerprint,
    tag: 'Trust · Reviews · Blacklist',
    featured: true,
  },
  {
    name: 'Booking Lifecycle',
    pain: 'Double-bookings, paper contracts, skipped inspections.',
    valueProp:
      'Request → approve → active → complete on one rail, with a hard double-booking guard (re-checked inside a database transaction), e-signed digital contracts, and pre/post inspections — the auditable record every trust review is built on.',
    icon: CalendarCheck,
    tag: 'Bookings · Contracts',
  },
  {
    name: 'Financial Engine',
    pain: 'Who paid? Which invoice? How much VAT?',
    valueProp:
      'MAD-native invoicing with 20% VAT, security deposits, and automatic PAID / PARTIAL / DUE reconciliation to the cent — money math in Decimal cents, plus per-booking payment verification and per-vehicle ROI.',
    icon: Receipt,
    tag: 'Invoices · Payments',
  },
  {
    name: 'Fleet & Assets',
    pain: 'Which car actually makes you money?',
    valueProp:
      'Every vehicle carries its own P&L — documents, maintenance, availability and live ROI — with document-expiry enforcement that blocks a car from renting on lapsed papers.',
    icon: Car,
    tag: 'Fleet · Maintenance',
  },
  {
    name: 'B2B Hub',
    pain: 'Cars sit idle while demand sits next door.',
    valueProp:
      'List and share fleet across the agency network, so a car idle on your lot earns from demand sitting at another — turning idle inventory into utilization.',
    icon: Building2,
    tag: 'Hub · Network',
  },
];

const STEPS = [
  {
    icon: Fingerprint,
    title: 'Hash the CIN',
    body: 'HMAC-SHA256, on device. It is POSTed, never GET — so a renter’s ID never lands in a URL or a log.',
  },
  {
    icon: Network,
    title: 'Pool the signals',
    body: 'Reviews and blacklist flags from every agency that ever met the same physical renter — resolved as one graph.',
  },
  {
    icon: ShieldCheck,
    title: 'Resolve the risk',
    body: 'One risk band and a deposit rule, surfaced before the keys change hands. Not a name. Not a credit score.',
  },
];

const LEGEND = [
  { label: 'Trusted', dot: 'bg-success' },
  { label: 'Caution', dot: 'bg-warning' },
  { label: 'New', dot: 'bg-text-faint' },
  { label: 'Blacklisted', dot: 'bg-danger' },
];

const ENTERPRISE = [
  { icon: ShieldCheck, label: 'Multi-tenant isolation' },
  { icon: KeyRound, label: 'RBAC · 5 roles' },
  { icon: ScrollText, label: 'Audit logging' },
  { icon: FileWarning, label: 'Document-expiry enforcement' },
  { icon: Gauge, label: 'Rate limiting' },
  { icon: Fingerprint, label: 'HMAC-SHA256 identities' },
  { icon: Lock, label: 'JWT · HttpOnly cookie' },
];

export default function SolutionsSection() {
  return (
    <section id="solutions" className="relative py-24 md:py-32 scroll-mt-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* (A) Header */}
        <div className="max-w-3xl mb-14 md:mb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <p className="eyebrow mb-4">Solutions · The trust network</p>
          <h2 className="display text-4xl md:text-5xl lg:text-6xl text-foreground mb-5">
            A stranger to you. <br />
            Not to the network.
          </h2>
          <p className="text-lg text-text-muted leading-relaxed">
            Every completed rental leaves a signal. Fider privacy-hashes each renter&apos;s national ID, then
            resolves reviews and blacklist flags from across the network into one risk band — seen before the
            keys change hands. Fleet, bookings and MAD-native finance ride the same spine.
          </p>
        </div>

        {/* (B) Bento: live console + de-mystifier */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7">
            <TrustConsole />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between gap-8">
            {/* 3-step flow */}
            <div className="relative ps-2">
              <div className="absolute start-[27px] top-6 bottom-6 w-px bg-hairline" />
              <div className="space-y-8">
                {STEPS.map((s, i) => (
                  <div key={i} className="relative flex gap-5">
                    <div className="relative z-10 shrink-0 w-12 h-12 rounded-2xl bg-surface-raised border border-hairline flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="eyebrow">0{i + 1}</span>
                        <h4 className="text-base font-semibold text-foreground">{s.title}</h4>
                      </div>
                      <p className="text-sm text-text-muted leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk-band legend */}
            <div className="bg-surface border border-hairline rounded-2xl px-5 py-4">
              <p className="eyebrow mb-3">Risk bands</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', l.dot)} />
                    <span className="eyebrow">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* (C) Pillar spine */}
        <div className="mt-20">
          <p className="eyebrow mb-8">One spine · six modules</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {PILLARS.map((p, i) => (
              <Card
                key={i}
                padding="lg"
                className={cn(
                  'group h-full flex flex-col animate-in fade-in slide-in-from-bottom-4',
                  p.featured && 'ring-1 ring-metal/30 md:col-span-2 lg:col-span-1',
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {p.featured && (
                  <AgencyImage
                    slot="agency"
                    alt="An agency owner reviewing a renter's trust band before handing over the keys"
                    ratio="16 / 9"
                    rounded="rounded-lg"
                    className="mb-5"
                  />
                )}
                <div
                  className={cn(
                    'mb-6 flex h-12 w-12 items-center justify-center rounded-xl border bg-surface-raised transition-colors',
                    p.featured
                      ? 'border-metal/40'
                      : 'border-hairline group-hover:border-metal/40',
                  )}
                >
                  <p.icon
                    className={cn('h-6 w-6', p.featured ? 'text-metal' : 'text-text-muted')}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{p.name}</h3>
                <p className="text-sm font-medium text-text-muted leading-relaxed mb-3">{p.pain}</p>
                <p className="text-sm text-text-muted leading-relaxed mb-5 flex-1">{p.valueProp}</p>
                <p className="eyebrow">{p.tag}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* (D) Enterprise strip — resolves the #enterprise anchor */}
        <div id="enterprise" className="mt-20 scroll-mt-24">
          <div className="max-w-3xl mb-8">
            <p className="eyebrow mb-4">Security &amp; compliance</p>
            <h3 className="display text-2xl md:text-3xl text-foreground mb-4">
              Enterprise-grade by default.
            </h3>
            <p className="text-lg text-text-muted leading-relaxed">
              Security posture, not a promise — the architecture that lets agencies share trust without
              sharing customer lists.
            </p>
          </div>
          <div className="bg-surface border border-hairline rounded-2xl px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-4">
            {ENTERPRISE.map((e) => (
              <div key={e.label} className="flex items-center gap-2.5">
                <e.icon className="w-4 h-4 text-text-faint shrink-0" strokeWidth={1.5} />
                <span className="eyebrow">{e.label}</span>
              </div>
            ))}
            <Link
              href="#contact"
              className="ms-auto inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary transition-colors"
            >
              Request the security overview
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
