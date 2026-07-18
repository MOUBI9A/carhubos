import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsIn,
} from 'class-validator';

export const REVIEW_TAGS = [
  'PERFECT_RENTER',
  'EARLY_RETURN',
  'POLITE',
  'REPEAT_CLIENT',
  'CLEAN_RETURN',
  'LATE_RETURN',
  'SMOKED_IN_CAR',
  'DIRTY_INTERIOR',
  'MINOR_DAMAGE',
  'MAJOR_DAMAGE',
  'AGGRESSIVE_DRIVING',
  'UNPAID_DAMAGE',
] as const;

export const BLACKLIST_REASONS = [
  'VEHICLE_THEFT_ATTEMPT',
  'FRAUDULENT_DOCUMENTS',
  'MAJOR_UNPAID_FINES',
  'UNPAID_DAMAGE',
  'ABANDONED_VEHICLE',
  'VIOLENT_CONDUCT',
  'OTHER',
] as const;

export const BLACKLIST_SEVERITIES = ['MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class AssessDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;
}

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsArray()
  @IsIn(REVIEW_TAGS, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateBlacklistDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsIn(BLACKLIST_REASONS)
  reason: string;

  @IsIn(BLACKLIST_SEVERITIES)
  severity: string;

  @IsString()
  @IsNotEmpty()
  details: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];

  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class LiftBlacklistDto {
  @IsOptional()
  @IsString()
  note?: string;
}
