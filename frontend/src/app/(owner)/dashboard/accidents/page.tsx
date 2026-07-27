"use client";

import { useLocale, useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { AgencyImage } from '@/components/ui/AgencyImage';
import { Combobox } from '@/components/ui/Combobox';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  AlertOctagon,
  Car,
  FileText,
  ChevronRight,
  CheckCircle2,
  Search,
  Plus,
  ShieldAlert,
  Hammer,
  CreditCard,
  RefreshCw,
  SearchX,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { formatDate } from '@/lib/format';
import api from '@/lib/api';
import { useFleet } from '../fleet/useFleet';
import {
  ACCIDENT_SEVERITIES,
  ACCIDENT_STATUSES,
  useAccidents,
  useCreateAccident,
  useUpdateAccident,
  type Accident,
  type AccidentSeverity,
  type AccidentStatus,
} from './useAccidents';

/** Progress steps mirror backend `ACCIDENT_STATUSES` order (not invented). */
const STATUS_STEPS: {
  key: AccidentStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'REPORTED', label: 'Reported', icon: FileText },
  { key: 'INVESTIGATING', label: 'Investigation', icon: ShieldAlert },
  { key: 'REPAIR_QUOTE', label: 'Repair quote', icon: Hammer },
  { key: 'IN_REPAIR', label: 'In repair', icon: Wrench },
  { key: 'CLAIM_FILED', label: 'Claim filed', icon: CreditCard },
  { key: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
];

const SEVERITY_LABEL: Record<AccidentSeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  SEVERE: 'Severe',
  TOTAL: 'Total loss',
};

const STATUS_LABEL: Record<AccidentStatus, string> = {
  REPORTED: 'Reported',
  INVESTIGATING: 'Investigation',
  REPAIR_QUOTE: 'Repair quote',
  IN_REPAIR: 'In repair',
  CLAIM_FILED: 'Claim filed',
  RESOLVED: 'Resolved',
};

function statusIndex(status: string): number {
  const idx = ACCIDENT_STATUSES.indexOf(status as AccidentStatus);
  return idx >= 0 ? idx : 0;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'MINOR':
      return 'text-success bg-success/10 border-success/20';
    case 'MODERATE':
      return 'text-warning bg-warning/10 border-warning/20';
    case 'SEVERE':
    case 'TOTAL':
      return 'text-danger bg-danger/10 border-danger/20';
    default:
      return 'text-text-muted bg-surface-raised border-hairline';
  }
}

function getSeverityDot(severity: string) {
  switch (severity) {
    case 'MINOR':
      return 'bg-success';
    case 'MODERATE':
      return 'bg-warning';
    case 'SEVERE':
    case 'TOTAL':
      return 'bg-danger';
    default:
      return 'bg-text-faint';
  }
}

function formatSeverity(severity: string) {
  if (severity in SEVERITY_LABEL) {
    return SEVERITY_LABEL[severity as AccidentSeverity];
  }
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

function formatStatus(status: string) {
  if (status in STATUS_LABEL) {
    return STATUS_LABEL[status as AccidentStatus];
  }
  return status;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const msg =
    (err as any)?.response?.data?.message ||
    (err as any)?.message ||
    fallback;
  return Array.isArray(msg) ? msg.join(' ') : String(msg);
}

export default function AccidentsPage() {
  const t = useTranslations('ownerPages');
  const locale = useLocale();
  const { showToast } = useToast();

  const { data: accidents, isLoading, error, refetch } = useAccidents();
  const { data: fleet, isLoading: isFleetLoading } = useFleet();
  const createMutation = useCreateAccident();
  const updateMutation = useUpdateAccident();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Report form state
  const [carId, setCarId] = useState('');
  const [severity, setSeverity] = useState<AccidentSeverity>('MINOR');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [thirdParty, setThirdParty] = useState(false);

  const carOptions = useMemo(
    () =>
      (fleet ?? []).map((c) => ({
        id: c.id,
        label: `${c.brand} ${c.model}`,
        sublabel: c.licensePlate,
      })),
    [fleet],
  );

  const filtered = useMemo(() => {
    if (!accidents) return [];
    const q = query.trim().toLowerCase();
    if (!q) return accidents;
    return accidents.filter((a) =>
      `${a.car.brand} ${a.car.model} ${a.car.licensePlate} ${a.description} ${a.status} ${a.severity}`
        .toLowerCase()
        .includes(q),
    );
  }, [accidents, query]);

  const selectedAccident: Accident | null = useMemo(() => {
    if (!accidents || !selectedId) return null;
    return accidents.find((a) => a.id === selectedId) ?? null;
  }, [accidents, selectedId]);

  // Keep selection if the row still exists after refetch; drop if deleted/gone.
  useEffect(() => {
    if (!selectedId || !accidents) return;
    if (!accidents.some((a) => a.id === selectedId)) {
      setSelectedId(null);
    }
  }, [accidents, selectedId]);

  const activeCount = useMemo(
    () => (accidents ?? []).filter((a) => a.status !== 'RESOLVED').length,
    [accidents],
  );

  const resetReportForm = () => {
    setCarId('');
    setSeverity('MINOR');
    setDescription('');
    setOccurredAt(new Date().toISOString().slice(0, 16));
    setLocation('');
    setEstimatedCost('');
    setThirdParty(false);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    resetReportForm();
  };

  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!carId) {
      showToast('danger', 'Vehicle required', 'Select which vehicle was involved.');
      return;
    }
    if (!description.trim()) {
      showToast('danger', 'Description required', 'Describe what happened.');
      return;
    }
    if (!occurredAt) {
      showToast('danger', 'Date required', 'When did the incident occur?');
      return;
    }

    const costRaw = estimatedCost.trim();
    let cost: number | undefined;
    if (costRaw) {
      cost = Number(costRaw);
      if (!Number.isFinite(cost) || cost < 0) {
        showToast('danger', 'Invalid cost', 'Estimated cost must be a non-negative number.');
        return;
      }
      // Wire contract: ≤2 decimal places (DTO @IsNumber maxDecimalPlaces: 2)
      cost = Math.round(cost * 100) / 100;
    }

    // datetime-local → ISO; backend expects IsDateString.
    const occurredIso = new Date(occurredAt).toISOString();

    createMutation.mutate(
      {
        carId,
        occurredAt: occurredIso,
        severity,
        description: description.trim(),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(cost !== undefined ? { estimatedCost: cost } : {}),
        thirdParty,
      },
      {
        onSuccess: (res) => {
          closeReportModal();
          setSelectedId(res.data.id);
          showToast('success', 'Incident filed', 'The dossier was saved to your agency.');
        },
        onError: (err) => {
          showToast(
            'danger',
            'Could not file incident',
            apiErrorMessage(err, 'The backend rejected this report.'),
          );
        },
      },
    );
  };

  const handleStatusChange = (next: AccidentStatus) => {
    if (!selectedAccident) return;
    if (next === selectedAccident.status) return;
    updateMutation.mutate(
      { id: selectedAccident.id, status: next },
      {
        onSuccess: () => {
          showToast(
            'success',
            'Status updated',
            `Dossier is now “${formatStatus(next)}”.`,
          );
        },
        onError: (err) => {
          showToast(
            'danger',
            'Update failed',
            apiErrorMessage(err, 'Could not update claim status.'),
          );
        },
      },
    );
  };

  const handleMarkResolved = () => {
    if (!selectedAccident || selectedAccident.status === 'RESOLVED') return;
    handleStatusChange('RESOLVED');
  };

  /**
   * `GET /accidents/:id/report` (capability `fleet.view`) streams a real PDF
   * (same Puppeteer pipeline as the booking contract) — same blob-download
   * pattern as `bookings/page.tsx`'s `downloadContract`. Cross-tenant/unknown
   * id 404s server-side before Puppeteer ever launches.
   */
  const downloadReport = async (accidentId: string) => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/accidents/${accidentId}/report`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accident-${accidentId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Report ready', 'The dossier PDF has been downloaded.');
    } catch {
      // The error body arrives as a Blob (responseType: 'blob'), so it can't be
      // parsed as the usual JSON `{message}` shape here — a generic message is
      // more honest than mis-parsing it.
      showToast(
        'danger',
        'Export failed',
        'The PDF engine could not render this dossier.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {t('accidents')}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-danger" />
            {isLoading
              ? 'Loading incident dossiers…'
              : error
                ? 'Could not load incidents'
                : `${activeCount} open incident${activeCount !== 1 ? 's' : ''} · ${(accidents ?? []).length} total`}
          </p>
        </div>
        <Button onClick={() => setIsReportModalOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          Report new incident
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Incident List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
              <input
                className="w-full bg-surface border border-hairline rounded-2xl ps-11 pe-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                placeholder="Search dossiers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : error ? (
            <EmptyState
              icon={RefreshCw}
              title="Couldn’t load incidents"
              description={typeof error === 'string' ? error : 'Something went wrong talking to the API.'}
              action={
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="w-3.5 h-3.5 me-2" />
                  Retry
                </Button>
              }
            />
          ) : (accidents ?? []).length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No incidents on file"
              description="When something happens to a vehicle, file a dossier here. Nothing has been reported for this agency yet."
              action={
                <Button size="sm" onClick={() => setIsReportModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 me-2" />
                  Report first incident
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching dossiers"
              description="Nothing matches that search. Try plate, model, status, or a word from the description."
              action={
                <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            filtered.map((accident) => (
              <Card
                key={accident.id}
                padding="none"
                className={cn(
                  'group cursor-pointer transition-all overflow-hidden',
                  selectedId === accident.id
                    ? 'ring-1 ring-primary/40'
                    : 'hover:bg-surface-raised',
                )}
                onClick={() => setSelectedId(accident.id)}
              >
                <div className="p-6 flex items-center gap-5">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 duration-300',
                      getSeverityColor(accident.severity),
                    )}
                  >
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold tracking-tight text-foreground truncate">
                        {accident.car.brand} {accident.car.model}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn('shrink-0', getSeverityColor(accident.severity))}
                      >
                        <span
                          className={cn(
                            'me-1 w-1.5 h-1.5 rounded-full',
                            getSeverityDot(accident.severity),
                          )}
                        />
                        {formatSeverity(accident.severity)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="font-mono tabular">{accident.car.licensePlate}</span>
                      <span className="w-1 h-1 rounded-full bg-text-faint" />
                      <span>{formatDate(accident.occurredAt, locale)}</span>
                    </div>
                  </div>
                  <div className="text-end flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-xs font-medium text-primary">
                      {formatStatus(accident.status)}
                    </p>
                    <ChevronRight className="w-4 h-4 text-text-faint group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Dossier detail panel */}
        <div className="lg:col-span-5">
          {selectedAccident ? (
            <Card className="sticky top-24 animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="items-start">
                <div>
                  <CardTitle className="text-xl font-mono tabular text-sm md:text-base break-all">
                    {selectedAccident.id}
                  </CardTitle>
                  <CardDescription className="text-primary normal-case tracking-normal font-medium text-xs">
                    {selectedAccident.car.brand} {selectedAccident.car.model} ·{' '}
                    {selectedAccident.car.licensePlate}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isDownloading}
                  disabled={isDownloading}
                  onClick={() => void downloadReport(selectedAccident.id)}
                >
                  Export PDF
                </Button>
              </CardHeader>

              <p className="text-sm text-text-muted leading-relaxed mb-6 border-s-2 border-primary/30 ps-4 py-1">
                &ldquo;{selectedAccident.description}&rdquo;
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8 text-xs">
                <div className="rounded-2xl border border-hairline bg-surface-raised/40 p-3">
                  <p className="eyebrow mb-1">Occurred</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedAccident.occurredAt, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-hairline bg-surface-raised/40 p-3">
                  <p className="eyebrow mb-1">Severity</p>
                  <p className="font-medium text-foreground">
                    {formatSeverity(selectedAccident.severity)}
                  </p>
                </div>
                {selectedAccident.location ? (
                  <div className="rounded-2xl border border-hairline bg-surface-raised/40 p-3 col-span-2">
                    <p className="eyebrow mb-1">Location</p>
                    <p className="font-medium text-foreground">{selectedAccident.location}</p>
                  </div>
                ) : null}
                {selectedAccident.estimatedCost != null ? (
                  <div className="rounded-2xl border border-hairline bg-surface-raised/40 p-3 col-span-2">
                    <p className="eyebrow mb-1">Estimated cost</p>
                    <p className="font-mono tabular font-medium text-foreground">
                      {Number(selectedAccident.estimatedCost).toFixed(2)} MAD
                    </p>
                  </div>
                ) : null}
                {selectedAccident.thirdParty ? (
                  <div className="rounded-2xl border border-warning/20 bg-warning/10 p-3 col-span-2">
                    <p className="text-xs font-medium text-warning">Third party involved</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-6">
                <p className="eyebrow">Claim progress</p>

                <div className="relative">
                  <div className="absolute start-[19px] top-0 bottom-0 w-px bg-hairline" />
                  <div
                    className="absolute start-[19px] top-0 w-px bg-primary transition-all duration-1000"
                    style={{
                      height: `${(statusIndex(selectedAccident.status) / (STATUS_STEPS.length - 1)) * 100}%`,
                    }}
                  />

                  <div className="space-y-8 relative">
                    {STATUS_STEPS.map((step, idx) => {
                      const current = statusIndex(selectedAccident.status);
                      const isActive = idx <= current;
                      const isCurrent = idx === current;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex items-center gap-5">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 z-10 shrink-0',
                              isActive
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-surface border-hairline text-text-faint',
                            )}
                          >
                            {isActive && !isCurrent ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p
                              className={cn(
                                'text-sm font-medium',
                                isActive ? 'text-foreground' : 'text-text-faint',
                              )}
                            >
                              {step.label}
                            </p>
                            {isCurrent && selectedAccident.status !== 'RESOLVED' && (
                              <p className="text-xs text-primary mt-0.5">Current stage</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-3">
                <div className="space-y-1.5">
                  <p className="eyebrow px-1">Update claim status</p>
                  <select
                    className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-all"
                    value={selectedAccident.status}
                    disabled={updateMutation.isPending}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as AccidentStatus)
                    }
                  >
                    {ACCIDENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {formatStatus(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={
                    updateMutation.isPending ||
                    selectedAccident.status === 'RESOLVED'
                  }
                  isLoading={updateMutation.isPending}
                  onClick={handleMarkResolved}
                >
                  Mark as resolved
                </Button>
              </div>
            </Card>
          ) : (
            <Card
              padding="none"
              className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8"
            >
              <AgencyImage
                slot="empty"
                alt=""
                ratio="1 / 1"
                rounded="rounded-2xl"
                className="w-20 mb-6"
              />
              <h3 className="font-medium text-foreground">Select an incident</h3>
              <p className="text-sm text-text-muted mt-1.5 max-w-xs">
                Dossier information will appear here once you choose a record.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* New Incident Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={closeReportModal}
        title="Report an incident"
        description="File a real dossier against one of your vehicles"
      >
        <form className="space-y-6" onSubmit={handleReportIncident}>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Vehicle involved</p>
            <Combobox
              options={carOptions}
              value={carId}
              onChange={setCarId}
              placeholder={isFleetLoading ? 'Loading vehicles…' : 'Select vehicle…'}
              emptyText={
                isFleetLoading
                  ? 'Loading vehicles…'
                  : 'No vehicles in this agency’s fleet'
              }
              icon={<Car className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">When</p>
              <input
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Severity</p>
              <select
                required
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AccidentSeverity)}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all"
              >
                {ACCIDENT_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {formatSeverity(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="eyebrow px-1">Incident narration</p>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all min-h-[120px] placeholder:text-text-faint"
              placeholder="Describe the sequence of events..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Location (optional)</p>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                placeholder="City, road, lot…"
              />
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Est. cost MAD (optional)</p>
              <input
                type="number"
                min={0}
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
                placeholder="0.00"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={thirdParty}
              onChange={(e) => setThirdParty(e.target.checked)}
              className="rounded border-hairline"
            />
            <span className="text-sm text-foreground">Third party involved</span>
          </label>

          <div className="p-4 bg-surface-raised border border-hairline rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">What this saves</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Creates a real accident dossier on the server (vehicle, date, severity,
                description). Photo/constat upload and insurance notify are not wired yet.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={closeReportModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="flex-1"
              isLoading={createMutation.isPending}
            >
              Submit report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
