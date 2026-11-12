import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MEDIA_KINDS, ZONES } from './guardian.service';

export class CreateGuardianReportDto {
  @IsUUID() bookingId!: string;
  @IsIn(['OUT', 'IN']) phase!: 'OUT' | 'IN';
  @IsOptional() @IsIn(['FULL', 'QUICK']) mode?: 'FULL' | 'QUICK';
  @IsInt() @Min(0) mileage!: number;
  @IsInt() @Min(0) @Max(8) fuelLevel!: number;
}
export class GuardianRevisionDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) revision!: number;
}
export class GuardianEvidenceDto extends GuardianRevisionDto {
  @IsIn(MEDIA_KINDS) kind!: string;
}
export class GuardianVideoUploadDto extends GuardianRevisionDto {
  @IsIn(['VIDEO']) kind!: 'VIDEO';
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(/^[^\p{Cc}/\\]+$/u)
  filename!: string;
  @IsIn(['video/mp4']) mimeType!: 'video/mp4';
  @IsInt()
  @Min(6 * 1024 * 1024)
  @Max(45 * 1024 * 1024)
  expectedSizeBytes!: number;
}
export class GuardianFindingDto extends GuardianRevisionDto {
  @IsIn(ZONES) zone!: string;
  @IsString() @MinLength(2) @MaxLength(60) kind!: string;
  @IsUUID() photoId!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsUUID() videoId?: string;
  @IsOptional() @IsInt() @Min(0) videoOffsetSec?: number;
}
export class GuardianDecisionDto extends GuardianRevisionDto {
  @IsIn(['ACCEPT', 'DISPUTE']) decision!: 'ACCEPT' | 'DISPUTE';
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
export class GuardianDisputeDto extends GuardianRevisionDto {
  @IsString() @MinLength(5) @MaxLength(2000) note!: string;
}
export class GuardianRepairDto extends GuardianRevisionDto {
  @IsUUID() photoId!: string;
}
