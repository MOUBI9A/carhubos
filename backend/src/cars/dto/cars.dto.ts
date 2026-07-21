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
