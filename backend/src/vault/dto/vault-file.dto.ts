import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Allowed upload MIME types — scans/photos of documents plus PDF. Rejecting
 * everything else server-side (not just relying on the multipart field name)
 * is the actual security boundary: an SVG or HTML upload accepted as a
 * "document" is a stored-XSS vector the moment anything ever renders it
 * inline, and an executable disguised with a document extension is worse.
 */
export const VAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Hard cap per file. Generous for a scanned document/photo, small enough
 *  that the vault can't be used as free bulk object storage. */
export const VAULT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Optional pagination/search for GET /vault/files — same shape as
 * ListCustomersQueryDto: page/limit both absent keeps a bare array (backward
 * compatible for a simple "give me everything" call under the cap); either
 * present returns { items, total, page, limit }. Built capped from day one,
 * not as a P2 follow-up fix.
 */
export class ListVaultFilesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  /** Case-insensitive substring match on filename. */
  @IsString()
  @IsOptional()
  search?: string;
}
