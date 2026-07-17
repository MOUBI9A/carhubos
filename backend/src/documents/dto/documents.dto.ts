import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarDocumentDto {
  @IsUUID(undefined, { message: 'A valid vehicle must be provided' })
  @IsNotEmpty()
  carId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['INSURANCE', 'CARTE_GRISE', 'TECHNICAL_INSPECTION', 'VIGNETTE'], {
    message:
      'type must be one of INSURANCE, CARTE_GRISE, TECHNICAL_INSPECTION, VIGNETTE',
  })
  type: string;

  @IsDateString({}, { message: 'expiryDate must be a valid ISO date' })
  @IsNotEmpty()
  expiryDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'issueDate must be a valid ISO date' })
  issueDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class RenewCarDocumentDto {
  @IsDateString({}, { message: 'expiryDate must be a valid ISO date' })
  @IsNotEmpty()
  expiryDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'issueDate must be a valid ISO date' })
  issueDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
