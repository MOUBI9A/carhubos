"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Clock, Scan, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { AgencyImage, CarPhoto } from '@/components/ui/AgencyImage';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useToast } from '@/lib/contexts/ToastContext';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  dueDate?: string | null;
  assignee?: { name: string } | null;
};

type Car = {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
  imageUrl?: string | null;
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

  // Presentation-only rollup of the vehicles shown below.
  const cleaningCount = cars.filter((car) => car.status === 'RENTED').length;
  const repairCount = cars.filter((car) => car.status === 'MAINTENANCE' || car.status === 'OUT_OF_SERVICE').length;
  const availableCount = cars.length - cleaningCount - repairCount;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-text-muted">{t('subtitle')}</p>
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
        <>
          {/* ═══════ Today at a glance ═══════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="sm">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow truncate">{t('priorityTasks')}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-mono tabular">{tasks.length}</p>
            </Card>
            <Card padding="sm">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow truncate">{t('available')}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-mono tabular">{availableCount}</p>
            </Card>
            <Card padding="sm">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow truncate">{t('cleaning')}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-mono tabular">{cleaningCount}</p>
            </Card>
            <Card padding="sm">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow truncate">{t('inRepair')}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-mono tabular">{repairCount}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <CardHeader className="px-0">
                <div>
                  <CardTitle>{t('priorityTasks')}</CardTitle>
                  <CardDescription>{t('immediateAttention')}</CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-4">
                {tasks.map((task) => {
                  const meta = [task.description, task.assignee?.name].filter(Boolean).join(' · ');
                  return (
                    <Card key={task.id} className="flex items-center justify-between border-s-2 border-s-primary">
                      <div className="flex items-center gap-4 min-w-0">
                        {task.assignee?.name ? (
                          <Avatar name={task.assignee.name} size={40} />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">{task.title}</h4>
                          <p className="text-xs text-text-muted truncate">{meta || '—'}</p>
                        </div>
                      </div>
                      <Badge
                        variant={task.priority === 'URGENT' ? 'destructive' : 'secondary'}
                        className="ms-4 shrink-0"
                      >
                        {task.priority}
                      </Badge>
                    </Card>
                  );
                })}
                {!tasks.length && (
                  <Card padding="none" className="overflow-hidden">
                    <AgencyImage alt="" slot="empty" ratio="16 / 5" rounded="rounded-none" />
                    <p className="px-6 py-4 text-sm text-text-muted text-center">{t('noTasks')}</p>
                  </Card>
                )}
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
                    <Card key={car.id} padding="sm" className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <CarPhoto src={car.imageUrl} alt={`${car.brand} ${car.model}`} className="w-16 shrink-0" rounded="rounded-lg" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{car.brand} {car.model}</p>
                          <p className="font-mono tabular text-xs text-text-muted truncate">{car.licensePlate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ms-4 shrink-0">
                        <span className={cn('w-1.5 h-1.5 rounded-full', color.replace('text', 'bg'))} />
                        <span className={cn('text-xs font-medium', color)}>{label}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
