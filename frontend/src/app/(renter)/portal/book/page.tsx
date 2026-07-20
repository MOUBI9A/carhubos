"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AlertTriangle, Calendar, Filter, Info, MapPin, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useFormat } from '@/lib/useFormat';

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

export default function BookCar() {
  const t = useTranslations('renterBook');
  const { money } = useFormat();
  const [cars, setCars] = useState<PublicCar[]>([]);
  const [type, setType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCars = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<PublicCar[]>('/public/fleet');
      setCars(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCars();
  }, []);

  const visibleCars = useMemo(() => {
    if (type === 'ALL') return cars;
    return cars.filter((car) => car.fuelType?.toUpperCase() === type);
  }, [cars, type]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-text-muted mt-1.5">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass-card">
          <div className="flex items-center gap-3 px-4 md:border-e md:border-hairline">
            <MapPin className="w-4 h-4 text-text-faint shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="eyebrow">{t('pickup')}</p>
              <p className="text-sm font-medium text-foreground">{t('casablanca')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 md:border-e md:border-hairline">
            <Calendar className="w-4 h-4 text-text-faint shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <label htmlFor="pickup-date" className="eyebrow">{t('dates')}</label>
              <input id="pickup-date" type="date" className="block w-full bg-transparent text-sm font-medium text-foreground outline-none" min={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 md:border-e md:border-hairline">
            <Filter className="w-4 h-4 text-text-faint shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <label htmlFor="vehicle-type" className="eyebrow">{t('vehicleType')}</label>
              <select id="vehicle-type" value={type} onChange={(event) => setType(event.target.value)} className="block w-full bg-transparent text-sm font-medium text-foreground outline-none">
                <option value="ALL">{t('allTypes')}</option>
                <option value="PETROL">Petrol</option>
                <option value="DIESEL">Diesel</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ELECTRIC">Electric</option>
              </select>
            </div>
          </div>
          <Button className="w-full" onClick={loadCars} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 me-2" />{t('search')}
          </Button>
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[35vh] gap-5">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-danger" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-text-muted">{error}</p>
          <Button variant="outline" onClick={loadCars}><RefreshCw className="w-4 h-4 me-2" />{t('search')}</Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : visibleCars.length === 0 ? (
        <Card padding="none" className="overflow-hidden">
          <AgencyImage src="/img/car-street.webp" alt="" slot="empty" ratio="21 / 8" rounded="rounded-none" />
          <div className="p-8 text-center">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{t('noCars')}</h3>
            <p className="text-sm text-text-muted mt-1.5 max-w-md mx-auto leading-relaxed">{t('loadFailed')}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleCars.map((car) => (
            <Card key={car.id} padding="none" className="overflow-hidden group hover:translate-y-[-4px]">
              <CarPhoto
                alt={`${car.brand} ${car.model}`}
                plate={car.fuelType || t('model')}
                price={money(car.pricePerDay)}
                rounded="rounded-none"
                className="transition-transform duration-700 group-hover:scale-[1.01]"
              />
              <div className="p-6">
                <h3 className="text-base font-semibold tracking-tight text-foreground leading-snug mb-1.5">{car.brand} {car.model}</h3>
                <p className="eyebrow mb-2">{car.year} · {car.agency?.name || t('agency')}</p>
                <p className="text-xs text-text-faint mb-5">{car.agency?.city || t('casablanca')}</p>
                <div className="flex items-center justify-between pt-4 border-t border-hairline">
                  <p className="font-mono tabular text-lg font-semibold text-foreground">{money(car.pricePerDay)} <span className="font-sans text-[11px] font-normal text-text-faint">{t('perDay')}</span></p>
                  <Button size="sm" disabled title={t('bookingUnavailable')}>{t('bookNow')}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="glass-card p-6 flex items-start gap-4">
        <Info className="w-5 h-5 text-info shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t('dynamicPricing')}</h4>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{t('dynamicPricingBody')}</p>
          <p className="text-xs text-text-faint mt-2">{t('bookingUnavailable')}</p>
        </div>
      </div>
    </div>
  );
}
