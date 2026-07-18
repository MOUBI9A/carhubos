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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-white">
      <PublicNav />

      <main className="pt-20">
        {children}
      </main>

      <footer className="border-t border-white/5 py-20 bg-black">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
               <Link href="/landing" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">{tc('brand')}</span>
              </Link>
              <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm tracking-wide">
                {tl('footerBlurb')}
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-6">{t('product')}</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-sm font-medium text-white/40 hover:text-primary transition-colors">{t('features')}</Link></li>
                <li><Link href="#solutions" className="text-sm font-medium text-white/40 hover:text-primary transition-colors">{t('trustNetwork')}</Link></li>
                <li><Link href="#enterprise" className="text-sm font-medium text-white/40 hover:text-primary transition-colors">{t('enterprise')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-6">{t('getStartedSection')}</h4>
              <ul className="space-y-4">
                <li><Link href="#contact" className="text-sm font-medium text-white/40 hover:text-primary transition-colors">{t('requestAccess')}</Link></li>
                <li><Link href="/login" className="text-sm font-medium text-white/40 hover:text-primary transition-colors">{t('login')}</Link></li>
                <li><Link href="#contact" className="text-sm font-medium text-white/40 hover:text-primary transition-colors">{t('contact')}</Link></li>
              </ul>
              <div className="mt-6">
                <LocaleSwitcher variant="pills" />
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/20">
              {tc('allRightsReserved', { year })}
            </p>
            <div className="flex gap-8">
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/20">{tc('madeInMorocco')}</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/20">{tc('casablanca')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
