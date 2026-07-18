"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertTriangle, Calendar, Car, Filter, Info, MapPin, RefreshCw } from 'lucide-react';
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
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">{t('title')}</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass-card">
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <MapPin className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{t('pickup')}</p>
              <p className="text-xs font-bold text-white">{t('casablanca')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <Calendar className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <label htmlFor="pickup-date" className="text-[8px] font-black text-white/40 uppercase tracking-widest">{t('dates')}</label>
              <input id="pickup-date" type="date" className="block w-full bg-transparent text-xs font-bold text-white outline-none" min={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <Filter className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <label htmlFor="vehicle-type" className="text-[8px] font-black text-white/40 uppercase tracking-widest">{t('vehicleType')}</label>
              <select id="vehicle-type" value={type} onChange={(event) => setType(event.target.value)} className="block w-full bg-transparent text-xs font-bold text-white outline-none">
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
          <AlertTriangle className="w-8 h-8 text-danger" />
          <p className="text-sm text-white/60">{error}</p>
          <Button variant="outline" onClick={loadCars}><RefreshCw className="w-4 h-4 me-2" />{t('search')}</Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : visibleCars.length === 0 ? (
        <EmptyState icon={Car} title={t('noCars')} description={t('loadFailed')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleCars.map((car) => (
            <Card key={car.id} padding="none" className="overflow-hidden group hover:translate-y-[-4px]">
              <div className="h-40 bg-white/5 flex items-center justify-center text-4xl group-hover:bg-primary/5 transition-colors"><Car className="w-12 h-12 text-white/20" /></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-1 gap-3">
                  <h3 className="text-lg font-black text-white">{car.brand} {car.model}</h3>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{car.fuelType || t('model')}</span>
                </div>
                <p className="text-[10px] font-bold text-white/40 uppercase mb-2">{car.year} · {car.agency?.name || t('agency')}</p>
                <p className="text-[10px] text-white/40 mb-5">{car.agency?.city || t('casablanca')}</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <p className="text-xl font-black text-white">{money(car.pricePerDay)} <span className="text-[10px] text-white/40">{t('perDay')}</span></p>
                  <Button size="sm" disabled title={t('bookingUnavailable')}>{t('bookNow')}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="glass-card p-6 flex items-start gap-4 border-primary/20 bg-primary/5">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{t('dynamicPricing')}</h4>
          <p className="text-xs text-white/60 mt-1 leading-relaxed">{t('dynamicPricingBody')}</p>
          <p className="text-xs text-primary/80 mt-2">{t('bookingUnavailable')}</p>
        </div>
      </div>
    </div>
  );
}
