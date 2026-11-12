import {
  IsBoolean, IsInt, IsString, MaxLength, Min, MinLength,
} from 'class-validator';

/** Every platform decision requires a justified, versioned request. */
export class UpdateAiEmergencyDto {
  @IsInt()
  @Min(1)
  expectedRevision: number;

  @IsBoolean()
  emergencyDisabled: boolean;

  @IsString()
  @MinLength(12)
  @MaxLength(400)
  reason: string;
}

export class ReviewAgencyAiDto {
  @IsInt()
  @Min(1)
  expectedRevision: number;

  @IsBoolean()
  approve: boolean;

  @IsString()
  @MinLength(12)
  @MaxLength(400)
  reason: string;
}
