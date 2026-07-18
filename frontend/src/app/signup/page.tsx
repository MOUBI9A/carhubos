"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { AgencyImage } from '@/components/ui/AgencyImage';
import api from '@/lib/api';
import { Building2, User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const INPUT_CLASS =
  'w-full bg-surface-raised border border-hairline rounded-xl ps-11 pe-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

export default function SignupPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [agencyName, setAgencyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      showToast('danger', 'Password too short', 'Use at least 8 characters.');
      return;
    }
    setIsLoading(true);
    try {
      // Public register: agencyName creates a fresh agency with you as its OWNER.
      await api.post('/auth/register', { agencyName, name, email, password });
      // Establish the session (sets the HttpOnly cookie) and route to the owner dashboard.
      await login(email, password);
      showToast('success', 'Agency created', `Welcome to Fider, ${name.split(' ')[0] || 'there'}.`);
    } catch (error: any) {
      const status = error?.response?.status;
      const raw =
        status === 409
          ? 'That email is already registered — try signing in.'
          : status === 429
            ? 'Too many attempts. Please wait a minute and retry.'
            : error?.response?.data?.message || 'Could not create your agency. Please try again.';
      showToast('danger', 'Sign-up failed', Array.isArray(raw) ? raw[0] : raw);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Photographic brand panel (lg+) */}
      <div className="relative hidden lg:block">
        <AgencyImage
          slot="agency"
          fill
          rounded="rounded-none"
          alt="A boutique car-rental agency storefront at golden hour"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <p className="font-display text-3xl md:text-4xl text-foreground max-w-sm leading-[1.15]">
            Put your fleet on the network.
          </p>
          <p className="text-text-muted mt-4 max-w-sm leading-relaxed">
            Set up your agency in minutes — and start renting to people you can already
            trust, backed by every other agency&apos;s experience.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-hairline mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="eyebrow">Free during early access</span>
          </div>
          <h1 className="display text-4xl text-foreground mb-3">Create your agency</h1>
          <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">
            Set up your workspace on Fider and put your fleet on the Trust Network.
          </p>
        </div>

        <form onSubmit={handleSignup} className="bg-surface border border-hairline rounded-2xl shadow-soft p-8 space-y-5">
          <Field label="Agency name" icon={Building2}>
            <input required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={INPUT_CLASS} placeholder="Atlas Cars" autoComplete="organization" />
          </Field>
          <Field label="Your name" icon={User}>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder="Full name" autoComplete="name" />
          </Field>
          <Field label="Work email" icon={Mail}>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} placeholder="you@agency.com" autoComplete="email" />
          </Field>
          <Field label="Password" icon={Lock} hint="At least 8 characters">
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_CLASS} placeholder="••••••••" autoComplete="new-password" />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full group" disabled={isLoading}>
            {isLoading ? 'Creating your agency…' : 'Create agency'}
            {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </Button>

          <p className="flex items-center justify-center gap-2 text-[11px] text-text-faint pt-1 text-center">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            You become the owner — full control of your agency
          </p>
        </form>

        <p className="text-center mt-8 text-text-faint text-xs">
          Already on Fider?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <p className="eyebrow">{label}</p>
        {hint && <p className="text-[10px] font-medium text-text-faint">{hint}</p>}
      </div>
      <div className="relative group">
        <Icon className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary transition-colors z-10" />
        {children}
      </div>
    </div>
  );
}
