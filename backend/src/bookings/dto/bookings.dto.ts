import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export const BOOKING_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

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
}

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsString()
  @IsOptional()
  status?: string;
}
