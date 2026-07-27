// AuthGuard throws at import time if JWT_SECRET is unset (fail-fast) — set it
// before importing EntitlementsController, which imports AuthGuard. Same
// pattern as auth.guard.spec.ts / auth.service.spec.ts.
process.env.JWT_SECRET = 'test-jwt-secret-fixed-2026';

import { ForbiddenException } from '@nestjs/common';
import { EntitlementsController } from './entitlements.controller';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';

/**
 * Coverage for audit 2026-07-26 finding #6: `GET /agency/billing` was
 * guarded by `AuthGuard` alone, so any authenticated staff member —
 * including a 14-capability AGENT, whose preset excludes `finance.view` —
 * could read the agency's subscription plan, usage meters, and full
 * PlatformInvoice history. Same two-part pattern as
 * webhooks.spec.ts's capability-gating coverage: (1) assert the decorator
 * metadata is actually present on the handler, (2) exercise the REAL
 * CapabilitiesGuard (not mocked) to prove it 403s a caller who lacks the
 * capability and allows one who has it.
 */
describe('EntitlementsController — billing capability gating (audit 2026-07-26 #6)', () => {
  it('gates GET /agency/billing on finance.view', () => {
    const handler = Object.getOwnPropertyDescriptor(
      EntitlementsController.prototype,
      'billing',
    )?.value;
    expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toEqual([
      'finance.view',
    ]);
  });

  it('GET /platform/plans stays unguarded (public pricing page)', () => {
    const handler = Object.getOwnPropertyDescriptor(
      EntitlementsController.prototype,
      'plans',
    )?.value;
    expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toBeUndefined();
  });

  function makeContext(user: any) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
  }
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(['finance.view']),
  } as any;

  it('403s an AGENT whose membership lacks finance.view', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          // AGENT preset — no finance.view (see common/capabilities.ts)
          capabilities: ['fleet.view', 'booking.create', 'booking.manage'],
        }),
      },
    };
    const guard = new CapabilitiesGuard(reflector, prisma as any);
    await expect(
      guard.canActivate(
        makeContext({ id: 'u-agent', agencyId: 'a1', role: 'AGENT' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a MANAGER whose membership holds finance.view', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          capabilities: ['finance.view', 'fleet.view'],
        }),
      },
    };
    const guard = new CapabilitiesGuard(reflector, prisma as any);
    await expect(
      guard.canActivate(
        makeContext({ id: 'u-mgr', agencyId: 'a1', role: 'MANAGER' }),
      ),
    ).resolves.toBe(true);
  });

  it('allows an OWNER (whose preset holds every capability)', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          capabilities: ['finance.view', 'settings.manage', 'staff.manage'],
        }),
      },
    };
    const guard = new CapabilitiesGuard(reflector, prisma as any);
    await expect(
      guard.canActivate(
        makeContext({ id: 'u-owner', agencyId: 'a1', role: 'OWNER' }),
      ),
    ).resolves.toBe(true);
  });
});
