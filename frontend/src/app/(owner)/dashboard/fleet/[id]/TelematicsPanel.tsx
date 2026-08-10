"use client";

import React, { useState } from 'react';
import {
  MapPin,
  Gauge,
  Power,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Satellite,
  AlertTriangle,
  ExternalLink,
  BatteryMedium,
  Link2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useTelematics, type TelematicsCommand } from './useTelematics';

/** A fix older than this is shown as untrustworthy — matches the server gate. */
const STALE_FIX_SECONDS = 180;

function fixAgeLabel(seconds: number | null): string {
  if (seconds === null) return 'no fix yet';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

function commandLabel(c: TelematicsCommand): string {
  return c.type === 'IMMOBILIZE' ? 'Immobilize' : 'Restore mobility';
}

/**
 * Live GPS panel on the vehicle detail page.
 *
 * The immobilize control is deliberately heavier than the rest of the UI:
 * a confirmation modal, a mandatory written reason, and copy that states
 * plainly what the command does (blocks the NEXT start — it does not stop a
 * moving car). The server enforces all of this independently; the UI's job
 * is to make sure nobody engages it by reflex or misunderstands its effect.
 */
export function TelematicsPanel({ carId }: { carId: string }) {
  const { showToast } = useToast();
  const { state, commands, status, error, refetch } = useTelematics(carId);

  const [modal, setModal] = useState<null | 'IMMOBILIZE' | 'RESTORE'>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deviceInput, setDeviceInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceInput.trim()) return;
    setIsLinking(true);
    try {
      await api.put(`/telematics/cars/${carId}/device`, {
        deviceId: deviceInput.trim(),
      });
      showToast(
        'success',
        'Tracker linked',
        'This vehicle is now tied to that device in your GPS account.',
      );
      setDeviceInput('');
      await refetch();
    } catch (err: any) {
      showToast(
        'danger',
        'Could not link tracker',
        err?.response?.data?.message || 'Please check the device ID.',
      );
    } finally {
      setIsLinking(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setReason('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 10) return;
    setIsSubmitting(true);
    const immobilizing = modal === 'IMMOBILIZE';
    try {
      await api.post(
        `/telematics/cars/${carId}/${immobilizing ? 'immobilize' : 'restore-mobility'}`,
        { reason: reason.trim() },
      );
      showToast(
        'success',
        immobilizing ? 'Vehicle immobilized' : 'Mobility restored',
        immobilizing
          ? 'The starter interrupt is engaged — the vehicle will not start again until you restore it.'
          : 'The vehicle can be started again.',
      );
      closeModal();
      await refetch();
    } catch (err: any) {
      // A 409 here is the safety interlock refusing (moving / stale fix /
      // ignition on) — that is expected behaviour, not a system fault, so it
      // gets a warning tone and the provider's own explanation verbatim.
      const httpStatus = err?.response?.status;
      const message =
        err?.response?.data?.message || 'The command could not be sent.';
      showToast(
        httpStatus === 409 ? 'warning' : 'danger',
        httpStatus === 409 ? 'Refused for safety' : 'Command failed',
        Array.isArray(message) ? message.join(' ') : String(message),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Not set up yet: guide, don't alarm ────────────────────────────
  if (status === 'not-configured' || status === 'no-device') {
    return (
      <Card>
        <CardHeader className="p-0 mb-4">
          <CardTitle>Live tracking</CardTitle>
          <CardDescription className="mt-1">GPS position and remote immobilizer</CardDescription>
        </CardHeader>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-hairline">
          <Satellite className="w-4 h-4 text-text-faint shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {status === 'not-configured'
                ? 'No GPS provider connected'
                : 'No tracker linked to this vehicle'}
            </p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {status === 'not-configured'
                ? 'Connect your agency’s GPS account in Settings → GPS & tracking, then link each vehicle to its tracker.'
                : 'Add this vehicle’s device ID from your GPS provider to see its position and use the immobilizer.'}
            </p>
          </div>
        </div>

        {status === 'no-device' && (
          <form onSubmit={handleLinkDevice} className="mt-4 flex gap-2">
            <input
              value={deviceInput}
              onChange={(e) => setDeviceInput(e.target.value)}
              disabled={isLinking}
              placeholder="Device ID from your GPS provider"
              className="flex-1 min-w-0 bg-surface border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint placeholder:font-sans"
            />
            <Button type="submit" size="sm" isLoading={isLinking} disabled={!deviceInput.trim()}>
              Link
            </Button>
          </form>
        )}
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Card>
        <CardHeader className="p-0 mb-4">
          <CardTitle>Live tracking</CardTitle>
        </CardHeader>
        <SkeletonRows rows={3} />
      </Card>
    );
  }

  if (status === 'error' || !state) {
    return (
      <Card>
        <CardHeader className="p-0 mb-4">
          <CardTitle>Live tracking</CardTitle>
        </CardHeader>
        <div className="text-center py-6">
          <p className="text-sm text-danger">{error ?? 'Tracking unavailable.'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5 me-1.5" /> Retry
          </Button>
        </div>
      </Card>
    );
  }

  const stale =
    state.fixAgeSeconds === null || state.fixAgeSeconds > STALE_FIX_SECONDS;
  const moving = state.speedKph > 3;
  const hasPosition = state.latitude !== null && state.longitude !== null;

  return (
    <Card>
      <CardHeader className="p-0 mb-5 items-start">
        <div>
          <CardTitle>Live tracking</CardTitle>
          <CardDescription className="mt-1">
            GPS position and remote immobilizer
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh vehicle position"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
        </Button>
      </CardHeader>

      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant={state.immobilized ? 'destructive' : 'outline'}>
          {state.immobilized ? (
            <>
              <ShieldAlert className="w-3 h-3 me-1" /> Immobilized
            </>
          ) : (
            <>
              <ShieldCheck className="w-3 h-3 me-1" /> Mobile
            </>
          )}
        </Badge>
        <Badge variant={moving ? 'secondary' : 'outline'}>
          <Gauge className="w-3 h-3 me-1" />
          {state.speedKph.toFixed(0)} km/h
        </Badge>
        {state.ignitionOn !== null && (
          <Badge variant="outline">
            <Power className="w-3 h-3 me-1" />
            Ignition {state.ignitionOn ? 'on' : 'off'}
          </Badge>
        )}
        <Badge variant={stale ? 'destructive' : 'outline'}>
          <Satellite className="w-3 h-3 me-1" />
          {fixAgeLabel(state.fixAgeSeconds)}
        </Badge>
        {state.batteryPercent !== null && (
          <Badge variant="outline">
            <BatteryMedium className="w-3 h-3 me-1" />
            {state.batteryPercent}%
          </Badge>
        )}
      </div>

      {/* Position */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-hairline">
        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {hasPosition ? (
            <>
              <p className="text-sm font-mono tabular text-foreground">
                {state.latitude!.toFixed(5)}, {state.longitude!.toFixed(5)}
              </p>
              <a
                href={`https://www.openstreetmap.org/?mlat=${state.latitude}&mlon=${state.longitude}#map=16/${state.latitude}/${state.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Open in map <ExternalLink className="w-3 h-3" />
              </a>
            </>
          ) : (
            <p className="text-sm text-text-muted">
              This tracker has never reported a position.
            </p>
          )}
          {state.deviceId && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-faint font-mono tabular">
              <Link2 className="w-3 h-3" /> {state.deviceId}
            </p>
          )}
        </div>
      </div>

      {stale && hasPosition && (
        <div className="flex items-start gap-2.5 p-3 mt-3 rounded-xl bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-warning leading-relaxed">
            This position is {fixAgeLabel(state.fixAgeSeconds)} and may not reflect
            where the vehicle is now. The immobilizer is blocked until a fresh fix
            arrives.
          </p>
        </div>
      )}

      {/* Mobility controls */}
      <div className="mt-5 pt-5 border-t border-hairline">
        {state.immobilized ? (
          <Button variant="outline" className="w-full" onClick={() => setModal('RESTORE')}>
            <ShieldCheck className="w-4 h-4 me-2" /> Restore mobility
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full text-danger border-danger/30 hover:bg-danger/5"
            onClick={() => setModal('IMMOBILIZE')}
          >
            <ShieldAlert className="w-4 h-4 me-2" /> Immobilize vehicle
          </Button>
        )}
        <p className="mt-2 text-[11px] text-text-faint leading-relaxed text-center">
          Immobilizing blocks the <strong>next</strong> start. It never stops a
          moving vehicle.
        </p>
      </div>

      {/* Command history — the dispute trail */}
      {commands.length > 0 && (
        <div className="mt-5 pt-5 border-t border-hairline space-y-2">
          <p className="eyebrow">Command history</p>
          {commands.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-start gap-2.5 text-xs">
              <span
                className={cn(
                  'mt-1 w-1.5 h-1.5 rounded-full shrink-0',
                  c.status === 'SENT'
                    ? 'bg-success'
                    : c.status === 'REJECTED'
                      ? 'bg-warning'
                      : 'bg-danger',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground">
                  <span className="font-medium">{commandLabel(c)}</span>{' '}
                  <span className="text-text-faint">
                    · {c.status.toLowerCase()}
                  </span>
                </p>
                <p className="text-text-muted truncate">{c.reason}</p>
                {c.failureReason && (
                  <p className="text-text-faint mt-0.5">{c.failureReason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation */}
      <Modal
        isOpen={modal !== null}
        onClose={closeModal}
        title={modal === 'IMMOBILIZE' ? 'Immobilize vehicle' : 'Restore mobility'}
        description={
          modal === 'IMMOBILIZE'
            ? 'Blocks the next engine start until you restore it'
            : 'Allows the vehicle to be started again'
        }
      >
        <div className="space-y-5">
          {modal === 'IMMOBILIZE' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-[11px] text-warning leading-relaxed">
                This engages the starter interrupt: the vehicle will not start
                again until you restore mobility. It does <strong>not</strong> stop
                a moving vehicle, and will be refused unless the car is confirmed
                stopped on a recent GPS fix. Make sure your rental contract permits
                this before using it on a customer&apos;s vehicle.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="eyebrow px-1">Reason (recorded, minimum 10 characters) *</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              placeholder="e.g. Renter 6 days overdue and unreachable by phone."
              className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={reason.trim().length < 10}
            >
              {modal === 'IMMOBILIZE' ? 'Immobilize' : 'Restore'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
