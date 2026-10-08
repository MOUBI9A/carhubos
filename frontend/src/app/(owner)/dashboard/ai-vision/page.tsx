'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CameraOff, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function AiVision() {
  const t = useTranslations('diagnostics');
  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t('visionTitle')}</h1>
        <p className="mt-2 text-sm text-text-muted">{t('visionStatus')}</p>
      </header>
      <Card className="space-y-5">
        <CameraOff aria-hidden="true" className="h-10 w-10 text-metal" />
        <h2 className="text-lg font-semibold">{t('unavailable')}</h2>
        <p className="text-sm text-text-muted leading-relaxed">{t('visionDescription')}</p>
        <Link href="/dashboard/accidents" className="inline-flex items-center gap-2 rounded-xl border border-hairline px-4 py-3 text-sm font-medium hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary">
          <ClipboardCheck aria-hidden="true" className="h-4 w-4" />{t('visionAction')}
        </Link>
      </Card>
    </div>
  );
}
