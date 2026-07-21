import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

// Pseudo-enum value sets (schema stores these as String). Constrained here so an
// invalid value can't be written through the API — matches the schema comments,
// the seed, and the frontend pickers.
export const CUSTOMER_STATUSES = ['ACTIVE', 'BLACKLISTED'] as const;
export const IDENTITY_TYPES = ['CIN', 'PASSPORT'] as const;

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([...IDENTITY_TYPES], { message: `identityType must be one of ${IDENTITY_TYPES.join(', ')}` })
  identityType: string;

  @IsString()
  @IsNotEmpty()
  identityNumber: string;

  @IsString()
  @IsOptional()
  nationality?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsString()
  @IsOptional()
  @IsIn([...CUSTOMER_STATUSES], { message: `status must be one of ${CUSTOMER_STATUSES.join(', ')}` })
  status?: string;
}

/**
 * Optional pagination/search for GET /customers.
 * When page & limit are both absent the endpoint keeps returning a bare
 * array (backward compatible); when present it returns
 * { items, total, page, limit }.
 */
export class ListCustomersQueryDto {
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
