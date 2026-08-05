"use client";

import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import {
  useVaultFiles,
  VaultFile,
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from './useVaultFiles';

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG image',
  'image/png': 'PNG image',
  'image/webp': 'WebP image',
};

function formatMimeType(mimeType: string): string {
  return MIME_LABELS[mimeType] ?? mimeType;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** Client-side mirror of the backend's validation, so a bad file is rejected
 *  before it ever leaves the browser — saves bandwidth and gives the user
 *  instant feedback instead of a round-trip 400. The server re-validates
 *  independently (never trust a client-side check as the real boundary). */
function validateFile(file: File): string | null {
  if (!VAULT_ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return `Unsupported file type "${file.type || 'unknown'}". Allowed: PDF, JPEG, PNG, WebP.`;
  }
  if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
    return `File exceeds the ${VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`;
  }
  return null;
}

export default function VaultFilesPage() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const { data: files, isLoading, error, refetch } = useVaultFiles();

  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VaultFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    if (!search.trim()) return files;
    const q = search.trim().toLowerCase();
    return files.filter((f) => f.filename.toLowerCase().includes(q));
  }, [files, search]);

  const handleFileSelected = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        showToast('danger', 'Invalid file', validationError);
        return;
      }

      setIsUploading(true);
      setStorageUnavailable(false);
      try {
        const formData = new FormData();
        formData.append('file', file);
        await api.post('/vault/files', formData);
        showToast('success', 'File uploaded', `${file.name} was added to the vault.`);
        await refetch();
      } catch (err: any) {
        if (err?.response?.status === 503) {
          // The founder's Supabase keys may not have loaded yet — surface
          // this distinctly from a generic failure rather than a one-line
          // toast that's easy to miss.
          setStorageUnavailable(true);
          showToast(
            'danger',
            'Vault storage not configured',
            'File storage isn’t connected yet. Try again in a moment.',
          );
        } else {
          showToast(
            'danger',
            'Upload failed',
            err?.response?.data?.message || 'Could not upload this file.',
          );
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [refetch, showToast],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  const handleDownload = async (file: VaultFile) => {
    setDownloadingId(file.id);
    try {
      const res = await api.get<{ url: string }>(`/vault/files/${file.id}/download-url`);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      if (err?.response?.status === 503) {
        setStorageUnavailable(true);
        showToast('danger', 'Vault storage not configured', 'File storage isn’t connected yet.');
      } else {
        showToast('danger', 'Download failed', err?.response?.data?.message || 'Could not generate a download link.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/vault/files/${pendingDelete.id}`);
      showToast('info', 'File removed', `${pendingDelete.filename} was deleted.`);
      setPendingDelete(null);
      await refetch();
    } catch (err: any) {
      showToast('danger', 'Delete failed', err?.response?.data?.message || 'Could not delete this file.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('vaultFiles')}</h1>
        <p className="mt-1.5 text-sm text-text-muted">{t('agencyWideStorage')}</p>
      </header>

      {storageUnavailable && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning">
            Vault storage isn&apos;t configured yet — uploads and downloads will fail until it is. This isn&apos;t an error in your files; nothing was lost.
          </p>
        </div>
      )}

      {/* Upload dropzone */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-hairline',
        )}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="p-8 text-center cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={VAULT_ALLOWED_MIME_TYPES.join(',')}
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-sm font-medium text-foreground">{t('addingEllipsis')}</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-text-faint mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">{t('dragDropFile')}</p>
              <p className="mt-1 text-xs text-text-faint">
                PDF, JPEG, PNG or WebP — up to {VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB
              </p>
            </>
          )}
        </div>
      </Card>

      {/* File list */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-hairline flex items-center gap-4">
          <Search className="w-4 h-4 text-text-faint shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchFilesByName')}
            className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-text-faint"
          />
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonRows rows={5} />
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>{t('retry')}</Button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={files && files.length === 0 ? t('noFilesYet') : 'No matches'}
            description={
              files && files.length === 0
                ? 'Upload your first file to start building your vault.'
                : 'Try a different search.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="eyebrow px-6 py-3 text-start">{t('filenameHeader')}</th>
                  <th className="eyebrow px-6 py-3 text-start">{t('typeHeader')}</th>
                  <th className="eyebrow px-6 py-3 text-start">{t('sizeHeader')}</th>
                  <th className="eyebrow px-6 py-3 text-start">{t('uploadedHeader')}</th>
                  <th className="eyebrow px-6 py-3 text-end">{t('actionsHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => {
                  const Icon = isImage(file.mimeType) ? ImageIcon : FileText;
                  return (
                    <tr key={file.id} className="border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-hairline bg-surface-raised">
                            <Icon className="w-5 h-5 text-text-muted" />
                          </div>
                          <p className="text-sm font-medium text-foreground truncate max-w-xs">{file.filename}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-muted">{formatMimeType(file.mimeType)}</td>
                      <td className="px-6 py-4 font-mono tabular text-text-muted">{formatFileSize(file.sizeBytes)}</td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(file.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            disabled={downloadingId === file.id}
                            onClick={() => handleDownload(file)}
                            aria-label={`Download ${file.filename}`}
                          >
                            {downloadingId === file.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                            ) : (
                              <Download className="w-4 h-4 text-text-muted" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPendingDelete(file)}
                            aria-label={`Delete ${file.filename}`}
                          >
                            <Trash2 className="w-4 h-4 text-text-faint hover:text-danger" />
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

      {/* Delete confirmation */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete file"
        description={t('cannotBeUndone')}
      >
        {pendingDelete && (
          <div className="space-y-6">
            <p className="text-sm text-text-muted">
              <span className="text-foreground font-medium">{pendingDelete.filename}</span> will be permanently
              removed from the vault.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>{t('cancel')}</Button>
              <Button variant="danger" className="flex-1" isLoading={isDeleting} onClick={handleDelete}>
                <Trash2 className="w-4 h-4 me-2" />
                {t('deleteFileModal')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
