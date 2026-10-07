"use client";

import { useTranslations } from 'next-intl';
import { isAxiosError } from 'axios';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { CarPhoto, AgencyImage } from '@/components/ui/AgencyImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  SearchX,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useFormat } from '@/lib/useFormat';
import { useFleet } from './useFleet';
import {
  CAR_STATUSES,
  STATUS_STYLES,
  HEALTH_STYLES,
  complianceScore,
  complianceHealth,
  type CarStatus,
} from './types';

const INITIAL_FORM = {
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  licensePlate: '',
  pricePerDay: '',
  fuelType: 'DIESEL',
  gearbox: 'MANUAL',
};

const FILTERS = ['ALL', ...CAR_STATUSES] as const;

export default function FleetGuardian() {
  const t = useTranslations('ownerPages');
  const copy = useTranslations('fleetList');
  const fmt = useFormat();
  const { showToast } = useToast();
  const { data: cars, isLoading, error, refetch } = useFleet();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CarStatus | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const setField = (key: keyof typeof INITIAL_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const filtered = useMemo(() => {
    if (!cars) return [];
    const q = query.trim().toLowerCase();
    return cars.filter((car) => {
      if (statusFilter !== 'ALL' && car.status !== statusFilter) return false;
      if (!q) return true;
      return `${car.brand} ${car.model} ${car.licensePlate}`
        .toLowerCase()
        .includes(q);
    });
  }, [cars, query, statusFilter]);

  const stats = useMemo(() => {
    const counts = { total: 0, AVAILABLE: 0, RENTED: 0, MAINTENANCE: 0, OUT_OF_SERVICE: 0 };
    for (const car of cars ?? []) {
      counts.total++;
      counts[car.status] = (counts[car.status] ?? 0) + 1;
    }
    return counts;
  }, [cars]);

  const closeAddModal = () => {
    if (isSubmitting) return;
    setIsAddModalOpen(false);
    setForm(INITIAL_FORM);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const year = Number(form.year);
    const pricePerDay = Number(form.pricePerDay);

    if (!form.brand.trim() || !form.model.trim() || !form.licensePlate.trim()) {
      showToast('danger', copy('validationTitle'), copy('missingFields'));
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      showToast('danger', copy('validationTitle'), copy('invalidYear'));
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(form.pricePerDay) || !Number.isFinite(pricePerDay) || pricePerDay <= 0 || pricePerDay > 9999999999.99) {
      showToast('danger', copy('validationTitle'), copy('invalidRate'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/cars', {
        brand: form.brand.trim(),
        model: form.model.trim(),
        year,
        licensePlate: form.licensePlate.trim().toUpperCase(),
        pricePerDay,
        fuelType: form.fuelType,
        gearbox: form.gearbox,
      });
      closeAddModal();
      showToast('success', copy('registeredTitle'), copy('registered', { vehicle: `${form.brand.trim()} ${form.model.trim()}` }));
      refetch();
    } catch (err: unknown) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const code = isAxiosError(err) ? err.response?.data?.code : undefined;
      const message = code === 'PLAN_LIMIT_REACHED' ? 'planLimit' : status === 409 ? 'duplicatePlate' : status === 403 ? 'forbidden' : status === 429 ? 'rateLimited' : 'registerFailed';
      showToast('danger', copy('registerFailedTitle'), copy(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Error state ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">{copy('offline')}</p>
          <p role="alert" className="text-sm text-text-muted mt-2 max-w-sm">{copy('loadFailed')}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 me-2" /> {copy('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('fleet')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">
            {copy('subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          {copy('addVehicle')}
        </Button>
      </header>

      {/* ═══════ Stats strip ═══════ */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-surface border border-hairline p-4">
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{fmt.number(stats.total)}</p>
            <p className="eyebrow mt-1">{copy('loadedVehicles')}</p>
          </div>
          {CAR_STATUSES.map((s) => (
            <button
              key={s}
              aria-pressed={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={cn(
                'rounded-2xl bg-surface border border-hairline p-4 text-start transition-all hover:bg-surface-raised',
                statusFilter === s && 'ring-1 ring-primary/40',
              )}
            >
              <p className="text-2xl font-semibold text-foreground font-mono tabular">{fmt.number(stats[s])}</p>
              <p className="eyebrow mt-1 flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_STYLES[s].dot)} />
                {copy(`statuses.${s}`)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ═══════ Search + filters ═══════ */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy('search')}
            aria-label={copy('search')}
            className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
          />
        </div>
        <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label={copy('filterStatus')}>
          {FILTERS.map((f) => (
            <button
              key={f}
              aria-pressed={statusFilter === f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border',
                statusFilter === f
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-surface text-text-muted border-hairline hover:text-foreground',
              )}
            >
              {copy(`statuses.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ Fleet grid ═══════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (cars?.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="font-medium text-foreground">{copy('emptyTitle')}</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              {copy('emptyDescription')}
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {copy('addFirst')}
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={copy('noResults')}
          description={copy('noResultsDescription')}
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>
              {copy('clearFilters')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filtered.map((car) => {
            const score = complianceScore(car.documents);
            const health = complianceHealth(score);
            const knownStatus = CAR_STATUSES.includes(car.status);
            const statusStyle = knownStatus ? STATUS_STYLES[car.status] : STATUS_STYLES.OUT_OF_SERVICE;
            return (
              <Link key={car.id} href={`/dashboard/fleet/${car.id}`} className="min-w-0 group focus-visible:outline-2 focus-visible:outline-primary rounded-2xl">
                <Card padding="none" className="group h-full cursor-pointer overflow-hidden">
                  <CarPhoto
                    alt={`${car.brand} ${car.model}`}
                    plate={car.licensePlate}
                    price={copy('perDay', { amount: fmt.money(car.pricePerDay) })}
                    rounded="rounded-none"
                  />
                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold tracking-tight text-foreground">
                          {car.brand} {car.model}
                        </h3>
                        <p className="mt-0.5 text-xs text-text-muted">
                          <span className="font-mono tabular">{fmt.number(car.year, { useGrouping: false })}</span> ·{' '}
                          <span className="font-mono tabular">{copy('distance', { value: fmt.number(car.mileage) })}</span>
                        </p>
                      </div>
                      <Badge
                        variant={car.status === 'AVAILABLE' ? 'outline' : car.status === 'OUT_OF_SERVICE' ? 'destructive' : 'secondary'}
                        className="shrink-0"
                      >
                        <span className={cn('me-1 w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {knownStatus ? copy(`statuses.${car.status}`) : copy('unknownStatus')}
                      </Badge>
                    </div>

                    {/* compliance meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{copy('compliance')}</span>
                        <span className={cn('font-mono tabular', HEALTH_STYLES[health].text)}>
                          {car.documents.length === 0 ? copy('noDocuments') : fmt.number(score / 100, { style: 'percent' })}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className={cn('h-full transition-all duration-700', HEALTH_STYLES[health].bar)}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-hairline pt-3">
                      <span className={cn('flex items-center gap-1 text-xs font-mono tabular', car.currentRoi >= 0 ? 'text-success' : 'text-danger')}>
                        <TrendingUp className="w-3.5 h-3.5" />
                        {copy('roi', { value: fmt.number(car.currentRoi / 100, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' }) })}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-primary">
                        {copy('manage')} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══════ Add Vehicle Modal ═══════ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title={copy('registerVehicle')}
        description={copy('registerDescription')}
      >
        <form onSubmit={handleAddVehicle} noValidate>
          <fieldset disabled={isSubmitting} className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fleet-brand" className="eyebrow px-1">{copy('brand')}</label>
                <input
                  id="fleet-brand"
                  required
                  value={form.brand}
                  onChange={setField('brand')}
                  placeholder="Dacia"
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fleet-model" className="eyebrow px-1">{copy('model')}</label>
                <input
                  id="fleet-model"
                  required
                  value={form.model}
                  onChange={setField('model')}
                  placeholder="Logan"
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fleet-year" className="eyebrow px-1">{copy('year')}</label>
                <input
                  id="fleet-year"
                  required
                  value={form.year}
                  onChange={setField('year')}
                  type="number"
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fleet-plate" className="eyebrow px-1">{copy('plate')}</label>
                <input
                  id="fleet-plate"
                  required
                  dir="ltr"
                  value={form.licensePlate}
                  onChange={setField('licensePlate')}
                  placeholder="12345-A-1"
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fleet-rate" className="eyebrow px-1">{copy('rate')}</label>
                <input
                  id="fleet-rate"
                  required
                  value={form.pricePerDay}
                  onChange={setField('pricePerDay')}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="350"
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fleet-fuel" className="eyebrow px-1">{copy('fuel')}</label>
                <select
                  id="fleet-fuel"
                  value={form.fuelType}
                  onChange={setField('fuelType')}
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
                >
                  <option value="DIESEL">{copy('fuels.DIESEL')}</option>
                  <option value="PETROL">{copy('fuels.PETROL')}</option>
                  <option value="HYBRID">{copy('fuels.HYBRID')}</option>
                  <option value="ELECTRIC">{copy('fuels.ELECTRIC')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fleet-gearbox" className="eyebrow px-1">{copy('gearbox')}</label>
                <select
                  id="fleet-gearbox"
                  value={form.gearbox}
                  onChange={setField('gearbox')}
                  className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
                >
                  <option value="MANUAL">{copy('gearboxes.MANUAL')}</option>
                  <option value="AUTOMATIC">{copy('gearboxes.AUTOMATIC')}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeAddModal} disabled={isSubmitting}>
                {copy('cancel')}
              </Button>
              <Button type="submit" className="flex-1 py-4" isLoading={isSubmitting}>
                {isSubmitting ? copy('registering') : copy('registerVehicle')}
              </Button>
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}
