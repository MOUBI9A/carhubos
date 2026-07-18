import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { CAPABILITIES_KEY } from '../decorators/require-capabilities.decorator';

/**
 * Fine-grained capability enforcement (see docs/PRODUCT_VISION.md §2-3 and
 * common/capabilities.ts). Runs AFTER AuthGuard, so `req.user` is populated
 * (`{ ...payload, id: sub }` incl. `agencyId` + `role`).
 *
 * Contract:
 *   - No `@RequireCapabilities` on handler/class → allow (guard is a no-op).
 *   - No authenticated user → Unauthorized.
 *   - `role === 'ROOT_ADMIN'` → allow (platform bypass; not an agency member).
 *   - Otherwise the caller's AgencyMembership for the JWT's {userId, agencyId}
 *     must exist and hold EVERY required capability, else Forbidden.
 *
 * Tenant-scoped by construction: the membership lookup is always keyed on the
 * agencyId baked into the caller's JWT — never on any request-supplied value —
 * so a caller can only ever satisfy caps within their own agency.
 */
@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No capability requirement declared → nothing to enforce.
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    // Platform tier bypasses agency capability checks entirely.
    if (user.role === 'ROOT_ADMIN') {
      return true;
    }

    // A non-platform caller must have both an agency context and a membership
    // in it. Missing agencyId cannot resolve a membership → Forbidden.
    if (!user.agencyId) {
      throw new ForbiddenException('No agency membership.');
    }

    const membership = await this.prisma.agencyMembership.findUnique({
      where: {
        userId_agencyId: { userId: user.id, agencyId: user.agencyId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No agency membership.');
    }

    const held = new Set(membership.capabilities);
    const missing = required.filter((cap) => !held.has(cap));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required capability: ${missing.join(', ')}.`,
      );
    }

    return true;
  }
}
