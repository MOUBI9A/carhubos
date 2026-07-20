"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { SealDivider } from '@/components/ui/Seal';
import { Users, Fuel, Settings, MapPin, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useFormat } from '@/lib/useFormat';

type Agency = {
  id: string;
  name: string;
  businessPhone?: string | null;
  contactEmail?: string | null;
  city?: string | null;
};

type PublicCar = {
  id: string;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  fuelType?: string | null;
  gearbox?: string | null;
  agency?: { name?: string | null; city?: string | null } | null;
};

export default function AgencyPublicPage() {
  const t = useTranslations('agencyPublic');
  const { money } = useFormat();
  const params = useParams<{ subdomain: string }>();
  const subdomain = Array.isArray(params.subdomain) ? params.subdomain[0] : params.subdomain;
  const [agency, setAgency] = useState<Agency | null>(null);
  const [fleet, setFleet] = useState<PublicCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const agencyResponse = await api.get<Agency>(`/public/agency-by-subdomain/${encodeURIComponent(subdomain)}`);
        const fleetResponse = await api.get<PublicCar[]>('/public/fleet', { params: { agencyId: agencyResponse.data.id } });
        if (!cancelled) {
          setAgency(agencyResponse.data);
          setFleet(fleetResponse.data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (subdomain) load();
    return () => { cancelled = true; };
  }, [subdomain, t]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-6 py-16"><div className="h-72 rounded-3xl bg-surface-raised animate-pulse" /></div>;
  }

  if (error || !agency) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-center text-danger">{error || t('loadFailed')}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-14 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AgencyImage slot="agency" alt={`${agency.name} storefront`} ratio="21 / 9" rounded="rounded-3xl" className="shadow-soft mb-8" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="trust">{t('verified')}</Badge>
            </div>
            <h1 className="display text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-4">{agency.name}</h1>
            <p className="flex items-center gap-2 text-text-muted text-sm"><MapPin className="w-4 h-4 text-text-faint" strokeWidth={1.5} />{agency.city || 'Morocco'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end hidden md:block"><p className="eyebrow mb-1">{t('poweredBy')}</p><p className="font-display text-lg text-foreground">Fider</p></div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised border border-hairline"><ShieldCheck className="w-6 h-6 text-text-muted" strokeWidth={1.5} /></div>
          </div>
        </div>
      </div>

      {fleet.length === 0 ? (
        <div className="py-20 text-center text-text-muted">{t('noFleet')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {fleet.map((car) => (
            <Card key={car.id} padding="none" className="group h-full overflow-hidden">
              <div className="p-6 md:p-8">
                <CarPhoto alt={`${car.brand} ${car.model}`} plate={car.fuelType || 'FIDER'} price={money(car.pricePerDay)} rounded="rounded-2xl" className="mb-6 transition-transform duration-700 group-hover:scale-[1.01]" />
                <div className="flex justify-between items-start gap-4 mb-6">
                  <div><p className="eyebrow mb-2">{car.fuelType || '—'}</p><h3 className="text-2xl font-semibold text-foreground leading-tight">{car.brand} {car.model}</h3></div>
                  <Badge variant="secondary" className="shrink-0">{car.year}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline"><Users className="w-4 h-4 text-text-faint" strokeWidth={1.5} /><span className="text-xs text-text-muted">5 {t('seats')}</span></div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline"><Fuel className="w-4 h-4 text-text-faint" strokeWidth={1.5} /><span className="text-xs text-text-muted">{car.fuelType || '—'}</span></div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-raised border border-hairline"><Settings className="w-4 h-4 text-text-faint" strokeWidth={1.5} /><span className="text-xs text-text-muted">{car.gearbox || '—'}</span></div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-hairline">
                  <div><p className="eyebrow mb-1">{t('pricePerDay')}</p><p className="font-mono tabular text-2xl font-semibold text-foreground">{money(car.pricePerDay)}</p></div>
                  <Button variant="primary" size="lg" disabled title={t('bookingUnavailable')}>{t('startBooking')}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <section><Card padding="lg" className="text-center relative overflow-hidden"><div className="relative z-10 max-w-2xl mx-auto"><p className="eyebrow mb-4">{t('securityProtocol')}</p><h2 className="display text-3xl md:text-4xl text-foreground mb-6">{t('trustVault')}</h2><SealDivider className="max-w-xs mx-auto mb-8" /><div className="flex flex-wrap justify-center gap-8 md:gap-12">{[{ label: t('instantId'), icon: Zap }, { label: t('secureEscrow'), icon: ShieldCheck }, { label: t('digitalReport'), icon: CheckCircle2 }].map((item) => <div key={item.label} className="flex items-center gap-2.5"><item.icon className="w-5 h-5 text-text-muted" strokeWidth={1.5} /><span className="text-sm text-text-muted">{item.label}</span></div>)}</div></div></Card></section>
    </div>
  );
}
