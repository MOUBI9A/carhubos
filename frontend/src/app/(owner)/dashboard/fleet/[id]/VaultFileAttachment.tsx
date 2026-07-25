"use client";

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
  validateVaultFile,
  uploadToVault,
  type UploadedVaultFile,
} from '@/lib/vault';

export interface AttachedVaultFile {
  id: string;
  filename: string;
}

interface VaultFileAttachmentProps {
  value: AttachedVaultFile | null;
  onChange: (file: AttachedVaultFile | null) => void;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Controlled attachment widget embedded in the Register/Renew document
 * modals. Uploads straight to the agency-wide vault on selection (not on
 * form submit) so the parent form only ever needs to carry a vaultFileId.
 */
export function VaultFileAttachment({
  value,
  onChange,
  disabled,
  helperText,
}: VaultFileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file || disabled) return;

    const validationError = validateVaultFile(file);
    if (validationError) {
      setError(validationError);
      setStorageUnavailable(false);
      return;
    }

    setError(null);
    setStorageUnavailable(false);
    setIsUploading(true);
    try {
      const uploaded: UploadedVaultFile = await uploadToVault(file);
      onChange({ id: uploaded.id, filename: uploaded.filename });
    } catch (err: any) {
      if (err?.response?.status === 503) {
        setStorageUnavailable(true);
        setError('Vault storage isn’t configured yet — try again in a moment.');
      } else {
        setError(err?.response?.data?.message || 'Could not upload this file.');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  if (value) {
    return (
      <div className="space-y-1.5">
        {helperText && <p className="eyebrow px-1">{helperText}</p>}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface-raised px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-hairline bg-surface shrink-0">
              <FileText className="w-4 h-4 text-text-muted" />
            </div>
            <p className="truncate text-sm font-medium text-foreground">{value.filename}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Remove attached file"
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text-faint hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {helperText && <p className="eyebrow px-1">{helperText}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={cn(
          'rounded-2xl border-2 border-dashed p-5 text-center transition-colors',
          disabled || isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-hairline',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          disabled={disabled}
          accept={VAULT_ALLOWED_MIME_TYPES.join(',')}
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
        {isUploading ? (
          <>
            <Loader2 className="w-6 h-6 text-primary mx-auto mb-2 animate-spin" />
            <p className="text-xs font-medium text-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-6 h-6 text-text-faint mx-auto mb-2" />
            <p className="text-xs font-medium text-foreground">Drag & drop a file, or click to browse</p>
            <p className="mt-1 text-[11px] text-text-faint">
              PDF, JPEG, PNG or WebP — up to {VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB (optional)
            </p>
          </>
        )}
      </div>
      {error && (
        <div className="flex items-start gap-2 px-1">
          <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', storageUnavailable ? 'text-warning' : 'text-danger')} />
          <p className={cn('text-xs', storageUnavailable ? 'text-warning' : 'text-danger')}>{error}</p>
        </div>
      )}
    </div>
  );
}
