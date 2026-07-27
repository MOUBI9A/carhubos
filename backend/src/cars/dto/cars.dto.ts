import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

// Fleet lifecycle states (schema stores as String; matches the schema comment
// and the frontend CarStatus type). fuelType/gearbox are left free-form — no
// fixed value set is used anywhere, so constraining them would reject valid input.
export const CAR_STATUSES = [
  'AVAILABLE',
  'RENTED',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
] as const;

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @IsString()
  @IsOptional()
  fuelType?: string;

  @IsString()
  @IsOptional()
  gearbox?: string;

  @IsString()
  @IsOptional()
  @IsIn([...CAR_STATUSES], { message: `status must be one of ${CAR_STATUSES.join(', ')}` })
  status?: string;
}

export class UpdateCarDto extends PartialType(CreateCarDto) {}

/**
 * Optional pagination/search for GET /cars — same additive shape as
 * ListCustomersQueryDto: omitting page & limit keeps returning the bare,
 * take-capped array exactly as before; passing either switches to
 * { items, total, page, limit }.
 */
export class ListCarsQueryDto {
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

  @IsString()
  @IsOptional()
  search?: string;
}
