import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Real values this app actually uses (frontend/src/app/(renter)/portal/types.ts
 * DOC_TYPE_LABELS) — the schema comment's "..." is informal, not a real
 * open-ended set. Constrained the same way every other pseudo-enum in this
 * codebase is (CLAUDE.md §5.6).
 */
export const RENTER_DOCUMENT_TYPES = [
  'CIN_FRONT',
  'CIN_BACK',
  'DRIVING_LICENSE',
  'PASSPORT',
] as const;

export class CreateRenterDocumentDto {
  @IsString()
  @IsIn(RENTER_DOCUMENT_TYPES, {
    message: `type must be one of ${RENTER_DOCUMENT_TYPES.join(', ')}`,
  })
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
