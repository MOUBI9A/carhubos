import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsString,
  IsIn,
  IsBoolean,
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

  // Mandatory only for self-serve agency creation. Optional for invite/mobile
  // registrations until those distinct flows have a reviewed legal notice.
  @IsOptional()
  @IsBoolean()
  legalNoticeAcknowledged?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmsAdultAndAuthority?: boolean;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  email?: string;
}

export class DeleteAccountDto {
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  reason?: string;
}


/** Categories only: do not collect a free-text reason or ID documents. */
export class PrivacyRequestDto {
  @IsIn(['ACCESS', 'RECTIFICATION', 'ERASURE', 'OPPOSITION'])
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'OPPOSITION';
}
