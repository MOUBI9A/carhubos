"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { TrustSeal } from '@/components/ui/Seal';
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Bell,
  Check,
  X,
  Clock,
  Info,
  RefreshCw,
  AlertTriangle,
  Copy,
  FileText,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import {
  usePortalMe,
  usePortalConsent,
  usePortalNotifications,
  usePortalDocuments,
} from './usePortalData';
import {
  CONSENT_STATUS_STYLES,
  RISK_LEVEL_STYLES,
  scopeLabel,
  formatDate,
  formatDateTime,
  formatRelativeToNow,
  type ConsentGrant,
  type PortalNotification,
} from './types';

export default function RenterPortal() {
  const t = useTranslations('renterPortal');
  const { showToast } = useToast();
  const { me, isLoading: meLoading, error: meError, refetch: refetchMe } = usePortalMe();
  const {
    grants,
    isLoading: consentLoading,
    error: consentError,
    refetch: refetchConsent,
  } = usePortalConsent();
  const {
    notifications,
    setNotifications,
    isLoading: notifLoading,
    error: notifError,
    refetch: refetchNotifications,
  } = usePortalNotifications();
  const {
    documents,
    isLoading: docsLoading,
    error: docsError,
    refetch: refetchDocs,
  } = usePortalDocuments();

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingGrants = useMemo(() => grants.filter((g) => g.status === 'PENDING'), [grants]);
  const otherGrants = useMemo(() => grants.filter((g) => g.status !== 'PENDING'), [grants]);

  // Close the notifications dropdown on Escape.
  useEffect(() => {
    if (!isNotifOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotifOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isNotifOpen]);

  const handleApprove = async (grant: ConsentGrant) => {
    setActingId(grant.id);
    try {
      await api.post(`/portal/consent/${grant.id}/approve`);
      showToast(
        'success',
        'Access Approved',
        `${grant.agencyName ?? 'The agency'} can now view your ${grant.scope.map(scopeLabel).join(', ')} for 7 days.`,
      );
      await refetchConsent();
    } catch (err: any) {
      showToast('danger', 'Approve Failed', err?.response?.data?.message || 'Could not approve this request.');
    } finally {
      setActingId(null);
    }
  };

  const handleDenyOrRevoke = async (grant: ConsentGrant) => {
    const wasPending = grant.status === 'PENDING';
    setActingId(grant.id);
    try {
      await api.post(`/portal/consent/${grant.id}/revoke`);
      showToast(
        'success',
        wasPending ? 'Request Denied' : 'Access Revoked',
        `${grant.agencyName ?? 'The agency'} no longer has access to your documents.`,
      );
      await refetchConsent();
    } catch (err: any) {
      showToast('danger', 'Action Failed', err?.response?.data?.message || 'Could not update this grant.');
    } finally {
      setActingId(null);
    }
  };

  const handleMarkRead = async (notif: PortalNotification) => {
    if (notif.read) return;
    setMarkingId(notif.id);
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    try {
      await api.patch(`/portal/notifications/${notif.id}/read`);
    } catch (err: any) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: false } : n)));
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not mark notification read.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleCopyQr = async () => {
    if (!me?.qrHash) return;
    try {
      await navigator.clipboard.writeText(me.qrHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('info', 'Copy Unavailable', 'Select and copy the code manually.');
    }
  };

  const handleGenerateQr = async () => {
    setIsGeneratingQr(true);
    try {
      await api.post('/portal/trust-qr');
      await refetchMe();
      showToast('success', 'QR Ready', 'Your Trust Vault code has been generated.');
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Could not generate your QR code.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1.5 flex items-center gap-2 eyebrow">
            {meLoading ? (
              <span className="inline-block w-40 h-3 bg-surface rounded animate-pulse" />
            ) : me?.isVerified ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {t('verified')}
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-text-faint/50" />
                {t('pendingVerification')}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen((o) => !o)}
              aria-label={unreadCount > 0 ? `${t('notifications')}, ${unreadCount} ${t('unread')}` : t('notifications')}
              aria-expanded={isNotifOpen}
              className="relative w-11 h-11 rounded-xl glass flex items-center justify-center text-text-muted hover:text-foreground transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-foreground text-[9px] font-semibold flex items-center justify-center border-2 border-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsNotifOpen(false)}
                  aria-label={t('close')}
                />
                <div
                  role="dialog"
                  aria-label={t('notifications')}
                  className="absolute end-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto glass rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="p-4 border-b border-hairline flex items-center justify-between sticky top-0 bg-surface-raised">
                    <p className="eyebrow">{t('notifications')}</p>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-semibold text-primary">{unreadCount} {t('unread')}</span>
                    )}
                  </div>
                  {notifLoading ? (
                    <div className="p-4">
                      <SkeletonRows rows={3} />
                    </div>
                  ) : notifError ? (
                    <div className="p-6 text-center">
                      <p className="text-[11px] text-text-faint">{notifError}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={refetchNotifications}>
                        <RefreshCw className="w-3 h-3 me-1.5" /> {t('retry')}
                      </Button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-surface border border-hairline flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-5 h-5 text-text-faint" />
                      </div>
                      <p className="text-xs text-text-faint font-medium">{t('caughtUp')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-hairline">
                      {notifications.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          busy={markingId === n.id}
                          onRead={() => handleMarkRead(n)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <Button onClick={() => setIsQrModalOpen(true)}>
            <QrCode className="w-4 h-4 me-2" />
            {t('myBadge')}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ═══════ Column 1 — Profile / Trust / QR ═══════ */}
        <div className="lg:col-span-1 space-y-8">
          {meLoading ? (
            <>
              <Card className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-2/3 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                </div>
              </Card>
              <Card className="space-y-3">
                <Skeleton className="w-1/3 h-3" />
                <Skeleton className="w-2/3 h-8" />
                <Skeleton className="w-full h-1.5 rounded-full" />
              </Card>
              <Card>
                <Skeleton className="w-full h-16 rounded-2xl" />
              </Card>
            </>
          ) : meError ? (
            <Card>
              <SectionError message={meError} onRetry={refetchMe} />
            </Card>
          ) : (
            <>
              {/* Profile card */}
              <Card className="relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <Avatar name={me?.name} verified={me?.isVerified} size={56} className="shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground truncate">{me?.name}</h2>
                    <p className="text-xs text-text-faint font-medium truncate">{me?.email}</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-hairline flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {me?.isVerified ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                        <span className="eyebrow text-success truncate">Identity verified</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4 text-text-faint shrink-0" />
                        <span className="eyebrow truncate">Not verified yet</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-text-faint shrink-0">
                    Since {formatDate(me?.createdAt)}
                  </span>
                </div>
              </Card>

              {/* Trust summary card */}
              <Card>
                <CardHeader>
                  <CardTitle>Trust network</CardTitle>
                </CardHeader>
                {me?.trustSummary.linked ? (
                  <>
                    <div className="flex items-end justify-between gap-3 mb-4">
                      <div>
                        <p className="text-3xl font-semibold tracking-tight text-foreground">
                          <span className="font-mono tabular">{me.trustSummary.globalScore.toFixed(1)}</span>
                          <span className="text-sm text-text-faint font-normal">/5</span>
                        </p>
                        <p className="eyebrow mt-1">
                          {me.trustSummary.reviewCount} review{me.trustSummary.reviewCount !== 1 ? 's' : ''} across
                          agencies
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
                          RISK_LEVEL_STYLES[me.trustSummary.riskLevel].chip,
                        )}
                      >
                        {RISK_LEVEL_STYLES[me.trustSummary.riskLevel].label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (me.trustSummary.globalScore / 5) * 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface border border-hairline flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-text-faint" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">No network history yet</p>
                      <p className="text-xs text-text-faint mt-1 leading-relaxed">
                        Once agencies review your rentals, your cross-agency trust score builds here.
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* My QR card — the physical-badge preview; opens the full ceremonial view */}
              <Card>
                <CardHeader>
                  <CardTitle>My QR</CardTitle>
                </CardHeader>
                {me?.qrHash ? (
                  <button onClick={() => setIsQrModalOpen(true)} className="w-full text-start group">
                    <div className="document w-full p-5 rounded-2xl transition-transform duration-300 group-hover:-translate-y-0.5">
                      <div className="flex items-center gap-2.5 opacity-60">
                        <QrCode className="w-4 h-4" strokeWidth={1.75} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Trust vault code</span>
                      </div>
                      <p className="mt-4 font-mono tabular text-sm tracking-[0.08em] truncate">
                        {me.qrHash.slice(0, 8)}…{me.qrHash.slice(-6)}
                      </p>
                      <p className="mt-3 text-[11px] font-medium opacity-50">
                        Show this at the agency counter
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-text-faint">
                      <QrCode className="w-5 h-5 shrink-0" />
                      <p className="text-xs font-medium">QR not yet provisioned</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      isLoading={isGeneratingQr}
                      onClick={handleGenerateQr}
                    >
                      Generate my QR
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Vault documents — its own loading state, so a slow docs fetch never
              blanks the profile / trust / QR cards above it. */}
          <Card>
            <CardHeader>
              <CardTitle>{t('documents')}</CardTitle>
            </CardHeader>
            {docsLoading ? (
              <SkeletonRows rows={2} />
            ) : docsError ? (
              <SectionError message={docsError} onRetry={refetchDocs} />
            ) : documents.length === 0 ? (
              <div className="flex items-start gap-3 py-1 text-text-faint">
                <FileText className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">{t('noDocuments')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-hairline"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {doc.label ?? scopeLabel(doc.type)}
                      </p>
                      <p className="eyebrow truncate mt-0.5">{scopeLabel(doc.type)}</p>
                    </div>
                    {doc.verified ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-faint">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 text-text-faint">
                  <Lock className="w-3 h-3 shrink-0" />
                  <p className="text-[11px] font-medium leading-relaxed">
                    Private to you. Agencies only see these after you approve a request in the Consent Center.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ═══════ Column 2-3 — Consent Center ═══════ */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  {t('consentRequests')}
                </CardTitle>
                <CardDescription className="mt-2 normal-case tracking-normal font-medium text-xs">
                  You control who sees your documents. Nothing is shared with an agency until you approve it here.
                </CardDescription>
              </div>
            </CardHeader>

            {consentLoading ? (
              <SkeletonRows rows={3} />
            ) : consentError ? (
              <SectionError message={consentError} onRetry={refetchConsent} />
            ) : grants.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={t('noConsent')}
                description="When an agency requests access to your documents, it will show up here for your approval — and only your approval."
              />
            ) : (
              <div className="space-y-6">
                {pendingGrants.length > 0 && (
                  <div className="space-y-3">
                    <p className="eyebrow text-warning flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Needs your review
                    </p>
                    {pendingGrants.map((g) => (
                      <ConsentGrantCard
                        key={g.id}
                        grant={g}
                        busy={actingId === g.id}
                        onApprove={() => handleApprove(g)}
                        onRevoke={() => handleDenyOrRevoke(g)}
                      />
                    ))}
                  </div>
                )}

                {otherGrants.length > 0 && (
                  <div className="space-y-3">
                    {pendingGrants.length > 0 && (
                      <p className="eyebrow pt-2 border-t border-hairline">Grant history</p>
                    )}
                    {otherGrants.map((g) => (
                      <ConsentGrantCard
                        key={g.id}
                        grant={g}
                        busy={actingId === g.id}
                        onRevoke={() => handleDenyOrRevoke(g)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ═══════ QR Modal — the ceremonial, physical-badge reveal ═══════ */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="My Trust Vault Code"
        description={me?.qrHash ? 'Show this at the agency counter' : undefined}
      >
        {me?.qrHash ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="document w-full p-8 rounded-[2rem] flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-50">Fider trust vault</span>
                <TrustSeal size={32} label="Identity verified" />
              </div>
              <QrCode className="w-16 h-16" strokeWidth={1.5} />
              <p className="font-mono tabular text-sm tracking-[0.15em] break-all">{me.qrHash}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyQr}>
              <Copy className="w-4 h-4 me-2" /> {copied ? 'Copied' : 'Copy Code'}
            </Button>
            <div className="w-full p-4 bg-surface border border-hairline rounded-2xl flex items-center gap-4">
              <Info className="w-5 h-5 text-text-faint shrink-0" />
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                Agency staff scan or enter this code to request access to your documents — nothing is shared until
                you approve it in the Consent Center.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-hairline flex items-center justify-center">
              <QrCode className="w-6 h-6 text-text-faint" />
            </div>
            <p className="text-sm font-semibold text-foreground">QR not yet provisioned</p>
            <p className="text-xs text-text-faint max-w-xs">
              Generate your Trust Vault code so agency staff can request access to your documents at the counter.
            </p>
            <Button isLoading={isGeneratingQr} onClick={handleGenerateQr}>
              Generate my QR
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Local presentational helpers ────────────────────────────────────────────

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('renterPortal');
  return (
    <div className="flex flex-col items-center text-center gap-3 py-10">
      <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
        <AlertTriangle className="w-5 h-5 text-danger" />
      </div>
      <p className="text-xs font-medium text-text-faint max-w-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5 me-2" /> {t('retry')}
      </Button>
    </div>
  );
}

function ConsentGrantCard({
  grant,
  busy,
  onApprove,
  onRevoke,
}: {
  grant: ConsentGrant;
  busy: boolean;
  onApprove?: () => void;
  onRevoke: () => void;
}) {
  const t = useTranslations('renterPortal');
  const style = CONSENT_STATUS_STYLES[grant.status];
  const isPending = grant.status === 'PENDING';
  const isApproved = grant.status === 'APPROVED';

  return (
    <Card
      variant="outline"
      className={cn('flex flex-col gap-4 border-hairline', isPending && 'border-warning/30 bg-warning/10')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={grant.agencyName ?? 'Unknown agency'} size={36} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{grant.agencyName ?? 'Unknown Agency'}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {grant.scope.map((s) => (
                <span
                  key={s}
                  className="eyebrow rounded-md border border-hairline bg-surface px-2 py-1"
                >
                  {scopeLabel(s)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
            style.chip,
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
          {style.label}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-hairline">
        <p className="eyebrow">
          {grant.status === 'PENDING' && `Requested ${formatDate(grant.requestedAt)}`}
          {grant.status === 'APPROVED' &&
            `Active until ${formatDate(grant.expiresAt)} · ${formatRelativeToNow(grant.expiresAt)}`}
          {grant.status === 'REVOKED' && `Revoked ${formatDate(grant.revokedAt)}`}
          {grant.status === 'EXPIRED' && `Expired ${formatDate(grant.expiresAt)}`}
        </p>

        {isPending && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              isLoading={busy}
              onClick={onRevoke}
              className="border-danger/20 text-danger hover:bg-danger/5"
            >
              <X className="w-3.5 h-3.5 me-1.5" /> {t('deny')}
            </Button>
            <Button size="sm" isLoading={busy} onClick={onApprove}>
              <Check className="w-3.5 h-3.5 me-1.5" /> {t('approve')}
            </Button>
          </div>
        )}
        {isApproved && (
          <Button
            variant="outline"
            size="sm"
            isLoading={busy}
            onClick={onRevoke}
            className="shrink-0 border-danger/20 text-danger hover:bg-danger/5 self-start sm:self-auto"
          >
            {t('revoke')}
          </Button>
        )}
      </div>
    </Card>
  );
}

function NotificationRow({
  notification,
  busy,
  onRead,
}: {
  notification: PortalNotification;
  busy: boolean;
  onRead: () => void;
}) {
  return (
    <button
      onClick={onRead}
      disabled={notification.read || busy}
      className={cn(
        'w-full text-start p-4 flex items-start gap-3 transition-colors hover:bg-surface-raised disabled:cursor-default disabled:hover:bg-transparent',
        !notification.read && 'bg-primary/[0.06]',
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', notification.read ? 'bg-transparent' : 'bg-primary')}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-semibold truncate', notification.read ? 'text-text-muted' : 'text-foreground')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-[11px] text-text-faint mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="eyebrow mt-1">
          {formatDateTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && !busy && (
        <span className="text-[9px] font-semibold text-primary uppercase tracking-wide shrink-0 mt-1">
          Mark read
        </span>
      )}
      {busy && (
        <div className="w-3 h-3 border-2 border-hairline border-t-text-muted rounded-full animate-spin shrink-0 mt-1" />
      )}
    </button>
  );
}
