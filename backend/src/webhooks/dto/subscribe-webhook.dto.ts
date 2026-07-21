import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Events the backend actually emits (see webhooks.service.trigger callers in
 * bookings.service.ts). Kept as an explicit allowlist so a subscription can only
 * target a delivery the platform can really make — per CLAUDE.md §5.6, enum-like
 * strings are constrained with @IsIn. WebhookSubscription.event's schema comment
 * lists aspirational events (BOOKING_COMPLETED, CAR_MAINTENANCE) that nothing
 * fires today; add them here only once a trigger() call site exists.
 */
export const WEBHOOK_EVENTS = [
  'BOOKING_CREATED',
  'BOOKING_STATUS_UPDATED',
] as const;

/**
 * SSRF host denylist. `@IsUrl` validates URL *shape* and scheme but does NOT
 * block a syntactically valid URL from pointing at an internal address — so a
 * webhook could be aimed at the cloud metadata endpoint (169.254.169.254),
 * loopback, or another service on the backend's private network, and the server
 * would dutifully POST to it from its own network position. This constraint
 * rejects the loopback / link-local / private ranges the task enumerates
 * (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16) plus
 * `localhost`, and additionally the IPv6 equivalents (::1, fc00::/7, fe80::/10)
 * and 0.0.0.0/8 so the block can't be trivially bypassed.
 */
export function isBlockedWebhookHost(rawHost: string): boolean {
  if (!rawHost) return true;

  // Strip IPv6 brackets and any zone id, lowercase for comparison.
  let host = rawHost.toLowerCase().trim();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }
  host = host.split('%')[0];

  // Hostname-based loopback.
  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  // IPv6 checks.
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    // Unique-local fc00::/7 (fc.. / fd..) and link-local fe80::/10.
    if (
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe8') ||
      host.startsWith('fe9') ||
      host.startsWith('fea') ||
      host.startsWith('feb')
    ) {
      return true;
    }
    return false;
  }

  // IPv4 checks.
  const octets = host.split('.');
  if (octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o))) {
    const [a, b] = octets.map((o) => Number(o));
    if (octets.some((o) => Number(o) > 255)) return true; // malformed → reject
    if (a === 0) return true; // 0.0.0.0/8 "this host"
    if (a === 127) return true; // loopback 127.0.0.0/8
    if (a === 10) return true; // private 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
    if (a === 192 && b === 168) return true; // private 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16
  }

  return false;
}

@ValidatorConstraint({ name: 'isPublicWebhookUrl', async: false })
export class IsPublicWebhookUrlConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    let host: string;
    try {
      host = new URL(value).hostname;
    } catch {
      return false; // not parseable → let @IsUrl carry the message, this fails too
    }
    return !isBlockedWebhookHost(host);
  }

  defaultMessage(): string {
    return 'url must not point at a loopback, link-local, or private address';
  }
}

export class SubscribeWebhookDto {
  /**
   * Delivery target. Must be an absolute https URL (no http, no other scheme)
   * AND must not resolve to an internal address — see IsPublicWebhookUrlConstraint.
   */
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Validate(IsPublicWebhookUrlConstraint)
  @MaxLength(2048)
  url!: string;

  @IsIn(WEBHOOK_EVENTS)
  event!: (typeof WEBHOOK_EVENTS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(256)
  secret?: string;
}
