"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Camera, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

type Car = {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
  mileage: number;
};

type Inspection = {
  id: string;
  carId: string;
  type: 'PRE_RENTAL' | 'POST_RENTAL';
  fuelLevel: number;
  mileage: number;
  damages?: string | null;
  notes?: string | null;
  createdAt: string;
  inspector?: { name: string };
  car?: Car;
};

function damageCount(value?: string | null): number {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default function Inspections() {
  const t = useTranslations('inspections');
  const { showToast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Inspection | null>(null);

  const loadInspections = async () => {
    setIsLoading(true);
    try {
      const carResponse = await api.get<Car[]>('/cars');
      const availableCars = carResponse.data;
      const inspectionResponses = await Promise.all(
        availableCars.map((car) => api.get<Inspection[]>(`/inspections/car/${car.id}`)),
      );
      setCars(availableCars);
      setInspections(
        inspectionResponses.flatMap((response, index) =>
          response.data.map((inspection) => ({ ...inspection, car: availableCars[index] })),
        ),
      );
    } catch {
      showToast('danger', 'Load Failed', t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInspections();
  }, []);

  const handleStartInspection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await api.post('/inspections', {
        carId: formData.get('carId'),
        type: formData.get('type'),
        fuelLevel: Number(formData.get('fuelLevel')),
        mileage: Number(formData.get('mileage')),
      });
      setIsInspectionModalOpen(false);
      showToast('success', 'Inspection Recorded', t('createdBody'));
      await loadInspections();
    } catch {
      showToast('danger', 'Action Failed', t('createFailed'));
    }
  };

  const damageTotal = inspections.reduce((total, inspection) => total + damageCount(inspection.damages), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-text-muted font-medium text-xs mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsInspectionModalOpen(true)}>
          <Camera className="w-4 h-4 me-2" />
          {t('initialize')}
        </Button>
      </header>

      {isLoading ? (
        <div className="min-h-64 flex items-center justify-center text-text-muted">{t('loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Metric value={inspections.length} label={t('totalLogs')} />
            <Metric value={Math.max(inspections.length - damageTotal, 0)} label={t('cleanStatus')} tone="success" />
            <Metric value={damageTotal} label={t('damageAlerts')} tone="danger" />
            <Metric value="—" label={t('avgLeadTime')} tone="primary" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <CardHeader className="px-0">
              <CardTitle>{t('registry')}</CardTitle>
            </CardHeader>
            {inspections.map((item) => {
              const damages = damageCount(item.damages);
              return (
                <Card key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-success/10 text-success border-success/20 shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-foreground truncate">{item.car?.brand} {item.car?.model}</h4>
                        <span className="text-[8px] font-semibold bg-surface-raised px-1.5 py-0.5 rounded-sm tracking-widest text-text-muted">{item.car?.licensePlate}</span>
                      </div>
                      <p className="text-xs text-text-muted font-medium mt-0.5">
                        {item.type === 'PRE_RENTAL' ? t('preRental') : t('postRental')} · {item.inspector?.name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    {damages > 0 && <span className="text-[9px] font-semibold text-danger uppercase">{damages} {t('damages')}</span>}
                    <span className="text-[10px] font-semibold text-success uppercase">{t('validity')}: {t('completed')}</span>
                    <Button size="sm" variant="outline" onClick={() => setSelectedReport(item)}>
                      {t('review')}
                      <ArrowRight className="ms-2 w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
            {!inspections.length && <p className="text-sm text-text-muted">{t('noInspections')}</p>}
          </div>
        </>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div>
            <CardTitle className="text-primary text-xs">{t('protocol')}</CardTitle>
            <p className="text-[11px] text-text-muted leading-relaxed mt-1 italic">{t('protocolBody')}</p>
          </div>
        </div>
      </Card>

      <Modal isOpen={isInspectionModalOpen} onClose={() => setIsInspectionModalOpen(false)} title={t('newTitle')} description={t('newDescription')}>
        <form onSubmit={handleStartInspection} className="space-y-6">
          <label className="space-y-1.5 block">
            <span className="eyebrow px-1">{t('vehicle')}</span>
            <select name="carId" required className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground">
              <option value="">{t('selectVehicle')}</option>
              {cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.model} · {car.licensePlate}</option>)}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className="eyebrow px-1">{t('auditType')}</legend>
            <div className="grid grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <input type="radio" name="type" value="PRE_RENTAL" defaultChecked className="sr-only peer" />
                <span className="block p-4 rounded-xl border border-hairline bg-surface-raised text-center peer-checked:border-primary peer-checked:bg-violet-soft">
                  <strong className="text-xs font-semibold block">{t('preRental')}</strong><small className="text-[9px] text-text-muted">{t('checkout')}</small>
                </span>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="type" value="POST_RENTAL" className="sr-only peer" />
                <span className="block p-4 rounded-xl border border-hairline bg-surface-raised text-center peer-checked:border-primary peer-checked:bg-violet-soft">
                  <strong className="text-xs font-semibold block">{t('postRental')}</strong><small className="text-[9px] text-text-muted">{t('checkin')}</small>
                </span>
              </label>
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5 block"><span className="eyebrow">{t('fuel')}</span><input name="fuelLevel" type="number" min="0" max="8" defaultValue="8" required className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground" /></label>
            <label className="space-y-1.5 block"><span className="eyebrow">{t('mileage')}</span><input name="mileage" type="number" min="0" defaultValue="0" required className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground" /></label>
          </div>
          <p className="text-[10px] font-medium text-text-muted">{t('enabled')}</p>
          <Button type="submit" className="w-full">{t('launch')}</Button>
        </form>
      </Modal>

      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={t('reviewTitle')} description={`${selectedReport?.car?.brand || ''} ${selectedReport?.car?.model || ''}`}>
        {selectedReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((index) => <div key={index} className="aspect-video bg-surface-raised rounded-xl border border-hairline flex items-center justify-center"><Camera className="w-6 h-6 text-text-faint" /></div>)}
            </div>
            <div className="p-4 glass-card">
              <p className="eyebrow mb-2">{t('internalNote')}</p>
              <p className="text-xs text-text-muted leading-relaxed">{selectedReport.notes || '—'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedReport(null)}>{t('close')}</Button>
              <Button className="flex-1" disabled title={t('pdfUnavailable')}><FileText className="w-4 h-4 me-2" />{t('pdf')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Metric({ value, label, tone = 'default' }: { value: number | string; label: string; tone?: 'default' | 'success' | 'danger' | 'primary' }) {
  return (
    <Card className={cn('p-4 text-center', tone === 'danger' && 'border-danger/20 bg-danger/5')}>
      <p className={cn('text-2xl font-semibold', tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : tone === 'primary' ? 'text-primary' : 'text-foreground')}>{value}</p>
      <p className="eyebrow mt-1">{label}</p>
    </Card>
  );
}
