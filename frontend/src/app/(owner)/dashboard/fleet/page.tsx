"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Car as CarIcon,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Gauge,
  TrendingUp,
  SearchX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
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

const FILTERS: Array<{ value: CarStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Assets' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
];

export default function FleetGuardian() {
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
          <p className="text-sm font-black text-white/80 uppercase tracking-tight">Fleet Offline</p>
          <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Fleet Guardian</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">
            Asset Monitoring & Compliance
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
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
          <div className="glass rounded-2xl p-4">
            <p className="text-2xl font-black text-white">{stats.total}</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">Total Assets</p>
          </div>
          {CAR_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={cn(
                'glass rounded-2xl p-4 text-left transition-all hover:bg-white/[0.07]',
                statusFilter === s && `ring-1 ${STATUS_STYLES[s].ring}`,
              )}
            >
              <p className={cn('text-2xl font-black', STATUS_STYLES[s].text)}>{stats[s]}</p>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">
                {s.replace(/_/g, ' ')}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ═══════ Search + filters ═══════ */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand, model or plate..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border',
                statusFilter === f.value
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white/5 text-white/40 border-white/5 hover:text-white/70',
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
        <EmptyState
          icon={CarIcon}
          title="No Vehicles Registered"
          description="Your fleet is empty. Register your first asset to activate Guardian monitoring, compliance tracking and ROI analytics."
          action={
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Register First Vehicle
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No Matching Assets"
          description="No vehicles match your current search or filter. Try adjusting the criteria."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>
              Clear Filters
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
                <Card className="group cursor-pointer h-full hover:ring-1 ring-white/10 hover:-translate-y-0.5 transition-all">
                  <CardHeader className="p-0 mb-4">
                    <div className="flex justify-between items-start w-full">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                        <CarIcon className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border flex items-center gap-1.5',
                          statusStyle.text,
                          statusStyle.bg,
                          statusStyle.border,
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {car.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </CardHeader>

                  <div className="space-y-1 mb-5">
                    <h3 className="text-lg font-black text-white leading-tight">
                      {car.brand} {car.model}
                    </h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      {car.licensePlate} • {car.year}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white/40">Compliance</span>
                        <span className={HEALTH_STYLES[health].text}>
                          {car.documents.length === 0 ? 'NO DOCS' : `${score}%`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all duration-1000', HEALTH_STYLES[health].bar)}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-white/40">
                        <Gauge className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black tracking-wider">
                          {car.mileage.toLocaleString()} KM
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className={cn('w-3.5 h-3.5', car.currentRoi >= 0 ? 'text-success' : 'text-danger')} />
                        <span className={cn('text-[10px] font-black tracking-wider', car.currentRoi >= 0 ? 'text-success' : 'text-danger')}>
                          {car.currentRoi >= 0 ? '+' : ''}{car.currentRoi.toFixed(0)}% ROI
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">
                        {car.pricePerDay.toLocaleString()} <span className="text-[10px] text-white/40">MAD/DAY</span>
                      </p>
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest group-hover:text-primary transition-colors">
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

      {/* ═══════ Add Vehicle Modal ═══════ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Register Asset"
        description="Add a vehicle to the fleet ledger"
      >
        <form onSubmit={handleAddVehicle} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Brand *</p>
              <input
                value={form.brand}
                onChange={setField('brand')}
                placeholder="Dacia"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Model *</p>
              <input
                value={form.model}
                onChange={setField('model')}
                placeholder="Logan"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Year *</p>
              <input
                value={form.year}
                onChange={setField('year')}
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">License Plate *</p>
              <input
                value={form.licensePlate}
                onChange={setField('licensePlate')}
                placeholder="12345-A-1"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Rate (MAD/day) *</p>
              <input
                value={form.pricePerDay}
                onChange={setField('pricePerDay')}
                type="number"
                min={0}
                step="0.01"
                placeholder="350"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Fuel</p>
              <select
                value={form.fuelType}
                onChange={setField('fuelType')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none appearance-none focus:border-primary transition-all"
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ELECTRIC">Electric</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Gearbox</p>
              <select
                value={form.gearbox}
                onChange={setField('gearbox')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none appearance-none focus:border-primary transition-all"
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
              {isSubmitting ? 'Registering...' : 'Register Asset'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
