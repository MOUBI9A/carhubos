"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">My Digital Vault</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
            {meLoading ? (
              <span className="inline-block w-40 h-3 bg-white/5 rounded animate-pulse" />
            ) : me?.isVerified ? (
              <>
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Verified Renter
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-white/20" />
                Verification Pending
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen((o) => !o)}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              aria-expanded={isNotifOpen}
              className="relative w-11 h-11 rounded-xl glass flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[9px] font-black flex items-center justify-center border-2 border-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsNotifOpen(false)}
                  aria-label="Close notifications"
                />
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto glass rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-card/80 backdrop-blur-sm">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-primary">{unreadCount} unread</span>
                    )}
                  </div>
                  {notifLoading ? (
                    <div className="p-4">
                      <SkeletonRows rows={3} />
                    </div>
                  ) : notifError ? (
                    <div className="p-6 text-center">
                      <p className="text-[11px] text-white/40">{notifError}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={refetchNotifications}>
                        <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
                      </Button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-white/30 font-medium">You&apos;re all caught up</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
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
            <QrCode className="w-4 h-4 mr-2" />
            My Badge
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
                  <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-2/3 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                </div>
              </Card>
              <Card variant="outline" className="space-y-3">
                <Skeleton className="w-1/3 h-3" />
                <Skeleton className="w-2/3 h-8" />
                <Skeleton className="w-full h-1.5 rounded-full" />
              </Card>
              <Card variant="outline">
                <Skeleton className="w-full h-16 rounded-2xl" />
              </Card>
            </>
          ) : meError ? (
            <Card variant="outline">
              <SectionError message={meError} onRetry={refetchMe} />
            </Card>
          ) : (
            <>
              {/* Profile card */}
              <Card className="relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-black text-primary shrink-0">
                    {me?.name?.[0]?.toUpperCase() ?? 'R'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-white truncate">{me?.name}</h2>
                    <p className="text-xs text-white/40 font-medium truncate">{me?.email}</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {me?.isVerified ? (
                      <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-white/30 shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase tracking-widest truncate',
                        me?.isVerified ? 'text-success' : 'text-white/40',
                      )}
                    >
                      {me?.isVerified ? 'Identity Verified' : 'Not Verified Yet'}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-white/30 shrink-0">
                    Since {formatDate(me?.createdAt)}
                  </span>
                </div>
              </Card>

              {/* Trust summary card */}
              <Card variant="outline">
                <CardHeader>
                  <CardTitle>Trust Network</CardTitle>
                </CardHeader>
                {me?.trustSummary.linked ? (
                  <>
                    <div className="flex items-end justify-between gap-3 mb-4">
                      <div>
                        <p className="text-3xl font-black text-white">
                          {me.trustSummary.globalScore.toFixed(1)}
                          <span className="text-sm text-white/30 font-bold">/5</span>
                        </p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                          {me.trustSummary.reviewCount} review{me.trustSummary.reviewCount !== 1 ? 's' : ''} across
                          agencies
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                          RISK_LEVEL_STYLES[me.trustSummary.riskLevel].chip,
                        )}
                      >
                        {RISK_LEVEL_STYLES[me.trustSummary.riskLevel].label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (me.trustSummary.globalScore / 5) * 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-white/20 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white/60">No network history yet</p>
                      <p className="text-[11px] text-white/30 mt-1 leading-relaxed">
                        Once agencies review your rentals, your cross-agency trust score builds here.
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* My QR card */}
              <Card variant="outline">
                <CardHeader>
                  <CardTitle>My QR</CardTitle>
                </CardHeader>
                {me?.qrHash ? (
                  <button onClick={() => setIsQrModalOpen(true)} className="w-full text-left group">
                    <div className="w-full bg-white/[0.03] p-5 rounded-2xl border border-white/5 group-hover:border-primary/30 group-hover:bg-white/[0.05] transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <QrCode className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-mono text-xs text-white/70 tracking-wider truncate">
                          {me.qrHash.slice(0, 8)}…{me.qrHash.slice(-6)}
                        </p>
                      </div>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Show this at the agency counter
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 py-1 text-white/30">
                    <QrCode className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-medium">QR not yet provisioned</p>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Vault documents — its own loading state, so a slow docs fetch never
              blanks the profile / trust / QR cards above it. */}
          <Card variant="outline">
            <CardHeader>
              <CardTitle>My Documents</CardTitle>
            </CardHeader>
            {docsLoading ? (
              <SkeletonRows rows={2} />
            ) : docsError ? (
              <SectionError message={docsError} onRetry={refetchDocs} />
            ) : documents.length === 0 ? (
              <div className="flex items-start gap-3 py-1 text-white/30">
                <FileText className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">No documents in your vault yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {doc.label ?? scopeLabel(doc.type)}
                      </p>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest truncate">
                        {scopeLabel(doc.type)}
                      </p>
                    </div>
                    {doc.verified ? (
                      <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-success">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-white/30">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 text-white/30">
                  <Lock className="w-3 h-3 shrink-0" />
                  <p className="text-[10px] font-medium leading-relaxed">
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
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Consent Center
                </CardTitle>
                <CardDescription className="mt-2 normal-case tracking-normal text-white/40 font-medium text-xs">
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
                title="No Consent Requests Yet"
                description="When an agency requests access to your documents, it will show up here for your approval — and only your approval."
              />
            ) : (
              <div className="space-y-6">
                {pendingGrants.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Needs Your Review
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
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest pt-2 border-t border-white/5">
                        Grant History
                      </p>
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

      {/* ═══════ QR Modal ═══════ */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="My Trust Vault Code"
        description={me?.qrHash ? 'Show this at the agency counter' : undefined}
      >
        {me?.qrHash ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-full p-8 bg-white/[0.03] border border-white/10 rounded-[2rem] flex flex-col items-center gap-4">
              <QrCode className="w-16 h-16 text-primary" strokeWidth={1.5} />
              <p className="font-mono text-sm text-white tracking-[0.15em] break-all text-center">{me.qrHash}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyQr}>
              <Copy className="w-4 h-4 mr-2" /> {copied ? 'Copied' : 'Copy Code'}
            </Button>
            <div className="w-full p-4 glass rounded-2xl border-white/10 flex items-center gap-4">
              <Info className="w-5 h-5 text-white/40 shrink-0" />
              <p className="text-[10px] font-medium text-white/60 leading-relaxed uppercase tracking-wider">
                Agency staff scan or enter this code to request access to your documents — nothing is shared until
                you approve it in the Consent Center.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <QrCode className="w-12 h-12 text-white/15" />
            <p className="text-sm font-bold text-white/50">QR not yet provisioned</p>
            <p className="text-xs text-white/30 max-w-xs">
              Your Trust Vault code will appear here once your agency verifies your identity.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Local presentational helpers ────────────────────────────────────────────

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-10">
      <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
        <AlertTriangle className="w-5 h-5 text-danger" />
      </div>
      <p className="text-xs font-medium text-white/40 max-w-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
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
  const style = CONSENT_STATUS_STYLES[grant.status];
  const isPending = grant.status === 'PENDING';
  const isApproved = grant.status === 'APPROVED';

  return (
    <Card
      variant="outline"
      className={cn('flex flex-col gap-4', isPending && 'border-amber-500/30 bg-amber-500/[0.03]')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-white truncate">{grant.agencyName ?? 'Unknown Agency'}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {grant.scope.map((s) => (
              <span
                key={s}
                className="text-[9px] font-bold uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 px-2 py-1 rounded-md"
              >
                {scopeLabel(s)}
              </span>
            ))}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
            style.chip,
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
          {style.label}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
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
              <X className="w-3.5 h-3.5 mr-1.5" /> Deny
            </Button>
            <Button size="sm" isLoading={busy} onClick={onApprove}>
              <Check className="w-3.5 h-3.5 mr-1.5" /> Approve
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
            Revoke Access
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
        'w-full text-left p-4 flex items-start gap-3 transition-colors hover:bg-white/[0.03] disabled:cursor-default disabled:hover:bg-transparent',
        !notification.read && 'bg-primary/[0.03]',
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', notification.read ? 'bg-transparent' : 'bg-primary')}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-bold truncate', notification.read ? 'text-white/50' : 'text-white')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-[11px] text-white/30 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-1">
          {formatDateTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && !busy && (
        <span className="text-[8px] font-black text-primary uppercase tracking-widest shrink-0 mt-1">
          Mark Read
        </span>
      )}
      {busy && (
        <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin shrink-0 mt-1" />
      )}
    </button>
  );
}
