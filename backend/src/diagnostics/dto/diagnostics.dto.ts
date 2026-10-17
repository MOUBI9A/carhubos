import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export class CreateDiagnosticVehicleDto {
  @IsString() @MaxLength(80) @Matches(/\S/) brand: string;
  @IsString() @MaxLength(80) @Matches(/\S/) model: string;
  @IsOptional() @IsInt() @Min(1886) @Max(2100) year?: number;
  @IsOptional() @IsString() @Matches(/^[A-HJ-NPR-Z0-9]{17}$/) vin?: string;
  @IsOptional() @IsUUID() fleetCarId?: string;
}
export class CreateDiagnosticSessionDto {
  @IsUUID() vehicleId: string;
  @IsOptional() @IsString() @MaxLength(2000) symptoms?: string;
}
export class RevisionDto {
  @IsInt() @Min(0) expectedRevision: number;
}
export class SimulateDto extends RevisionDto {
  @IsString() @MaxLength(80) scenario: string;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) seed?: number;
}
export class ObdEventDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,80}$/) eventId: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,80}$/) streamId: string;
  @IsInt() @Min(0) @Max(2147483647) sequence: number;
  @IsDateString({ strict: true }) observedAt: string;
  @IsInt() @IsIn([1]) mode: number;
  @IsInt() @Min(0) @Max(255) pid: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(255, { each: true })
  bytes: number[];
}
export class DtcEvidenceDto {
  @IsString() @Matches(/^[PCBU][0-3][0-9A-F]{3}$/) code: string;
  @IsIn(['PENDING', 'CONFIRMED', 'PERMANENT']) status:
    'PENDING' | 'CONFIRMED' | 'PERMANENT';
  @IsOptional() @IsObject() freezeFrame?: Record<string, number>;
}
export class IngestEventsDto extends RevisionDto {
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => ObdEventDto)
  events: ObdEventDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => DtcEvidenceDto)
  dtcs?: DtcEvidenceDto[];
}
export class RecordTestDto extends RevisionDto {
  @IsString() @MaxLength(120) testId: string;
  @IsIn(['PASS', 'FAIL', 'INCONCLUSIVE']) result:
    'PASS' | 'FAIL' | 'INCONCLUSIVE';
  @IsString() @MaxLength(2000) @Matches(/\S/) notes: string;
}
export class ConfirmDto extends RevisionDto {
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  findingIds: string[];
  @IsString() @MaxLength(2000) @Matches(/\S/) notes: string;
}
export class EstimateItemDto {
  @IsIn(['LABOR', 'PART', 'OTHER']) kind: 'LABOR' | 'PART' | 'OTHER';
  @IsString() @MaxLength(200) @Matches(/\S/) description: string;
  @IsString() @Matches(/^\d{1,5}(\.\d{1,3})?$/) quantity: string;
  @IsString() @Matches(/^\d{1,8}(\.\d{1,2})?$/) unitPrice: string;
}
export class EstimateDto extends RevisionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EstimateItemDto)
  items: EstimateItemDto[];
  @IsOptional()
  @IsString()
  @Matches(/^(0(\.\d{1,4})?|1(\.0{1,4})?)$/)
  vatRate?: string;
}

export class CopilotGuideDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[PCBU][0-3][0-9A-F]{3}$/, { each: true })
  dtcCodes: string[];
}

