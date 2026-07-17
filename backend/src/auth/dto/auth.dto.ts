import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsString,
  IsIn,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsIn(['OWNER', 'AGENT', 'RENTER'])
  role?: string;

  @IsOptional()
  @IsString()
  agencyName?: string;
}
