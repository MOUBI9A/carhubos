"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Lock, RefreshCw, ShieldCheck, Link2Off, Download, Loader2, AlertTriangle } from 'lucide-react';
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

/**
 * Consent-gated Vault viewer, embedded in the customer detail page. There is
 * no schema link between the agency's own `Customer` record and a portal
 * `User` (RenterDocument/ConsentGrant are keyed on `User.id`, resolved via
 * `qrHash` or `renterUserId` — see backend/src/consent/dto/consent.dto.ts) —
 * this is a real gap the founder's "Customer" framing didn't anticipate
 * (same shape as R42's cars/customers correction). Bridging it with a real
 * `Customer.linkedRenterUserId` column is a schema/product decision, not
 * mine to make unasked, so this panel bridges it client-side instead: staff
 * enter the renter's Trust Vault code once, the resolved renterUserId is
 * cached in localStorage per customerId, and every read/write below still
 * goes through the real consent-gated endpoints (never bypasses the grant).
 *
 * That bridge has no identity cross-check: nothing stops staff from pasting
 * the wrong renter's code onto this customer's page (easy at a busy desk),
 * which would silently show a DIFFERENT person's private documents here —
 * not a server-side authz bypass (the grant itself is real), but a real
 * PII-misattribution risk (flagged by audit 2026-07-26, finding #1). There
 * is no safe way to auto-verify this without a schema link or a new
 * cross-agency "look up any user" endpoint (itself a PII-leak risk this
 * codebase's 404-not-403 convention exists to avoid) — both are product/
 * schema calls, not mine to make unasked. The mitigation available at this
 * layer: always show the Customer's own identity next to the panel so staff
 * manually confirm the match before trusting anything below it.
 */
export function VaultAccessPanel({
  customerId,
  customerName,
  customerIdentity,
}: {
  customerId: string;
  customerName: string;
  customerIdentity: string;
}) {
  const { showToast } = useToast();
  const [renterUserId, setRenterUserId] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [access, setAccess] = useState<AccessState>({ kind: 'idle' });
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey(customerId)) : null;
    setRenterUserId(stored);
  }, [customerId]);

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

  const handleRequestAccess = async (e: React.FormEvent) => {
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
      setRenterUserId(uid);
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

  const handleUnlink = () => {
    window.localStorage.removeItem(storageKey(customerId));
    setRenterUserId(null);
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

  const requestForm = (
    <form onSubmit={handleRequestAccess} className="space-y-4">
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
      {requestError && (
        <div className="flex items-start gap-2 px-1">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-danger" />
          <p className="text-xs text-danger">{requestError}</p>
        </div>
      )}
      <Button type="submit" size="sm" className="w-full" isLoading={isRequesting}>
        {isRequesting ? 'Sending...' : 'Request access'}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader className="p-0 mb-5 items-start">
        <div>
          <CardTitle>Digital vault access</CardTitle>
          <CardDescription className="mt-1">Consent-gated documents from the renter&apos;s own portal</CardDescription>
        </div>
        {renterUserId && (
          <Button variant="ghost" size="sm" onClick={handleUnlink} aria-label="Unlink renter">
            <Link2Off className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardHeader>

      <div className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-warning/10 border border-warning/20">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-[11px] text-warning leading-relaxed">
          Fider cannot verify a Trust Vault code belongs to this client — confirm the renter's identity matches{' '}
          <strong className="font-semibold">{customerName}</strong> ({customerIdentity}) in person before relying on
          any documents shown below.
        </p>
      </div>

      {!renterUserId ? (
        requestForm
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
            requestForm
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
