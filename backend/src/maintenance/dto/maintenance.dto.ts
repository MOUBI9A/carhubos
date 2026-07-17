import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID(undefined, { message: 'A valid vehicle must be provided' })
  @IsNotEmpty()
  carId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['VIDANGE', 'REPAIR', 'TIRES', 'BRAKES', 'GENERAL'], {
    message: 'type must be one of VIDANGE, REPAIR, TIRES, BRAKES, GENERAL',
  })
  type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  garageName?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'IN_GARAGE', 'COMPLETED'])
  status?: string;
}
