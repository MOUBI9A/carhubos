"use client";

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck, FileText, Upload, Eye, Download, Search, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

type DocStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

interface VaultDocument {
  id: string;
  type: string;
  status: DocStatus;
  expiryDate: string;
  issueDate?: string | null;
  fileUrl?: string | null;
  carId: string;
  car: { brand: string; model: string; licensePlate: string };
}

interface VehicleOption {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
}

const DOC_TYPES = [
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TECHNICAL_INSPECTION', label: 'Technical inspection' },
  { value: 'VIGNETTE', label: 'Vignette' },
  { value: 'CARTE_GRISE', label: 'Carte grise' },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t.label]));

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function expiryLabel(doc: VaultDocument): string {
  if (doc.status === 'EXPIRED') return 'Expired';
  const days = daysUntil(doc.expiryDate);
  if (days <= 0) return 'Expired';
  return `${days} day${days === 1 ? '' : 's'}`;
}

const STATUS_STYLES: Record<DocStatus, { icon: string; text: string; label: string }> = {
  VALID: { icon: 'bg-success/10 text-success border-success/20', text: 'text-success', label: 'valid' },
  EXPIRING_SOON: { icon: 'bg-warning/10 text-warning border-warning/20', text: 'text-warning', label: 'expiring soon' },
  EXPIRED: { icon: 'bg-danger/10 text-danger border-danger/20', text: 'text-danger', label: 'expired' },
};

export default function GuardianVault() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [docsRes, carsRes] = await Promise.all([
        api.get<VaultDocument[]>('/documents'),
        api.get<VehicleOption[]>('/cars'),
      ]);
      setDocuments(docsRes.data);
      setVehicles(carsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load compliance documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: documents.length,
      expiring: documents.filter((d) => d.status === 'EXPIRING_SOON').length,
      expired: documents.filter((d) => d.status === 'EXPIRED').length,
    }),
    [documents],
  );

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (filter === 'expiring' && doc.status !== 'EXPIRING_SOON') return false;
      if (filter === 'expired' && doc.status !== 'EXPIRED') return false;
      if (search) {
        const haystack = `${doc.car.brand} ${doc.car.model} ${doc.car.licensePlate} ${TYPE_LABELS[doc.type] ?? doc.type}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [documents, filter, search]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const carId = String(formData.get('carId') || '');
    const type = String(formData.get('type') || '');
    const expiryDate = String(formData.get('expiryDate') || '');

    if (!carId || !type || !expiryDate) {
      showToast('danger', 'Missing fields', 'Select a vehicle, document type and expiry date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/documents', { carId, type, expiryDate });
      showToast('success', 'Document recorded', 'The compliance record was added to the vault.');
      setIsUploadModalOpen(false);
      await load();
    } catch (err: any) {
      showToast('danger', 'Save failed', err?.response?.data?.message || 'Could not record the document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('guardianVault')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{t('fleetComplianceDocuments')}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => showToast('info', 'Not available yet', 'A document change history isn’t built yet.')}
          >
            <History className="w-4 h-4 me-2" />
            {t('archive')}
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 me-2" />
            {t('newUpload')}
          </Button>
        </div>
      </header>

      {/* Summary HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => setFilter('all')} className={cn("rounded-2xl bg-surface border border-hairline p-6 text-start transition-all hover:bg-surface-raised", filter === 'all' && "ring-1 ring-primary/40")}>
           <p className="eyebrow mb-2">{t('allDocuments')}</p>
           <p className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">{counts.all}</p>
        </button>
        <button onClick={() => setFilter('expiring')} className={cn("rounded-2xl bg-surface border border-hairline p-6 text-start transition-all hover:bg-surface-raised", filter === 'expiring' && "ring-1 ring-primary/40")}>
           <p className="eyebrow text-warning mb-2">{t('expiringDocuments')}</p>
           <p className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">{counts.expiring}</p>
        </button>
        <button onClick={() => setFilter('expired')} className={cn("rounded-2xl bg-surface border border-hairline p-6 text-start transition-all hover:bg-surface-raised", filter === 'expired' && "ring-1 ring-primary/40")}>
           <p className="eyebrow text-danger mb-2">{t('expiredDocuments')}</p>
           <p className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">{counts.expired}</p>
        </button>
      </div>

      {/* Document List */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-hairline flex items-center justify-between">
           <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="w-4 h-4 text-text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchAssetDocumentType')}
                className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-text-faint"
              />
           </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonRows rows={5} />
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={load}>{t('retry')}</Button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={documents.length === 0 ? t('allDocuments') : 'No matches'}
            description={
              documents.length === 0
                ? 'Upload your first compliance document to start tracking expiries.'
                : 'Try a different search or filter.'
            }
          />
        ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th className="eyebrow px-6 py-3 text-start">{t('documentHeader')}</th>
              <th className="eyebrow px-6 py-3 text-start">{t('vehicleHeader')}</th>
              <th className="eyebrow px-6 py-3 text-start">{t('validityHeader')}</th>
              <th className="eyebrow px-6 py-3 text-end">{t('actionsHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => {
              const style = STATUS_STYLES[doc.status];
              return (
              <tr key={doc.id} className="border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", style.icon)}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{TYPE_LABELS[doc.type] ?? doc.type}</p>
                      <p className="mt-0.5 text-xs text-text-faint">{doc.fileUrl ? doc.fileUrl.split('/').pop() : 'No file attached'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div>
                      <p className="text-sm font-medium text-foreground">{doc.car.brand} {doc.car.model}</p>
                      <p className="mt-0.5 font-mono tabular text-xs text-text-faint">{doc.car.licensePlate}</p>
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-col">
                      <span className={cn("text-xs font-medium", style.text)}>{expiryLabel(doc)}</span>
                      <span className="eyebrow mt-0.5">{style.label}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-end">
                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="w-4 h-4 text-text-muted" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => {
                          if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
                          else showToast('info', 'No file attached', 'This document has no file to download yet.');
                        }}
                      >
                        <Download className="w-4 h-4 text-text-muted" />
                      </Button>
                   </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload document"
        description="Link a compliance record to a vehicle"
      >
        <form onSubmit={handleUpload} className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">{t('selectVehicleLabel')}</p>
                 <select name="carId" required defaultValue="" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors">
                    <option value="" disabled>{t('selectVehicleEllipsis')}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>
                    ))}
                 </select>
              </div>
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">{t('selectTypeLabel')}</p>
                 <select name="type" required defaultValue="" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors">
                    <option value="" disabled>{t('selectTypeEllipsis')}</option>
                    {DOC_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                 </select>
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="eyebrow px-1">{t('expiryDateLabel')}</p>
              <input name="expiryDate" type="date" required className="w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors" />
           </div>
           <div className="border-2 border-dashed border-hairline rounded-2xl p-8 text-center">
              <Upload className="w-8 h-8 text-text-faint mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">File upload isn&apos;t wired yet</p>
              <p className="mt-1 text-xs text-text-faint">{t('recordSavedNoFile')}</p>
           </div>
           <Button type="submit" className="w-full" isLoading={isSubmitting}>{t('saveRecord')}</Button>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={t('documentPreview')}
        description={selectedDoc ? `${TYPE_LABELS[selectedDoc.type] ?? selectedDoc.type} • ${selectedDoc.car.licensePlate}` : undefined}
      >
        <div className="space-y-6">
           <div className="document relative aspect-[3/4] rounded-2xl flex items-center justify-center">
              <FileText className="w-16 h-16 opacity-10" />
              <p className="absolute text-xs font-medium tracking-wide opacity-50">
                {selectedDoc?.fileUrl ? 'Document preview' : 'No file attached'}
              </p>
           </div>
           <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedDoc(null)}>{t('close')}</Button>
              <Button
                className="flex-1"
                disabled={!selectedDoc?.fileUrl}
                onClick={() => selectedDoc?.fileUrl && window.open(selectedDoc.fileUrl, '_blank', 'noopener,noreferrer')}
              >
                 <Download className="w-4 h-4 me-2" />
                 {t('documentDownloadAction')}
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
