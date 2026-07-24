"use client";

import { useTranslations } from 'next-intl';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MapPin } from 'lucide-react';

/**
 * Live GPS telemetry (position, speed, fuel per vehicle) has no backend at
 * all — `Car` has no location/GPS columns, and there's no tracker-hardware
 * integration anywhere in this app. This used to render three hardcoded
 * "ghost cars" moving on a fake grid with invented speed/fuel/location and
 * an AI "prediction" about a car that doesn't exist. Same honesty bar as
 * the Hub page's "My fleet listings" tab and the Reports page: say so
 * plainly rather than fabricate live telemetry that was never real.
 */
export default function FleetMap() {
  const t = useTranslations('ownerPages');

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('fleetMap')}</h1>
        <p className="mt-1.5 eyebrow">Live GPS telemetry per vehicle</p>
      </header>

      <Card className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={MapPin}
          title="Not available yet"
          description="Live position, speed and fuel telemetry needs GPS-tracker hardware in each vehicle and an integration to receive it — neither exists yet. Nothing on this page is faked in the meantime."
        />
      </Card>
    </div>
  );
}
