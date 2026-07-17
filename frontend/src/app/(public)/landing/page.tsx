"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Shield, 
  Brain, 
  Lock, 
  Building2, 
  ArrowRight, 
  Zap, 
  Activity, 
  Globe,
  CheckCircle2,
  ChevronRight,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">v2.0 Infinity OS is Live</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            Intelligent <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500">Fleet Control</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl font-medium text-white/40 leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 uppercase tracking-tight">
            The world's first neural operating system for car rental ecosystems. 
            Automate trust, scale finance, and secure your assets with Infinity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Link href="/signup">
              <Button className="h-16 px-10 text-sm font-black uppercase tracking-[0.2em] group">
                Deploy Infinity
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" className="h-16 px-10 text-sm font-black uppercase tracking-[0.2em] bg-white/5 border-white/10 hover:bg-white/10">
                Explore Core
              </Button>
            </Link>
          </div>

          {/* Floating UI Mockup */}
          <div className="mt-24 relative max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-[2.5rem] blur-2xl opacity-20" />
             <div className="relative glass rounded-[2.5rem] border border-white/10 overflow-hidden aspect-[16/9] shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
                <div className="p-8 h-full flex flex-col">
                   <div className="flex items-center justify-between mb-12">
                      <div className="flex gap-2">
                         <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                         <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                         <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                      </div>
                      <div className="h-6 w-48 bg-white/5 rounded-full border border-white/10" />
                   </div>
                   <div className="grid grid-cols-3 gap-6 flex-1">
                      <div className="col-span-2 space-y-6">
                         <div className="h-32 w-full bg-primary/10 rounded-3xl border border-primary/20 animate-pulse" />
                         <div className="grid grid-cols-2 gap-6">
                            <div className="h-48 w-full bg-white/5 rounded-3xl border border-white/10" />
                            <div className="h-48 w-full bg-white/5 rounded-3xl border border-white/10" />
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="h-full w-full bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center">
                            <Activity className="w-12 h-12 text-white/10 animate-pulse" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-black relative">
        <div className="container mx-auto px-6">
          <div className="mb-24 text-center md:text-left">
             <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-4">Core Architecture</h2>
             <h3 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter max-w-2xl">The pillars of a next-gen rental ecosystem.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'The Guardian',
                description: 'Autonomous risk detection and asset lockout protocols. Real-time compliance monitoring.',
                icon: Shield,
                color: 'text-danger',
                bg: 'bg-danger/10'
              },
              {
                title: 'Financial Brain',
                description: 'Neural ledger for automated billing, debt recovery, and ROI optimization for every asset.',
                icon: Brain,
                color: 'text-primary',
                bg: 'bg-primary/10'
              },
              {
                title: 'Trust Vault',
                description: 'Decentralized identity verification and high-fidelity customer credit scoring.',
                icon: Lock,
                color: 'text-success',
                bg: 'bg-success/10'
              },
              {
                title: 'B2B Hub',
                description: 'Multi-tenant infrastructure for agency networks to share fleets and maximize utilization.',
                icon: Building2,
                color: 'text-blue-500',
                bg: 'bg-blue-500/10'
              }
            ].map((feature, i) => (
              <Card key={i} className="group hover:ring-1 ring-white/10 transition-all p-8 bg-white/[0.02] border-white/5">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/5 transition-transform group-hover:scale-110 duration-500", feature.bg)}>
                  <feature.icon className={cn("w-8 h-8", feature.color)} />
                </div>
                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">{feature.title}</h4>
                <p className="text-white/40 text-sm font-medium leading-relaxed uppercase tracking-wide">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-24 border-y border-white/5 bg-[#050505]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Transactions', value: '42M+' },
              { label: 'Active Assets', value: '120K' },
              { label: 'Debt Recovered', value: '85%' },
              { label: 'Uptime', value: '99.99%' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-black text-white tracking-tighter italic mb-2">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-6 relative z-10 text-center">
           <div className="max-w-3xl mx-auto glass p-12 md:p-20 rounded-[3rem] border border-primary/20 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
              
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-8 leading-[0.9]">
                Ready to upgrade your <br />
                <span className="text-primary">Ecosystem?</span>
              </h2>
              <p className="text-white/40 font-medium uppercase tracking-tight mb-12 max-w-md mx-auto">
                Join 500+ agencies worldwide who have moved their operations to the Infinity protocol.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button className="h-16 px-12 text-sm font-black uppercase tracking-[0.2em] w-full sm:w-auto">Get Started Now</Button>
                <Button variant="ghost" className="h-16 px-12 text-sm font-black uppercase tracking-[0.2em] w-full sm:w-auto text-white/60">Contact Sales</Button>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
