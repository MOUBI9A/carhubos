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
