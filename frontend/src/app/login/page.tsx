"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { Mail, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Authentication Successful', 'Secure connection established.');
    } catch (error: any) {
      showToast('danger', 'Authentication Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const autofill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('admin123'); // From seed.js
    showToast('info', 'Demo Credentials Loaded', 'Click Secure Login to proceed.');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Photographic brand panel (lg+) */}
      <div className="relative hidden lg:block">
        <AgencyImage
          slot="hero"
          fill
          rounded="rounded-none"
          alt="An agency owner handing over the keys at golden hour"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <p className="font-display text-3xl md:text-4xl text-foreground max-w-sm leading-[1.15]">
            The trust layer for mobility.
          </p>
          <p className="text-text-muted mt-4 max-w-sm leading-relaxed">
            Trust, fleet and finance on one spine — know a renter&apos;s history before you
            hand over the keys.
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
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-foreground">
            Fider
          </h1>
          <p className="eyebrow mt-3">
            Sign in to your agency
          </p>
        </div>

        <form onSubmit={handleRealLogin} className="bg-surface border border-hairline rounded-2xl shadow-soft p-8 space-y-6">
           <div className="space-y-4">
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">Email</p>
                 <div className="relative group">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-raised border border-hairline rounded-xl ps-11 pe-4 py-4 text-sm font-medium text-foreground outline-none focus:border-primary transition-all"
                      placeholder="name@agency.com"
                    />
                 </div>
              </div>

              <div className="space-y-1.5">
                 <p className="eyebrow px-1">Password</p>
                 <div className="relative group">
                    <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-raised border border-hairline rounded-xl ps-11 pe-4 py-4 text-sm font-medium text-foreground outline-none focus:border-primary transition-all"
                      placeholder="••••••••"
                    />
                 </div>
              </div>
           </div>

           <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
           </Button>
        </form>

        <p className="text-center mt-8 text-text-faint text-xs flex items-center justify-center gap-2">
          <Zap className="w-3 h-3" />
          Secure session · HttpOnly cookie
        </p>
        </motion.div>
      </div>
    </div>
  );
}
