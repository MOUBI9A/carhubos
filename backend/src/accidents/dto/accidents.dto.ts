import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// Accident dossier value sets (schema stores as String). Kept as exported
// const tuples so the DTO constraint and any consumer share one source.
export const ACCIDENT_SEVERITIES = [
  'MINOR',
  'MODERATE',
  'SEVERE',
  'TOTAL',
] as const;

export const ACCIDENT_STATUSES = [
  'REPORTED',
  'INVESTIGATING',
  'REPAIR_QUOTE',
  'IN_REPAIR',
  'CLAIM_FILED',
  'RESOLVED',
] as const;

export class CreateAccidentDto {
  @IsUUID(undefined, { message: 'A valid vehicle must be selected' })
  @IsNotEmpty({ message: 'A vehicle is required' })
  carId: string;

  // The booking the incident occurred under, if any. Optional — an accident can
  // happen outside a rental (e.g. a lot/transit incident). Ownership is still
  // verified against the caller's agency in the service.
  @IsOptional()
  @IsUUID(undefined, { message: 'bookingId must be a valid booking id' })
  bookingId?: string;

  @IsDateString({}, { message: 'occurredAt must be a valid ISO date' })
  @IsNotEmpty({ message: 'occurredAt is required' })
  occurredAt: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([...ACCIDENT_SEVERITIES], {
    message: `severity must be one of ${ACCIDENT_SEVERITIES.join(', ')}`,
  })
  severity: string;

  @IsOptional()
  @IsString()
  @IsIn([...ACCIDENT_STATUSES], {
    message: `status must be one of ${ACCIDENT_STATUSES.join(', ')}`,
  })
  status?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  thirdParty?: boolean;

  // Money = Decimal(12,2). The DTO accepts a JS number on the wire (the global
  // DecimalToNumberInterceptor also emits numbers back); the service converts it
  // through the Prisma.Decimal API before persisting — never number math on it.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedCost?: number;
}

// PATCH: every field optional. carId/bookingId re-point are allowed but always
// re-verified for tenant ownership in the service before the write.
export class UpdateAccidentDto extends PartialType(CreateAccidentDto) {}
