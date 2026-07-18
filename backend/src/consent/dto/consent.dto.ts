import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Document types a consent grant may cover. These are the SAME granular strings
 * as RenterDocument.type — the read path filters the renter's global vault by
 * exact `type IN scope`, so a scope value that is not a real vault type would
 * simply match zero documents. (No coarse 'CIN' that matches nothing.)
 */
export const CONSENT_DOC_TYPES = [
  'CIN_FRONT',
  'CIN_BACK',
  'DRIVING_LICENSE',
  'PASSPORT',
];

/**
 * Agency-staff request for a renter's document access.
 * The renter is resolved by `qrHash` (scanned Trust Vault QR) OR `renterUserId`;
 * at least one is required (enforced in the service). `agencyId`/`requestedBy`
 * are NEVER taken from the body — they come from the caller's JWT.
 */
export class RequestConsentDto {
  @IsString()
  @IsOptional()
  renterUserId?: string;

  @IsString()
  @IsOptional()
  qrHash?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(CONSENT_DOC_TYPES, { each: true })
  scope: string[];
}
