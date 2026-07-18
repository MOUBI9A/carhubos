"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Mail, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('success', t('loginSuccessTitle'), t('loginSuccessBody'));
    } catch (error: any) {
      showToast(
        'danger',
        t('loginFailTitle'),
        error.response?.data?.message || t('loginFailBody'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Photographic brand panel (lg+) */}
      <div className="relative hidden lg:block">
        <AgencyImage
          slot="hero"
          src="/img/hero-handover.webp"
          fill
          rounded="rounded-none"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <p className="font-display text-3xl md:text-4xl text-foreground max-w-sm leading-[1.15]">
            {t('loginTagline')}
          </p>
          <p className="text-text-muted mt-4 max-w-sm leading-relaxed">
            {t('loginSub')}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute top-6 end-6">
          <LocaleSwitcher variant="pills" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-foreground">
            {tc('brand')}
          </h1>
          <p className="eyebrow mt-3">
            {t('loginTitle')}
          </p>
        </div>

        <form onSubmit={handleRealLogin} className="bg-surface border border-hairline rounded-2xl shadow-soft p-8 space-y-6">
           <div className="space-y-4">
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">{t('email')}</p>
                 <div className="relative group">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-raised border border-hairline rounded-xl ps-11 pe-4 py-4 text-sm font-medium text-foreground outline-none focus:border-primary transition-all"
                      placeholder={t('emailPlaceholder')}
                    />
                 </div>
              </div>

              <div className="space-y-1.5">
                 <p className="eyebrow px-1">{t('password')}</p>
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
              {isLoading ? t('signingIn') : t('signIn')}
           </Button>
        </form>

        <p className="text-center mt-8 text-text-faint text-xs flex items-center justify-center gap-2">
          <Zap className="w-3 h-3" />
          {t('secureSession')}
        </p>
        </motion.div>
      </div>
    </div>
  );
}
