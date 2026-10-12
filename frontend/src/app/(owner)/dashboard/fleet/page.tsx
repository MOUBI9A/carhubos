"use client";

import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useFleetPaginated } from './useFleetPaginated';
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

const FILTERS: Array<{ value: CarStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All assets' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Out of service' },
];

export default function FleetGuardian() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CarStatus | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  // Debounce search input before it hits the server-side `search` param.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const {
    data: cars,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMore,
  } = useFleetPaginated(debouncedQuery);

  const setField = (key: keyof typeof INITIAL_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Search already happened server-side; status filter is client-side over
  // whatever page(s) are currently loaded.
  const filtered = useMemo(() => {
    if (!cars) return [];
    if (statusFilter === 'ALL') return cars;
    return cars.filter((car) => car.status === statusFilter);
  }, [cars, statusFilter]);

  // `stats.total` is the server-side count across the whole fleet; the
  // per-status breakdown can only reflect whatever page(s) are loaded.
  const stats = useMemo(() => {
    const counts = { total, AVAILABLE: 0, RENTED: 0, MAINTENANCE: 0, OUT_OF_SERVICE: 0 };
    for (const car of cars ?? []) {
      counts[car.status] = (counts[car.status] ?? 0) + 1;
    }
    return counts;
  }, [cars, total]);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setForm(INITIAL_FORM);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(form.year, 10);
    const pricePerDay = parseFloat(form.pricePerDay);

    if (!form.brand.trim() || !form.model.trim() || !form.licensePlate.trim()) {
      showToast('danger', 'Missing Fields', 'Brand, model and license plate are required.');
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      showToast('danger', 'Invalid Year', 'Enter a valid manufacturing year.');
      return;
    }
    if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
      showToast('danger', 'Invalid Rate', 'Enter a daily rate greater than 0.');
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
      showToast('success', 'Asset Registered', `${form.brand} ${form.model} added to your fleet.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to register vehicle';
      showToast('danger', 'Registration Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
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
          <p className="text-base font-semibold text-foreground">Fleet offline</p>
          <p className="text-sm text-text-muted mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 me-2" /> Reconnect
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
            Asset monitoring and compliance across your fleet
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          Add vehicle
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
            <p className="text-2xl font-semibold text-foreground font-mono tabular">{stats.total}</p>
            <p className="eyebrow mt-1">Total assets</p>
          </div>
          {CAR_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={cn(
                'rounded-2xl bg-surface border border-hairline p-4 text-start transition-all hover:bg-surface-raised',
                statusFilter === s && 'ring-1 ring-primary/40',
              )}
            >
              <p className="text-2xl font-semibold text-foreground font-mono tabular">{stats[s]}</p>
              <p className="eyebrow mt-1 flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_STYLES[s].dot)} />
                {s.replace(/_/g, ' ')}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ═══════ Search + filters ═══════ */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand, model or plate..."
            className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border',
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-surface text-text-muted border-hairline hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ Fleet grid ═══════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (cars?.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <AgencyImage slot="empty" alt="" ratio="1 / 1" rounded="rounded-2xl" className="w-20" />
          <div>
            <p className="font-medium text-foreground">No vehicles yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              Register your first car to start compliance tracking, ROI and bookings.
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Add your first car
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching results"
          description="No vehicles match your current search or filter. Try adjusting the criteria."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((car) => {
            const score = complianceScore(car.documents);
            const health = complianceHealth(score);
            const statusStyle = STATUS_STYLES[car.status];
            return (
              <Link key={car.id} href={`/dashboard/fleet/${car.id}`}>
                <Card padding="none" className="group h-full cursor-pointer overflow-hidden">
                  <CarPhoto
                    alt={`${car.brand} ${car.model}`}
                    plate={car.licensePlate}
                    price={`${car.pricePerDay.toLocaleString()} MAD/day`}
                    rounded="rounded-none"
                  />
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold tracking-tight text-foreground">
                          {car.brand} {car.model}
                        </h3>
                        <p className="mt-0.5 text-xs text-text-muted">
                          <span className="font-mono tabular">{car.year}</span> ·{' '}
                          <span className="font-mono tabular">{car.mileage.toLocaleString()}</span> km
                        </p>
                      </div>
                      <Badge
                        variant={car.status === 'AVAILABLE' ? 'outline' : car.status === 'OUT_OF_SERVICE' ? 'destructive' : 'secondary'}
                        className="shrink-0"
                      >
                        <span className={cn('me-1 w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {car.status.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </div>

                    {/* compliance meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Compliance</span>
                        <span className={cn('font-mono tabular', HEALTH_STYLES[health].text)}>
                          {car.documents.length === 0 ? 'No docs' : `${score}%`}
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
                        {car.currentRoi >= 0 ? '+' : ''}{car.currentRoi.toFixed(0)}% ROI
                      </span>
                      <span className="text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Manage →
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══════ Load more ═══════ */}
      {!isLoading && hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} isLoading={isLoadingMore}>
            {isLoadingMore ? t('loadingMore') : t('loadMore')}
          </Button>
        </div>
      )}

      {/* ═══════ Add Vehicle Modal ═══════ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Register vehicle"
        description="Add a vehicle to your fleet ledger"
      >
        <form onSubmit={handleAddVehicle} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Brand *</p>
              <input
                value={form.brand}
                onChange={setField('brand')}
                placeholder="Dacia"
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Model *</p>
              <input
                value={form.model}
                onChange={setField('model')}
                placeholder="Logan"
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Year *</p>
              <input
                value={form.year}
                onChange={setField('year')}
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">License plate *</p>
              <input
                value={form.licensePlate}
                onChange={setField('licensePlate')}
                placeholder="12345-A-1"
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Rate (MAD/day) *</p>
              <input
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
              <p className="eyebrow px-1">Fuel</p>
              <select
                value={form.fuelType}
                onChange={setField('fuelType')}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ELECTRIC">Electric</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Gearbox</p>
              <select
                value={form.gearbox}
                onChange={setField('gearbox')}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
              >
                <option value="MANUAL">Manual</option>
                <option value="AUTOMATIC">Automatic</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={closeAddModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 py-4" isLoading={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
