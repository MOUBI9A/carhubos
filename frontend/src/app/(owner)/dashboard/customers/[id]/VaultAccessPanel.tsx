"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Lock,
  RefreshCw,
  ShieldCheck,
  Link2Off,
  Download,
  Loader2,
  AlertTriangle,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

const CONSENT_SCOPE_OPTIONS = [
  { value: 'CIN_FRONT', label: 'National ID — Front' },
  { value: 'CIN_BACK', label: 'National ID — Back' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'PASSPORT', label: 'Passport' },
] as const;

interface ConsentedDocument {
  id: string;
  type: string;
  label: string | null;
  storagePath: string | null;
  verified: boolean;
}

interface AccessGranted {
  grantId: string;
  scope: string[];
  expiresAt: string;
  documents: ConsentedDocument[];
}

type AccessState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'no-access' }
  | { kind: 'granted'; data: AccessGranted }
  | { kind: 'error'; message: string };

function formatExpiry(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return days <= 1 ? 'Expires today' : `Expires in ${days} days`;
}

function scopeLabel(type: string): string {
  return CONSENT_SCOPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function storageKey(customerId: string): string {
  return `fider:vault-consent-renter:${customerId}`;
}

function inviteUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/signup?invite=${token}`;
}

/**
 * Consent-gated Vault viewer, embedded in the customer detail page.
 *
 * `linkedUserId` (Customer.userId, R48) is the real, server-verified link
 * between this agency's Customer row and the renter's own portal account —
 * set either when the renter accepts a staff-issued claim invite, or via
 * their own identity-verification auto-match (POST /portal/verify-identity).
 * When it's set, every request below targets it directly: no manual code
 * entry, no misattribution risk (the identity check already happened
 * server-side, either from the invite token or the HMAC identity hash).
 *
 * When it's NOT set, this offers two paths: (a) generate a claim invite for
 * this specific customer (the safe, recommended default — the token itself
 * proves which Customer row it's for), or (b) the older manual "Trust Vault
 * code" bridge, kept as a fallback for renters who already have an account
 * but haven't claimed this row yet and don't want to wait on an invite.
 * Path (b) still carries the identity-mismatch risk flagged by audit
 * 2026-07-26 #1 (nothing proves staff pasted the right renter's code), so it
 * keeps its own warning; path (a) doesn't need one.
 */
export function VaultAccessPanel({
  customerId,
  customerName,
  customerIdentity,
  linkedUserId,
}: {
  customerId: string;
  customerName: string;
  customerIdentity: string;
  linkedUserId?: string | null;
}) {
  const { showToast } = useToast();
  const [bridgedUserId, setBridgedUserId] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showQrFallback, setShowQrFallback] = useState(false);
  const [access, setAccess] = useState<AccessState>({ kind: 'idle' });
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const renterUserId = linkedUserId ?? bridgedUserId;

  useEffect(() => {
    if (linkedUserId) return; // real link takes priority — no need to read the bridge
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey(customerId)) : null;
    setBridgedUserId(stored);
  }, [customerId, linkedUserId]);

  const checkAccess = useCallback(async (uid: string) => {
    setAccess({ kind: 'loading' });
    try {
      const res = await api.get<AccessGranted>(`/agency/consent/documents/${uid}`);
      setAccess({ kind: 'granted', data: res.data });
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setAccess({ kind: 'no-access' });
      } else {
        setAccess({
          kind: 'error',
          message: err?.response?.data?.message || 'Could not check document access.',
        });
      }
    }
  }, []);

  useEffect(() => {
    if (renterUserId) checkAccess(renterUserId);
  }, [renterUserId, checkAccess]);

  const toggleScope = (value: string) => {
    setScope((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleSendInvite = async () => {
    setIsInviting(true);
    try {
      const res = await api.post<{ token: string }>(`/customers/${customerId}/invite`);
      setInviteToken(res.data.token);
    } catch (err: any) {
      showToast(
        'danger',
        'Could Not Create Invite',
        err?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteToken) return;
    await navigator.clipboard.writeText(inviteUrl(inviteToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestAccessLinked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedUserId) return;
    if (scope.length === 0) {
      setRequestError('Select at least one document type.');
      return;
    }
    setIsRequesting(true);
    setRequestError(null);
    try {
      await api.post('/agency/consent/request', { renterUserId: linkedUserId, scope });
      setShowRequestForm(false);
      setScope([]);
      showToast('success', 'Request Sent', "Waiting for the renter's approval in their portal.");
      await checkAccess(linkedUserId);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 409
          ? 'A matching request is already pending or active.'
          : err?.response?.data?.message || 'Could not send the request.';
      setRequestError(Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequestAccessBridged = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) {
      setRequestError("Enter the renter's Trust Vault code.");
      return;
    }
    if (scope.length === 0) {
      setRequestError('Select at least one document type.');
      return;
    }
    setIsRequesting(true);
    setRequestError(null);
    try {
      const res = await api.post<{ grantorUserId: string }>('/agency/consent/request', {
        qrHash: qrInput.trim(),
        scope,
      });
      const uid = res.data.grantorUserId;
      window.localStorage.setItem(storageKey(customerId), uid);
      setBridgedUserId(uid);
      setShowRequestForm(false);
      setQrInput('');
      setScope([]);
      showToast('success', 'Request Sent', "Waiting for the renter's approval in their portal.");
      await checkAccess(uid);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 404
          ? 'No renter found with that code.'
          : status === 409
            ? 'A matching request is already pending or active.'
            : err?.response?.data?.message || 'Could not send the request.';
      setRequestError(Array.isArray(msg) ? msg.join(' ') : String(msg));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleUnlinkBridge = () => {
    window.localStorage.removeItem(storageKey(customerId));
    setBridgedUserId(null);
    setAccess({ kind: 'idle' });
    setShowRequestForm(false);
  };

  const handleViewDocument = async (doc: ConsentedDocument) => {
    if (!renterUserId || !doc.storagePath) return;
    setViewingDocId(doc.id);
    try {
      const res = await api.get<{ url: string }>(
        `/agency/consent/documents/${renterUserId}/${doc.id}/download-url`,
      );
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      showToast(
        'danger',
        'View Failed',
        err?.response?.data?.message || 'Could not generate a download link.',
      );
    } finally {
      setViewingDocId(null);
    }
  };

  const scopePicker = (
    <div className="space-y-1.5">
      <p className="eyebrow px-1">Documents to request</p>
      <div className="grid grid-cols-2 gap-2">
        {CONSENT_SCOPE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition-colors',
              scope.includes(opt.value)
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-hairline text-text-muted hover:bg-surface-raised',
            )}
          >
            <input
              type="checkbox"
              checked={scope.includes(opt.value)}
              onChange={() => toggleScope(opt.value)}
              disabled={isRequesting}
              className="accent-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );

  const requestErrorBlock = requestError && (
    <div className="flex items-start gap-2 px-1">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-danger" />
      <p className="text-xs text-danger">{requestError}</p>
    </div>
  );

  // ── Linked (real Customer.userId) — no manual entry needed ─────────────
  const linkedRequestForm = (
    <form onSubmit={handleRequestAccessLinked} className="space-y-4">
      {scopePicker}
      {requestErrorBlock}
      <Button type="submit" size="sm" className="w-full" isLoading={isRequesting}>
        {isRequesting ? 'Sending...' : 'Request access'}
      </Button>
    </form>
  );

  // ── Not linked — invite (primary) + QR bridge (fallback) ───────────────
  const inviteAndBridge = (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Send className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground leading-relaxed">
            Send <strong className="font-semibold">{customerName}</strong> a link to claim this
            record from their own portal — safer than a manually-entered code, no risk of
            attaching the wrong renter&apos;s documents.
          </p>
        </div>
        {inviteToken ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface border border-hairline">
            <input
              readOnly
              value={inviteUrl(inviteToken)}
              className="flex-1 min-w-0 bg-transparent text-xs font-mono tabular text-text-muted outline-none"
            />
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 shrink-0" onClick={handleCopyInvite} aria-label="Copy invite link">
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={handleSendInvite} isLoading={isInviting}>
            <Send className="w-3.5 h-3.5 me-1.5" /> Generate claim link
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowQrFallback((v) => !v)}
        className="text-[11px] font-medium text-text-faint hover:text-text-muted transition-colors"
      >
        {showQrFallback ? 'Hide' : 'Already have a Trust Vault code?'}
      </button>

      {showQrFallback && (
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[11px] text-warning leading-relaxed">
              Fider cannot verify a Trust Vault code belongs to this client — confirm the
              renter&apos;s identity matches <strong className="font-semibold">{customerName}</strong> (
              {customerIdentity}) in person before relying on any documents shown below.
            </p>
          </div>
          <form onSubmit={handleRequestAccessBridged} className="space-y-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Renter&apos;s Trust Vault code</p>
              <input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                disabled={isRequesting}
                placeholder="Scan or paste the code"
                className="w-full bg-surface border border-hairline rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint"
              />
            </div>
            {scopePicker}
            {requestErrorBlock}
            <Button type="submit" size="sm" className="w-full" isLoading={isRequesting}>
              {isRequesting ? 'Sending...' : 'Request access'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="p-0 mb-5 items-start">
        <div>
          <CardTitle>Digital vault access</CardTitle>
          <CardDescription className="mt-1">
            {linkedUserId
              ? 'Consent-gated documents from the renter’s own portal — verified account link'
              : 'Consent-gated documents from the renter’s own portal'}
          </CardDescription>
        </div>
        {!linkedUserId && bridgedUserId && (
          <Button variant="ghost" size="sm" onClick={handleUnlinkBridge} aria-label="Unlink renter">
            <Link2Off className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardHeader>

      {!renterUserId ? (
        inviteAndBridge
      ) : access.kind === 'loading' ? (
        <SkeletonRows rows={2} />
      ) : access.kind === 'no-access' ? (
        <div className="space-y-4">
          <EmptyState
            icon={Lock}
            title="No active consent"
            description="Either the renter hasn't approved this request yet, or it expired. They approve access from their own portal."
            action={
              <Button variant="outline" size="sm" onClick={() => checkAccess(renterUserId)}>
                <RefreshCw className="w-3.5 h-3.5 me-1.5" /> Refresh
              </Button>
            }
          />
          {showRequestForm ? (
            linkedUserId ? linkedRequestForm : inviteAndBridge
          ) : (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowRequestForm(true)}>
              Request a different scope
            </Button>
          )}
        </div>
      ) : access.kind === 'error' ? (
        <div className="text-center py-6">
          <p className="text-sm text-danger">{access.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => checkAccess(renterUserId)}>
            Retry
          </Button>
        </div>
      ) : access.kind === 'granted' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-success text-[11px] font-semibold uppercase tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" /> {formatExpiry(access.data.expiresAt)}
          </div>
          {access.data.documents.length === 0 ? (
            <div className="flex items-start gap-3 py-1 text-text-faint">
              <FileText className="w-5 h-5 shrink-0" />
              <p className="text-xs font-medium">No documents in the consented scope yet.</p>
            </div>
          ) : (
            access.data.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-hairline">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {doc.label ?? scopeLabel(doc.type)}
                  </p>
                  <p className="eyebrow truncate mt-0.5">{scopeLabel(doc.type)}</p>
                </div>
                {doc.storagePath && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 shrink-0"
                    disabled={viewingDocId === doc.id}
                    onClick={() => handleViewDocument(doc)}
                    aria-label={`View ${doc.label ?? scopeLabel(doc.type)} file`}
                  >
                    {viewingDocId === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-text-muted" />
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}
    </Card>
  );
}
