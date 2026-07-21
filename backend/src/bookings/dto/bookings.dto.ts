import {
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

export const BOOKING_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'OVERDUE',
  'COMPLETED',
  'CANCELLED',
] as const;

export const DEPOSIT_METHODS = ['CASH', 'TRANSFER', 'CHEQUE', 'CARD'] as const;

export class UpdateBookingStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(BOOKING_STATUSES, {
    message: `status must be one of ${BOOKING_STATUSES.join(', ')}`,
  })
  status: string;
}

export class CreateBookingDto {
  @IsDateString({}, { message: 'startDate must be a valid ISO date' })
  @IsNotEmpty({ message: 'A start date is required' })
  startDate: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO date' })
  @IsNotEmpty({ message: 'A return date is required' })
  endDate: string;

  @IsUUID(undefined, { message: 'A valid vehicle must be selected' })
  @IsNotEmpty({ message: 'A vehicle is required' })
  carId: string;

  @IsUUID(undefined, {
    message:
      'A registered customer is required. Select an existing customer or register the walk-in first.',
  })
  @IsNotEmpty({
    message:
      'A registered customer is required. Select an existing customer or register the walk-in first.',
  })
  customerId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Manager override for a Trust Network hard-lock. When present, the booking
  // is allowed despite an active blacklist flag and the reason is audit-logged.
  @IsString()
  @IsOptional()
  overrideReason?: string;

  /** Security deposit captured at booking/contract time (MAD). Defaults to 0. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsIn([...DEPOSIT_METHODS])
  depositMethod?: (typeof DEPOSIT_METHODS)[number];
}

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsString()
  @IsOptional()
  @IsIn(BOOKING_STATUSES, { message: `status must be one of ${BOOKING_STATUSES.join(', ')}` })
  status?: string;
}
