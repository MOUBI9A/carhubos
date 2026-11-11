import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWorkOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
