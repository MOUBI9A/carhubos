"use client";

import React, { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { UploadCloud, FileText, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { VAULT_ALLOWED_MIME_TYPES, VAULT_MAX_FILE_SIZE_BYTES, validateVaultFile } from '@/lib/vault';
import { RENTER_DOCUMENT_TYPES, scopeLabel } from './types';

const inputCls =
  'w-full bg-surface border border-hairline rounded-2xl px-4 py-3.5 text-sm font-medium text-foreground outline-none focus:border-primary transition-all placeholder:text-text-faint';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

/**
 * Unlike the Guardian Vault attachment flow (upload first, link a
 * vaultFileId second), a renter document is a single atomic POST — type +
 * optional label + file all go to /portal/documents in one multipart
 * request, since RenterDocument doesn't go through the agency VaultFile
 * table at all (see consent.service.ts / R42).
 */
export function UploadDocumentModal({ isOpen, onClose, onUploaded }: UploadDocumentModalProps) {
  const [type, setType] = useState<string>(RENTER_DOCUMENT_TYPES[0]);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setType(RENTER_DOCUMENT_TYPES[0]);
    setLabel('');
    setFile(null);
    setError(null);
    setStorageUnavailable(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelected = (selected: File | undefined | null) => {
    if (!selected) return;
    const validationError = validateVaultFile(selected);
    if (validationError) {
      setError(validationError);
      setStorageUnavailable(false);
      return;
    }
    setError(null);
    setStorageUnavailable(false);
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Attach a file to upload.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setStorageUnavailable(false);
    try {
      const formData = new FormData();
      formData.append('type', type);
      if (label.trim()) formData.append('label', label.trim());
      formData.append('file', file);
      await api.post('/portal/documents', formData);
      reset();
      onUploaded();
    } catch (err: any) {
      if (err?.response?.status === 503) {
        setStorageUnavailable(true);
        setError('Vault storage isn’t configured yet — try again in a moment.');
      } else {
        setError(err?.response?.data?.message || 'Could not upload this document.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload document" description="Add a file to your private vault">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <p className="eyebrow px-1">Document type</p>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={isUploading}
            className={cn(inputCls, 'appearance-none')}
          >
            {RENTER_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{scopeLabel(t)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <p className="eyebrow px-1">Label (optional)</p>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={isUploading}
            placeholder="e.g. Front side, issued 2024"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <p className="eyebrow px-1">File</p>
          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface-raised px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-hairline bg-surface shrink-0">
                  <FileText className="w-4 h-4 text-text-muted" />
                </div>
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setFile(null)}
                aria-label="Remove attached file"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text-faint hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!isUploading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                'rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
                isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-hairline',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                disabled={isUploading}
                accept={VAULT_ALLOWED_MIME_TYPES.join(',')}
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />
              <UploadCloud className="w-6 h-6 text-text-faint mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Drag & drop, or click to browse</p>
              <p className="mt-1 text-[11px] text-text-faint">
                PDF, JPEG, PNG or WebP — up to {VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB
              </p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 px-1">
              <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', storageUnavailable ? 'text-warning' : 'text-danger')} />
              <p className={cn('text-xs', storageUnavailable ? 'text-warning' : 'text-danger')}>{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
