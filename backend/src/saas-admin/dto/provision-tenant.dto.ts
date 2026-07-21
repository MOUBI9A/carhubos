import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Founder-initiated tenant provisioning. Creates an agency + its OWNER + a BETA
 * subscription in one transaction (the same shape as self-serve `/auth/register`,
 * but performed BY the founder — the owner's initial password is set here and
 * shared out-of-band, since email invites aren't built yet).
 */
export class ProvisionTenantDto {
  @IsString()
  @IsNotEmpty()
  agencyName: string;

  /** Optional vanity subdomain (Agency.subdomain is unique). */
  @IsString()
  @IsOptional()
  subdomain?: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8, { message: 'initialPassword must be at least 8 characters' })
  initialPassword: string;
}
