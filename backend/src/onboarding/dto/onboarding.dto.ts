import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCarDto } from '../../cars/dto/cars.dto';

export class UpdateAgencyProfileStepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateRentalSettingsStepDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDeposit?: number;
}

export class SaveOnboardingStepDto {
  @IsInt()
  @Min(1)
  @Max(5)
  step: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAgencyProfileStepDto)
  agencyProfile?: UpdateAgencyProfileStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateRentalSettingsStepDto)
  rentalSettings?: UpdateRentalSettingsStepDto;
}

export class BulkImportCarsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCarDto)
  cars: CreateCarDto[];
}
