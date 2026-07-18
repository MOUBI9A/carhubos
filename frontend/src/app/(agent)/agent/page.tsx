"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Clock, Scan, Plus, Car as CarIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useToast } from '@/lib/contexts/ToastContext';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  dueDate?: string | null;
};

type Car = {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
  status: string;
};

export default function AgentOperations() {
  const t = useTranslations('agentOps');
  const router = useRouter();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get<Task[]>('/tasks'), api.get<Car[]>('/cars')])
      .then(([taskResponse, carResponse]) => {
        if (!active) return;
        setTasks(taskResponse.data.filter((task) => task.priority === 'URGENT' || task.priority === 'HIGH').slice(0, 5));
        setCars(carResponse.data.slice(0, 6));
      })
      .catch(() => showToast('danger', 'Load Failed', t('loadFailed')))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [showToast, t]);

  const statusLabel = (status: string) => {
    if (status === 'MAINTENANCE' || status === 'OUT_OF_SERVICE') return t('inRepair');
    if (status === 'RENTED') return t('cleaning');
    return t('available');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-text-muted font-medium text-xs mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" disabled title={t('notReady')}>
            <Scan className="w-4 h-4 me-2" />
            {t('scanQr')}
          </Button>
          <Button onClick={() => router.push('/agent/inspections')}>
            <Plus className="w-4 h-4 me-2" />
            {t('newInspection')}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="min-h-64 flex items-center justify-center text-text-muted">{t('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <CardHeader className="px-0">
              <div>
                <CardTitle>{t('priorityTasks')}</CardTitle>
                <CardDescription>{t('immediateAttention')}</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="flex items-center justify-between group border-s-4 border-s-primary">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">{task.title}</h4>
                      <p className="text-[10px] font-medium text-text-muted truncate">{task.description || '—'}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-primary uppercase ms-4">{task.priority}</p>
                </Card>
              ))}
              {!tasks.length && <p className="text-sm text-text-muted">{t('noTasks')}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <CardHeader className="px-0">
              <div>
                <CardTitle>{t('fleetAvailability')}</CardTitle>
                <CardDescription>{t('liveStatus')}</CardDescription>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4">
              {cars.map((car) => {
                const label = statusLabel(car.status);
                const color = car.status === 'AVAILABLE' ? 'text-success' : car.status === 'RENTED' ? 'text-warning' : 'text-danger';
                return (
                  <div key={car.id} className="flex items-center justify-between p-4 glass-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-raised flex items-center justify-center shrink-0">
                        <CarIcon className="w-4 h-4 text-text-faint" />
                      </div>
                      <span className="text-sm font-semibold text-foreground truncate">{car.brand} {car.model} · {car.licensePlate}</span>
                    </div>
                    <div className="flex items-center gap-2 ms-4 shrink-0">
                      <div className={cn('w-1.5 h-1.5 rounded-full', color.replace('text', 'bg'))} />
                      <span className={cn('text-[10px] font-semibold uppercase tracking-widest', color)}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
