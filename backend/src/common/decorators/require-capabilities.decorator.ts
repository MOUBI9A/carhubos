import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key read by {@link CapabilitiesGuard}. Kept separate from
 * ROLES_KEY so capability gating composes additively with `@Roles`.
 */
export const CAPABILITIES_KEY = 'capabilities';

/**
 * Declare the fine-grained capabilities a handler (or controller) requires.
 * The caller's AgencyMembership must hold EVERY listed capability (AND
 * semantics). ROOT_ADMIN bypasses (see the guard). Compose with the existing
 * `@UseGuards(AuthGuard, CapabilitiesGuard)` — this decorator only sets
 * metadata, it does not attach the guard.
 *
 *   @RequireCapabilities('booking.create')
 */
export const RequireCapabilities = (...caps: string[]) =>
  SetMetadata(CAPABILITIES_KEY, caps);
