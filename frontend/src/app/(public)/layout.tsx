'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Car } from 'lucide-react';
import PublicNav from './_components/PublicNav';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const tl = useTranslations('landing');
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <PublicNav />

      <main className="pt-20">
        {children}
      </main>

      <footer className="border-t border-hairline py-20 bg-surface">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
               <Link href="/landing" className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised border border-hairline">
                  <Car className="h-4 w-4 text-metal" strokeWidth={1.75} />
                </div>
                <span className="font-display text-lg text-foreground">{tc('brand')}</span>
              </Link>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm">
                {tl('footerBlurb')}
              </p>
            </div>
            <div>
              <h4 className="eyebrow mb-6">{t('product')}</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">{t('features')}</Link></li>
                <li><Link href="#solutions" className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">{t('trustNetwork')}</Link></li>
                <li><Link href="#enterprise" className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">{t('enterprise')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="eyebrow mb-6">{t('getStartedSection')}</h4>
              <ul className="space-y-4">
                <li><Link href="#contact" className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">{t('requestAccess')}</Link></li>
                <li><Link href="/login" className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">{t('login')}</Link></li>
                <li><Link href="#contact" className="text-sm font-medium text-text-muted hover:text-foreground transition-colors">{t('contact')}</Link></li>
              </ul>
              <div className="mt-6">
                <LocaleSwitcher variant="pills" />
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-hairline gap-4">
            <p className="eyebrow">
              {tc('allRightsReserved', { year })}
            </p>
            <div className="flex gap-8">
              <span className="eyebrow">{tc('madeInMorocco')}</span>
              <span className="eyebrow">{tc('casablanca')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
