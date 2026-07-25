import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarDocumentDto {
  @IsUUID(undefined, { message: 'A valid vehicle must be provided' })
  @IsNotEmpty()
  carId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['INSURANCE', 'CARTE_GRISE', 'TECHNICAL_INSPECTION', 'VIGNETTE'], {
    message:
      'type must be one of INSURANCE, CARTE_GRISE, TECHNICAL_INSPECTION, VIGNETTE',
  })
  type: string;

  @IsDateString({}, { message: 'expiryDate must be a valid ISO date' })
  @IsNotEmpty()
  expiryDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'issueDate must be a valid ISO date' })
  issueDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  // Real, Supabase-backed attachment (Vault entity-linking) — an id from a
  // prior POST /vault/files upload. Ownership of the referenced VaultFile is
  // re-verified against the caller's own agencyId in the service (never
  // trust that a caller-supplied id belongs to them just because it parses).
  @IsOptional()
  @IsString()
  vaultFileId?: string;
}

export class RenewCarDocumentDto {
  @IsDateString({}, { message: 'expiryDate must be a valid ISO date' })
  @IsNotEmpty()
  expiryDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'issueDate must be a valid ISO date' })
  issueDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  vaultFileId?: string;
}
