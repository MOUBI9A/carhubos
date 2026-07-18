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
import TrustConsole from './TrustConsole';

const PILLARS = [
  {
    name: 'The Trust Network',
    pain: 'You hand keys to strangers — and hope.',
    valueProp:
      "A renter's CIN is HMAC-hashed on device, then reviews and blacklist flags from every agency resolve into one cross-network risk band and deposit rule — seen before the keys leave your hand. No shared list of names, and no competitor shares renter trust across agencies.",
    icon: Fingerprint,
    tag: 'Trust · Reviews · Blacklist',
    color: 'text-primary',
    bg: 'bg-primary/10',
    featured: true,
  },
  {
    name: 'Booking Lifecycle',
    pain: 'Double-bookings, paper contracts, skipped inspections.',
    valueProp:
      'Request → approve → active → complete on one rail, with a hard double-booking guard (re-checked inside a database transaction), e-signed digital contracts, and pre/post inspections — the auditable record every trust review is built on.',
    icon: CalendarCheck,
    tag: 'Bookings · Contracts',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    name: 'Financial Engine',
    pain: 'Who paid? Which invoice? How much VAT?',
    valueProp:
      'MAD-native invoicing with 20% VAT, security deposits, and automatic PAID / PARTIAL / DUE reconciliation to the cent — money math in Decimal cents, plus per-booking payment verification and per-vehicle ROI.',
    icon: Receipt,
    tag: 'Invoices · Payments',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    name: 'Fleet & Assets',
    pain: 'Which car actually makes you money?',
    valueProp:
      'Every vehicle carries its own P&L — documents, maintenance, availability and live ROI — with document-expiry enforcement that blocks a car from renting on lapsed papers.',
    icon: Car,
    tag: 'Fleet · Maintenance',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    name: 'B2B Hub',
    pain: 'Cars sit idle while demand sits next door.',
    valueProp:
      'List and share fleet across the agency network, so a car idle on your lot earns from demand sitting at another — turning idle inventory into utilization.',
    icon: Building2,
    tag: 'Hub · Network',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
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
  { label: 'Caution', dot: 'bg-amber-400' },
  { label: 'New', dot: 'bg-white/40' },
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
    <section id="solutions" className="relative py-32 bg-[#050505] overflow-hidden scroll-mt-24">
      {/* Ambient blobs + noise — continuous with the hero */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* (A) Header */}
        <div className="max-w-3xl text-center md:text-left mb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-5">
            Solutions · The Trust Network
          </h2>
          <h3 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-6">
            A stranger to you. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500">
              Not to the network.
            </span>
          </h3>
          <p className="text-white/50 font-medium tracking-tight max-w-xl mx-auto md:mx-0 leading-relaxed">
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
            <div className="relative pl-2">
              <div className="absolute left-[27px] top-6 bottom-6 w-px bg-primary/20" />
              <div className="space-y-8">
                {STEPS.map((s, i) => (
                  <div key={i} className="relative flex gap-5">
                    <div className="relative z-10 shrink-0 w-12 h-12 rounded-2xl glass flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                      <s.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black text-primary/70 tracking-[0.3em]">
                          0{i + 1}
                        </span>
                        <h4 className="text-base font-black text-white uppercase italic tracking-tighter">
                          {s.title}
                        </h4>
                      </div>
                      <p className="text-white/50 text-sm font-medium leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk-band legend */}
            <div className="glass rounded-2xl px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">
                Risk bands
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', l.dot)} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* (C) Pillar spine */}
        <div className="mt-20">
          <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-8 text-center md:text-left">
            One spine · six modules
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {PILLARS.map((p, i) => (
              <Card
                key={i}
                padding="lg"
                className={cn(
                  'group bg-white/[0.02] border-white/5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4',
                  p.featured
                    ? 'ring-1 ring-primary/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] md:col-span-2 lg:col-span-1'
                    : 'hover:ring-1 ring-white/10',
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/5 transition-transform group-hover:scale-110 duration-500',
                    p.bg,
                  )}
                >
                  <p.icon className={cn('w-7 h-7', p.color)} />
                </div>
                <h5
                  className={cn(
                    'text-lg font-black text-white uppercase italic tracking-tighter mb-2',
                    p.featured && 'text-glow',
                  )}
                >
                  {p.name}
                </h5>
                <p className="text-white/30 text-[11px] font-bold uppercase tracking-tight mb-3">
                  {p.pain}
                </p>
                <p className="text-white/60 text-sm font-medium leading-relaxed mb-4">{p.valueProp}</p>
                <span className="inline-block text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 rounded-full px-2.5 py-1">
                  {p.tag}
                </span>
              </Card>
            ))}
          </div>
        </div>

        {/* (D) Enterprise strip — resolves the #enterprise anchor */}
        <div id="enterprise" className="mt-20 scroll-mt-24">
          <div className="max-w-3xl mb-6 text-center md:text-left">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-3">
              Enterprise-grade by default
            </h4>
            <p className="text-white/60 font-medium tracking-tight leading-relaxed max-w-xl mx-auto md:mx-0">
              Security posture, not a promise — the architecture that lets agencies share trust without
              sharing customer lists.
            </p>
          </div>
          <div className="glass rounded-2xl px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-4">
            {ENTERPRISE.map((e) => (
              <div key={e.label} className="flex items-center gap-2.5">
                <e.icon className="w-4 h-4 text-primary/70 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
                  {e.label}
                </span>
              </div>
            ))}
            <Link
              href="#contact"
              className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-white/70 hover:text-primary transition-colors"
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
