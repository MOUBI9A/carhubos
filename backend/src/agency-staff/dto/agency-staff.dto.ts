import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import {
  AGENCY_CAPABILITIES,
  ROLE_PRESETS,
  STAFF_PRESETS,
} from '../../common/capabilities';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

/**
 * Every preset name the owner UI may seed a staff account from: the identity
 * role presets (OWNER/MANAGER/AGENT) ∪ the named staff presets (Front desk /
 * Fleet manager / Accountant). Whitelisted via `@IsIn` so an arbitrary preset
 * string can't be smuggled in.
 */
const ALLOWED_PRESETS: string[] = [
  ...Object.keys(ROLE_PRESETS),
  ...Object.keys(STAFF_PRESETS),
];

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Normalized for the same reason as login/register/provision (see
   * `NormalizeEmail`): this creates a real `User` login row, and the service
   * uses it for BOTH the duplicate check and `tx.user.create()`.
   *
   * Without it this is the one entry point that can still mint a mixed-case
   * account — and now that login lowercases, such a row is permanently
   * unreachable: an owner who invites `Manager@Agency.ma` creates a staff member
   * whose login is looked up as `manager@agency.ma` and never found. It also
   * defeats the duplicate check, since `Manager@x.ma` doesn't collide with an
   * existing `manager@x.ma`.
   */
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsIn(ALLOWED_PRESETS)
  preset: string;
}

export class UpdateStaffCapabilitiesDto {
  // Only agency capabilities may be granted. Platform caps (tenant.manage,
  // impersonate, …) and unknown strings are rejected by the pipe → this is the
  // first line of anti-escalation defence (the service enforces the second:
  // ⊂ the caller's own caps).
  @IsArray()
  @IsString({ each: true })
  @IsIn([...AGENCY_CAPABILITIES], { each: true })
  capabilities: string[];
}
