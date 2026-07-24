"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export interface VaultFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** Mirrors backend/src/vault/dto/vault-file.dto.ts — kept in one place so the
 *  uploader can reject an obviously-bad file before ever calling the API. */
export const VAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const VAULT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

/** Same shape as useFleet()/other list hooks: data/isLoading/error/refetch,
 *  skeleton only on first load so a refetch after upload/delete updates in
 *  place rather than blanking the table. */
export function useVaultFiles() {
  const [data, setData] = useState<VaultFile[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) setIsLoading(true);
      setError(null);
      const res = await api.get<VaultFile[]>('/vault/files');
      setData(res.data);
      hasLoadedRef.current = true;
    } catch (err: any) {
      console.error('Vault files fetch error:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load vault files',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
