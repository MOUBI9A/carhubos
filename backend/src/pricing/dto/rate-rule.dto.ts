import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const RATE_RULE_KINDS = ['SEASONAL', 'DURATION'] as const;
export const RATE_ADJUSTMENT_TYPES = ['PERCENT', 'FIXED_DAILY'] as const;
/** Pricing segments. Kept as a fixed list so a typo can't create a silent
 *  orphan tier that matches nothing. */
export const VEHICLE_CLASSES = [
  'ECONOMY',
  'COMPACT',
  'SUV',
  'LUXURY',
  'VAN',
] as const;

export class CreateRateRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsIn([...RATE_RULE_KINDS])
  kind: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsIn([...VEHICLE_CLASSES])
  vehicleClass?: string | null;

  @IsOptional()
  @IsString()
  carId?: string | null;

  // ── SEASONAL: at least one bound is required, else the "season" is
  //    everything and the operator has really made an agency-wide override.
  @ValidateIf((o) => o.kind === 'SEASONAL')
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ValidateIf((o) => o.kind === 'SEASONAL')
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  // ── DURATION, in whole rental days.
  @ValidateIf((o) => o.kind === 'DURATION')
  @IsOptional()
  @IsInt()
  @Min(1)
  minDays?: number | null;

  @ValidateIf((o) => o.kind === 'DURATION')
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDays?: number | null;

  @IsIn([...RATE_ADJUSTMENT_TYPES])
  adjustmentType: string;

  /**
   * PERCENT: signed, -100..1000 (a -100% rule makes it free, which is at
   * least coherent; below that is always a typo). FIXED_DAILY: an absolute
   * MAD/day, so it may not be negative.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  adjustmentValue: number;
}

export class UpdateRateRuleDto extends CreateRateRuleDto {}

export class QuoteQueryDto {
  @IsString()
  @IsNotEmpty()
  carId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class SetVehicleClassDto {
  @IsOptional()
  @IsIn([...VEHICLE_CLASSES])
  vehicleClass?: string | null;
}

/** Shared shape guards that class-validator decorators can't express. */
export function assertRuleCoherent(dto: CreateRateRuleDto): string | null {
  if (dto.adjustmentType === 'PERCENT') {
    if (dto.adjustmentValue < -100 || dto.adjustmentValue > 1000) {
      return 'A percentage adjustment must be between -100 and 1000.';
    }
  } else if (dto.adjustmentValue < 0) {
    return 'A fixed daily rate cannot be negative.';
  }

  if (dto.kind === 'SEASONAL') {
    if (!dto.startDate && !dto.endDate) {
      return 'A seasonal rule needs at least a start or an end date.';
    }
    if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
      return 'The season end date must be on or after the start date.';
    }
  }

  if (dto.kind === 'DURATION') {
    if (dto.minDays == null && dto.maxDays == null) {
      return 'A duration rule needs a minimum or a maximum number of days.';
    }
    if (dto.minDays != null && dto.maxDays != null && dto.maxDays < dto.minDays) {
      return 'maxDays must be greater than or equal to minDays.';
    }
  }

  return null;
}
