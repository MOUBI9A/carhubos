import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
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

  /**
   * Optional vanity subdomain (`Agency.subdomain` is unique).
   *
   * Constrained because this value is PUBLIC ROUTING INPUT, not just a label:
   * it becomes the `/agency/[subdomain]` path segment and the lookup key for
   * `GET /public/agency-by-subdomain/:subdomain`. Unvalidated it allowed
   * spaces/slashes/mixed case into a URL. Case matters most — Postgres unique
   * indexes are case-SENSITIVE, so `Atlas` and `atlas` were two distinct rows
   * that render identically to a human, and only one of them resolves. Lowercase
   * is therefore rejected-not-normalized (an explicit 400 beats silently
   * rewriting what the founder typed). Length caps at the 63-char DNS label
   * limit, since the name promises a real subdomain later.
   */
  @IsString()
  @IsOptional()
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message:
      'subdomain must be lowercase letters, digits and hyphens only, and may not start or end with a hyphen',
  })
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
