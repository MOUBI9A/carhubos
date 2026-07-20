import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CapabilitiesGuard } from './capabilities.guard';

/**
 * Unit tests for the capability-enforcement guard — the single point every
 * agency-scoped, capability-gated endpoint runs through. Fail-closed by
 * design: every branch below that isn't an explicit allow must throw.
 */
function makeContext(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

function makeReflector(required: string[] | undefined) {
  return { getAllAndOverride: jest.fn().mockReturnValue(required) } as any;
}

describe('CapabilitiesGuard', () => {
  it('allows the request when no @RequireCapabilities is declared', async () => {
    const guard = new CapabilitiesGuard(makeReflector(undefined), {} as any);
    await expect(
      guard.canActivate(makeContext({ id: 'u1', agencyId: 'a1', role: 'AGENT' })),
    ).resolves.toBe(true);
  });

  it('allows the request when the required capability list is empty', async () => {
    const guard = new CapabilitiesGuard(makeReflector([]), {} as any);
    await expect(
      guard.canActivate(makeContext({ id: 'u1', agencyId: 'a1', role: 'AGENT' })),
    ).resolves.toBe(true);
  });

  it('throws Unauthorized when there is no authenticated user', async () => {
    const guard = new CapabilitiesGuard(makeReflector(['fleet.view']), {} as any);
    await expect(guard.canActivate(makeContext(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('bypasses capability checks entirely for ROOT_ADMIN', async () => {
    const prisma = { agencyMembership: { findUnique: jest.fn() } };
    const guard = new CapabilitiesGuard(makeReflector(['fleet.manage']), prisma as any);

    await expect(
      guard.canActivate(makeContext({ id: 'root', agencyId: null, role: 'ROOT_ADMIN' })),
    ).resolves.toBe(true);
    // Bypass must be unconditional — it never even queries for a membership.
    expect(prisma.agencyMembership.findUnique).not.toHaveBeenCalled();
  });

  it('throws Forbidden when a non-platform caller has no agencyId', async () => {
    const guard = new CapabilitiesGuard(makeReflector(['fleet.view']), {} as any);
    await expect(
      guard.canActivate(makeContext({ id: 'u1', agencyId: null, role: 'AGENT' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws Forbidden when the caller has no AgencyMembership row', async () => {
    const prisma = { agencyMembership: { findUnique: jest.fn().mockResolvedValue(null) } };
    const guard = new CapabilitiesGuard(makeReflector(['fleet.view']), prisma as any);

    await expect(
      guard.canActivate(makeContext({ id: 'u1', agencyId: 'a1', role: 'AGENT' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes the membership lookup on the JWT agencyId, never a request-supplied value', async () => {
    const findUnique = jest.fn().mockResolvedValue({ capabilities: ['fleet.view'] });
    const prisma = { agencyMembership: { findUnique } };
    const guard = new CapabilitiesGuard(makeReflector(['fleet.view']), prisma as any);

    await guard.canActivate(makeContext({ id: 'u1', agencyId: 'a1', role: 'AGENT' }));

    expect(findUnique).toHaveBeenCalledWith({
      where: { userId_agencyId: { userId: 'u1', agencyId: 'a1' } },
    });
  });

  it('throws Forbidden listing exactly the missing capabilities', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({ capabilities: ['fleet.view'] }),
      },
    };
    const guard = new CapabilitiesGuard(
      makeReflector(['fleet.view', 'fleet.manage', 'staff.manage']),
      prisma as any,
    );

    await expect(
      guard.canActivate(makeContext({ id: 'u1', agencyId: 'a1', role: 'AGENT' })),
    ).rejects.toThrow(/fleet\.manage, staff\.manage/);
  });

  it('allows when the membership holds every required capability', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({ capabilities: ['fleet.view', 'fleet.manage'] }),
      },
    };
    const guard = new CapabilitiesGuard(makeReflector(['fleet.view', 'fleet.manage']), prisma as any);

    await expect(
      guard.canActivate(makeContext({ id: 'u1', agencyId: 'a1', role: 'OWNER' })),
    ).resolves.toBe(true);
  });
});
