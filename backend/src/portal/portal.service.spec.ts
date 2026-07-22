import { NotFoundException } from '@nestjs/common';
import { PortalService } from './portal.service';

/**
 * Coverage for MASTER_BACKLOG §4: the renter portal's "own-data-only"
 * invariant — every method is keyed on the caller's own userId (from the
 * JWT), never a body/param id, so a renter can only ever reach their own
 * profile/documents/bookings/notifications. Module previously had zero
 * specs. A mocked Prisma is sufficient — this is about the WHERE clauses
 * the service builds, not the DB.
 */
describe('PortalService.me', () => {
  it('404s an unknown userId', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const svc = new PortalService(prisma as any);

    await expect(svc.me('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports linked:false with no renterIdentityId (no network history)', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u1', renterIdentityId: null }),
      },
    };
    const svc = new PortalService(prisma as any);

    const result = await svc.me('u1');

    expect(result.trustSummary).toEqual({
      linked: false,
      message: 'no network history',
    });
  });

  it('reports the linked trust summary when a renterIdentityId exists', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u1', renterIdentityId: 'identity-1' }),
      },
      renterIdentity: {
        findUnique: jest.fn().mockResolvedValue({
          globalScore: 4.2,
          reviewCount: 3,
          riskLevel: 'TRUSTED',
        }),
      },
    };
    const svc = new PortalService(prisma as any);

    const result = await svc.me('u1');

    expect(result.trustSummary).toEqual({
      linked: true,
      globalScore: 4.2,
      reviewCount: 3,
      riskLevel: 'TRUSTED',
    });
  });
});

describe('PortalService — self-scoped reads', () => {
  it('documents() scopes by ownerUserId, never a caller-supplied id', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new PortalService({ renterDocument: { findMany } } as any);

    await svc.documents('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({ ownerUserId: 'u1' });
  });

  it('bookings() scopes by renterId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new PortalService({ booking: { findMany } } as any);

    await svc.bookings('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({ renterId: 'u1' });
  });

  it('notifications() scopes by userId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new PortalService({ notification: { findMany } } as any);

    await svc.notifications('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
  });
});

describe('PortalService.markNotificationRead', () => {
  it('404s another user\'s notification — a cross-user write is impossible (updateMany scoped by { id, userId })', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const svc = new PortalService({ notification: { updateMany } } as any);

    await expect(
      svc.markNotificationRead('attacker', 'someone-elses-notification'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(updateMany.mock.calls[0][0].where).toEqual({
      id: 'someone-elses-notification',
      userId: 'attacker',
    });
  });

  it('marks the caller\'s own notification read', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new PortalService({ notification: { updateMany } } as any);

    const result = await svc.markNotificationRead('u1', 'notif-1');

    expect(result).toEqual({ id: 'notif-1', read: true });
  });
});
