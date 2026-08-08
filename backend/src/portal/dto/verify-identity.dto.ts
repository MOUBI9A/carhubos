import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyIdentityDto {
  @IsIn(['CIN', 'PASSPORT'])
  identityType: string;

  @IsString()
  @IsNotEmpty()
  identityNumber: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
