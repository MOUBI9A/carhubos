"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { Building2, User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const INPUT_CLASS =
  'w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary focus:bg-primary/5 transition-all placeholder:text-white/25';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Free during early access</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic mb-2">Create your agency</h1>
          <p className="text-white/40 font-medium tracking-tight text-sm max-w-xs mx-auto leading-relaxed">
            Set up your workspace on Fider and put your fleet on the Trust Network.
          </p>
        </div>

        <form onSubmit={handleSignup} className="glass p-8 rounded-[2rem] shadow-2xl space-y-5 border-white/5">
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

          <Button type="submit" className="w-full py-5 text-xs font-black tracking-[0.2em] group" disabled={isLoading}>
            {isLoading ? 'Creating your agency…' : 'Create agency'}
            {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </Button>

          <p className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 pt-1 text-center">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            You become the OWNER — full control of your agency
          </p>
        </form>

        <p className="text-center mt-8 text-white/40 text-xs font-medium">
          Already on Fider?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>
        </p>
      </motion.div>
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
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</p>
        {hint && <p className="text-[9px] font-medium text-white/25">{hint}</p>}
      </div>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors z-10" />
        {children}
      </div>
    </div>
  );
}
