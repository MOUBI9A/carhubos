import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsString,
  IsIn,
} from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @NormalizeEmail()
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
