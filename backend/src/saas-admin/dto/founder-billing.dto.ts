import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SUBSCRIPTION_STATUSES } from '../../common/plans';

/**
 * Founder changes an agency's subscription: swap plan, force a lifecycle status,
 * and/or extend the trial. All fields optional — send only what changes.
 */
export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @IsIn(['BETA', 'STARTER', 'PRO', 'BUSINESS'])
  planKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUBSCRIPTION_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  extendTrialDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Founder issues a platform invoice to an agency (manual billing). */
export class IssueInvoiceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number; // MAD, VAT-inclusive

  @IsOptional()
  @IsString()
  periodStart?: string; // ISO date

  @IsOptional()
  @IsString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
