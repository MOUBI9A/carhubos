"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('landing');

  const features = [
    {
      title: t('featureTrustTitle'),
      description: t('featureTrustBody'),
      icon: Fingerprint,
      tag: t('featureTrustTag'),
    },
    {
      title: t('featureFinanceTitle'),
      description: t('featureFinanceBody'),
      icon: Receipt,
      tag: t('featureFinanceTag'),
    },
    {
      title: t('featureComplianceTitle'),
      description: t('featureComplianceBody'),
      icon: FileWarning,
      tag: t('featureComplianceTag'),
    },
    {
      title: t('featureHubTitle'),
      description: t('featureHubBody'),
      icon: Building2,
      tag: t('featureHubTag'),
    },
  ];

  const stats = [
    { value: t('statMad'), label: t('statMadLabel') },
    { value: t('statRoi'), label: t('statRoiLabel') },
    { value: t('statInvoice'), label: t('statInvoiceLabel') },
    { value: t('statHmac'), label: t('statHmacLabel') },
  ];

  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <p className="eyebrow mb-5">{t('eyebrow')}</p>
            <h1 className="display text-5xl md:text-6xl lg:text-7xl text-foreground mb-6">
              {t('heroTitle')}{' '}
              <span className="metal-text font-display italic">{t('heroAccent')}</span>
            </h1>
            <p className="text-lg md:text-xl text-text-muted leading-relaxed max-w-xl mb-9">
              {t('heroBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button variant="premium" size="lg">{t('ctaStart')}</Button>
              </Link>
              <Link href="#solutions">
                <Button variant="outline" size="lg">{t('ctaHow')}</Button>
              </Link>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            <AgencyImage
              slot="hero"
              src="/img/hero-handover.webp"
              alt=""
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
            <p className="eyebrow mb-4">{t('featuresEyebrow')}</p>
            <h2 className="display text-4xl md:text-5xl lg:text-6xl text-foreground mb-5">
              {t('featuresTitle')}
            </h2>
            <p className="text-lg text-text-muted leading-relaxed">
              {t('featuresBody')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
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

      <SolutionsSection />

      <section className="relative py-24 border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="font-mono tabular text-2xl md:text-3xl text-foreground mb-3 leading-tight">{stat.value}</p>
                <p className="eyebrow">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="relative py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <SealDivider className="mb-14 md:mb-16" />
          <Card padding="lg" className="text-center p-10 md:p-16">
            <h2 className="display text-4xl md:text-5xl lg:text-6xl text-foreground mb-6">
              {t('ctaTitle')}
            </h2>
            <p className="text-lg text-text-muted leading-relaxed max-w-lg mx-auto mb-10">
              {t('ctaBody')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#contact" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full">{t('ctaRequest')}</Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="ghost" size="lg" className="w-full">{t('ctaSignIn')}</Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <ContactSection email="hamzamoadin37@gmail.com" whatsapp="+212616880653" />
    </div>
  );
}
