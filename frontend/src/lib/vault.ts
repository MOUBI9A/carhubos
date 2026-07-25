import api from './api';

/** Mirrors backend/src/vault/dto/vault-file.dto.ts. Shared by every
 *  vault-upload surface (agency vault, Guardian car documents, renter
 *  portal) so the client-side check never drifts from the server's. */
export const VAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const VAULT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface UploadedVaultFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** Rejects an obviously-bad file before it ever leaves the browser. The
 *  server re-validates independently — this is a UX shortcut, not the
 *  security boundary. */
export function validateVaultFile(file: File): string | null {
  if (!VAULT_ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return `Unsupported file type "${file.type || 'unknown'}". Allowed: PDF, JPEG, PNG, WebP.`;
  }
  if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
    return `File exceeds the ${VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`;
  }
  return null;
}

/** POSTs to the agency-wide vault (`settings.manage`-gated). Callers must
 *  run validateVaultFile() first — this does not re-validate. */
export async function uploadToVault(file: File): Promise<UploadedVaultFile> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<UploadedVaultFile>('/vault/files', formData);
  return res.data;
}

/** Signed, short-lived download URL for a file already uploaded to the
 *  agency-wide vault. */
export async function getVaultDownloadUrl(vaultFileId: string): Promise<string> {
  const res = await api.get<{ url: string }>(`/vault/files/${vaultFileId}/download-url`);
  return res.data.url;
}
