import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AgencyStaffService } from './agency-staff.service';

/**
 * Security spec for staff management — this service is the privilege surface of
 * a tenant, so its guards are regression-critical:
 *   1. Tenant boundary — a caller can only touch memberships in their own agency
 *      (target keyed on userId_agencyId → foreign target 404s, never leaks).
 *   2. Anti-escalation — a non-ROOT_ADMIN caller may only grant capabilities they
 *      themselves hold; otherwise a staff.manage delegate could mint owner-level
 *      access and escalate. ROOT_ADMIN bypasses.
 *   3. Lockout safety — the agency can't be left with nobody able to manage staff,
 *      and the last owner can't be removed.
 *
 * A mocked Prisma is sufficient — this is about the guard logic and the exception
 * thrown, not the DB. entitlements is unused by updateCapabilities/remove.
 */
const AGENCY = 'agency-a';

function makeSvc(prisma: any) {
  return new AgencyStaffService(prisma, {} as any);
}

describe('AgencyStaffService.updateCapabilities — tenant boundary + anti-escalation', () => {
  it('404s when the target membership is not in the caller agency (cross-tenant)', async () => {
    // findUnique keyed on userId_agencyId returns null for a target that lives in
    // another agency — surfaced as 404, never leaking cross-tenant existence.
    const prisma = {
      agencyMembership: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = makeSvc(prisma);

    await expect(
      svc.updateCapabilities(AGENCY, 'caller', 'OWNER', 'target-in-other-agency', {
        capabilities: ['booking.view'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids a non-ROOT_ADMIN caller from granting a capability they do not hold', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn(({ where }: any) => {
          const uid = where.userId_agencyId.userId;
          if (uid === 'target')
            return Promise.resolve({ userId: 'target', capabilities: ['booking.view'] });
          if (uid === 'caller')
            return Promise.resolve({ userId: 'caller', capabilities: ['staff.manage'] });
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
    };
    const svc = makeSvc(prisma);

    // Caller holds only staff.manage; tries to grant finance.approve → escalation.
    await expect(
      svc.updateCapabilities(AGENCY, 'caller', 'MANAGER', 'target', {
        capabilities: ['finance.approve'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.agencyMembership.update).not.toHaveBeenCalled();
  });

  it('lets ROOT_ADMIN grant any capability (bypasses the escalation check)', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ userId: 'target', capabilities: ['booking.view'] }),
        update: jest.fn().mockResolvedValue({
          userId: 'target',
          rolePreset: 'AGENT',
          capabilities: ['booking.view', 'finance.approve'],
          user: { name: 'T', email: 't@x.co', role: 'AGENT' },
        }),
      },
    };
    const svc = makeSvc(prisma);

    const result = await svc.updateCapabilities(AGENCY, 'root', 'ROOT_ADMIN', 'target', {
      capabilities: ['booking.view', 'finance.approve'],
    });

    expect(result.capabilities).toContain('finance.approve');
    expect(prisma.agencyMembership.update).toHaveBeenCalledTimes(1);
  });

  it('refuses to strip staff.manage from the last member holding it (lockout guard)', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'target',
          capabilities: ['staff.manage', 'booking.view'],
        }),
        count: jest.fn().mockResolvedValue(1), // only one staff.manage holder left
        update: jest.fn(),
      },
    };
    const svc = makeSvc(prisma);

    // ROOT_ADMIN so the lockout is isolated from the escalation check.
    await expect(
      svc.updateCapabilities(AGENCY, 'root', 'ROOT_ADMIN', 'target', {
        capabilities: ['booking.view'], // drops staff.manage
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.agencyMembership.update).not.toHaveBeenCalled();
  });
});

describe('AgencyStaffService.remove — self + last-owner guards + tenant boundary', () => {
  it('forbids removing yourself', async () => {
    const svc = makeSvc({ agencyMembership: { findUnique: jest.fn() } });

    await expect(svc.remove(AGENCY, 'me', 'me')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('404s when the target membership is in another agency (cross-tenant)', async () => {
    const prisma = {
      agencyMembership: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = makeSvc(prisma);

    await expect(
      svc.remove(AGENCY, 'caller', 'target-in-other-agency'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to remove the last owner of the agency', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'owner',
          rolePreset: 'OWNER',
          user: { role: 'OWNER' },
        }),
        count: jest.fn().mockResolvedValue(1), // last owner
      },
      user: { delete: jest.fn() },
    };
    const svc = makeSvc(prisma);

    await expect(svc.remove(AGENCY, 'caller', 'owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
