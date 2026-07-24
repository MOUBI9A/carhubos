'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ServerCog } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Real infrastructure telemetry (multi-region health, DB throughput, cache
 * hit rates, compute/storage utilization) has no backend at all — this app
 * isn't even deployed yet (Phase 9 is founder-gated), there's no APM/metrics
 * pipeline, and the stack has no multi-region or Redis/S3 footprint to
 * report on. This used to render entirely invented numbers (fake regions,
 * a fake "$4.2M Global GMV" separate from the real figure the Global Pulse
 * page already shows) and non-functional "Export Logs"/"Live Sync"/"Run
 * Security Audit" buttons. Same honesty bar as the Reports and Fleet-map
 * pages: say so plainly instead of fabricating it.
 */
export default function PulsePage() {
  const t = useTranslations('adminPages');
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <Badge variant="outline" className="mb-2">Infrastructure</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t('globalPulse')} — Infra
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Real-time multi-tenant infrastructure oversight
        </p>
      </div>

      <Card className="flex items-center justify-center py-16">
        <EmptyState
          icon={ServerCog}
          title="Not available yet"
          description="This app isn't deployed to real infrastructure yet, and there's no metrics/APM integration to report region health, DB throughput, or resource utilization from. For real platform business metrics (GMV, active tenants, churn), see Global Pulse on the admin home page."
        />
      </Card>
    </div>
  );
}
