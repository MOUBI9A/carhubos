import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isBlockedWebhookHost } from '../../webhooks/dto/subscribe-webhook.dto';

export const TELEMATICS_PROVIDERS = ['MOCK', 'TRACCAR'] as const;
export type TelematicsProviderKey = (typeof TELEMATICS_PROVIDERS)[number];

/**
 * The provider base URL is agency-supplied and we make server-side requests
 * to it, which is textbook SSRF exposure — an owner (or someone who took
 * over an owner account) could point it at an internal service and use our
 * server as a proxy. Reuses the exact host screen the webhooks module
 * already hardened (loopback / link-local / RFC1918 / IPv6 ULA), so there
 * is one implementation to audit rather than two that can drift.
 */
@ValidatorConstraint({ name: 'isPublicTelematicsUrl', async: false })
export class IsPublicTelematicsUrlConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.trim() === '') return false;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    // https only — a plaintext link would put the provider credentials and
    // live vehicle positions on the wire in cleartext.
    if (url.protocol !== 'https:') return false;
    return !isBlockedWebhookHost(url.hostname);
  }

  defaultMessage(): string {
    return 'baseUrl must be an absolute https URL that does not point at a loopback, link-local, or private address';
  }
}

export class SaveTelematicsIntegrationDto {
  @IsIn([...TELEMATICS_PROVIDERS])
  provider: TelematicsProviderKey;

  /** Required for every real provider; MOCK has nothing to connect to. */
  @ValidateIf((o) => o.provider !== 'MOCK')
  @Validate(IsPublicTelematicsUrlConstraint)
  baseUrl?: string;

  @ValidateIf((o) => o.provider !== 'MOCK')
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  username?: string;

  @ValidateIf((o) => o.provider !== 'MOCK')
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  password?: string;
}

export class LinkDeviceDto {
  /**
   * Opaque provider-side device id. Null/empty unlinks the car. Never parsed
   * here — different providers use numeric ids, IMEIs, or GUIDs.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string | null;
}

export class MobilityCommandDto {
  /**
   * Mandatory justification. Immobilizing a customer's vehicle is a serious,
   * potentially disputed act; a free-text reason is the minimum needed for
   * the audit trail to be worth anything later. Length floor keeps "x" out.
   */
  @IsString()
  @MinLength(10, {
    message: 'reason must explain why — at least 10 characters',
  })
  @MaxLength(500)
  reason: string;
}
