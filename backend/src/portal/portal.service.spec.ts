import { ConflictException, NotFoundException } from '@nestjs/common';
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
    const svc = new PortalService(prisma as any, {} as any, {} as any);

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
    const svc = new PortalService(prisma as any, {} as any, {} as any);

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
    const svc = new PortalService(prisma as any, {} as any, {} as any);

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
    const svc = new PortalService({ renterDocument: { findMany } } as any, {} as any, {} as any);

    await svc.documents('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({ ownerUserId: 'u1' });
  });

  it('bookings() scopes by renterId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new PortalService({ booking: { findMany } } as any, {} as any, {} as any);

    await svc.bookings('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({ renterId: 'u1' });
  });

  it('notifications() scopes by userId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new PortalService({ notification: { findMany } } as any, {} as any, {} as any);

    await svc.notifications('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
  });
});

describe('PortalService.markNotificationRead', () => {
  it('404s another user\'s notification — a cross-user write is impossible (updateMany scoped by { id, userId })', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const svc = new PortalService({ notification: { updateMany } } as any, {} as any, {} as any);

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
    const svc = new PortalService({ notification: { updateMany } } as any, {} as any, {} as any);

    const result = await svc.markNotificationRead('u1', 'notif-1');

    expect(result).toEqual({ id: 'notif-1', read: true });
  });
});

describe('PortalService.createDocument / getDocumentDownloadUrl — Vault entity-linking', () => {
  function makeFile(overrides: Partial<Record<string, any>> = {}) {
    return {
      originalname: 'cin-front.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('jpeg-bytes'),
      ...overrides,
    };
  }
  function makeStorage() {
    return {
      upload: jest.fn().mockResolvedValue(undefined),
      createSignedUrl: jest.fn().mockResolvedValue('https://signed.example/x'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('rejects a disallowed mime type before touching storage', async () => {
    const storage = makeStorage();
    const prisma = { renterDocument: { create: jest.fn() } };
    const svc = new PortalService(prisma as any, storage as any, {} as any);

    await expect(
      svc.createDocument(
        'renter-1',
        { type: 'CIN_FRONT' } as any,
        makeFile({ mimetype: 'application/zip' }),
      ),
    ).rejects.toThrow(/Unsupported file type/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('namespaces the storage path under the renter\'s own userId, never an agencyId', async () => {
    const storage = makeStorage();
    const prisma = {
      renterDocument: { create: jest.fn((args: any) => Promise.resolve(args.data)) },
    };
    const svc = new PortalService(prisma as any, storage as any, {} as any);

    await svc.createDocument('renter-1', { type: 'CIN_FRONT' }, makeFile());

    const [storagePath] = storage.upload.mock.calls[0];
    expect(storagePath.startsWith('renter-documents/renter-1/')).toBe(true);
    expect(prisma.renterDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerUserId: 'renter-1', storagePath }),
      }),
    );
  });

  it('cleans up the just-uploaded object if the metadata insert fails', async () => {
    const storage = makeStorage();
    const prisma = {
      renterDocument: { create: jest.fn().mockRejectedValue(new Error('db down')) },
    };
    const svc = new PortalService(prisma as any, storage as any, {} as any);

    await expect(
      svc.createDocument('renter-1', { type: 'CIN_FRONT' } as any, makeFile()),
    ).rejects.toThrow('db down');
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('getDocumentDownloadUrl 404s on a document owned by someone else', async () => {
    const storage = makeStorage();
    const prisma = { renterDocument: { findFirst: jest.fn().mockResolvedValue(null) } };
    const svc = new PortalService(prisma as any, storage as any, {} as any);

    await expect(
      svc.getDocumentDownloadUrl('renter-1', 'someone-elses-doc'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it('getDocumentDownloadUrl signs a URL for the caller\'s own document', async () => {
    const storage = makeStorage();
    const prisma = {
      renterDocument: {
        findFirst: jest.fn().mockResolvedValue({ storagePath: 'renter-documents/renter-1/x' }),
      },
    };
    const svc = new PortalService(prisma as any, storage as any, {} as any);

    const result = await svc.getDocumentDownloadUrl('renter-1', 'doc-1');

    expect(storage.createSignedUrl).toHaveBeenCalledWith('renter-documents/renter-1/x');
    expect(result.url).toBe('https://signed.example/x');
  });
});

describe('PortalService.verifyIdentity', () => {
  it('resolves the renter identity then links matching customers, both scoped to the caller', async () => {
    const identity = { id: 'identity-1' };
    const linkedAgencies = [{ agencyId: 'agency-a', agencyName: 'Atlas Cars' }];
    const trust = {
      resolveIdentityForRenterUser: jest.fn().mockResolvedValue(identity),
      linkCustomersToRenter: jest.fn().mockResolvedValue(linkedAgencies),
    };
    const svc = new PortalService({} as any, {} as any, trust as any);

    const result = await svc.verifyIdentity('renter-1', {
      identityType: 'CIN',
      identityNumber: 'AB123456',
      phone: '+212600000000',
    });

    expect(trust.resolveIdentityForRenterUser).toHaveBeenCalledWith(
      'renter-1',
      'CIN',
      'AB123456',
    );
    expect(trust.linkCustomersToRenter).toHaveBeenCalledWith(
      'renter-1',
      'identity-1',
      '+212600000000',
    );
    expect(result).toEqual({ renterIdentityId: 'identity-1', linkedAgencies });
  });
});

describe('PortalService.claimInvite', () => {
  it('404s an unknown token', async () => {
    const prisma = { customerInvite: { findUnique: jest.fn().mockResolvedValue(null) } };
    const svc = new PortalService(prisma as any, {} as any, {} as any);

    await expect(svc.claimInvite('renter-1', 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s an already-consumed invite', async () => {
    const prisma = {
      customerInvite: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          consumedAt: new Date(),
          expiresAt: new Date(Date.now() + 10_000),
          customer: { id: 'c1', userId: null, agencyId: 'a1', agency: { name: 'X' } },
        }),
      },
    };
    const svc = new PortalService(prisma as any, {} as any, {} as any);

    await expect(svc.claimInvite('renter-1', 'used')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s an expired invite', async () => {
    const prisma = {
      customerInvite: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          consumedAt: null,
          expiresAt: new Date(Date.now() - 10_000),
          customer: { id: 'c1', userId: null, agencyId: 'a1', agency: { name: 'X' } },
        }),
      },
    };
    const svc = new PortalService(prisma as any, {} as any, {} as any);

    await expect(svc.claimInvite('renter-1', 'expired')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to re-link a customer already claimed by a DIFFERENT account', async () => {
    const prisma = {
      customerInvite: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          customerId: 'c1',
          consumedAt: null,
          expiresAt: new Date(Date.now() + 10_000),
          customer: {
            id: 'c1',
            userId: 'someone-else',
            agencyId: 'a1',
            agency: { name: 'X' },
          },
        }),
      },
    };
    const svc = new PortalService(prisma as any, {} as any, {} as any);

    await expect(svc.claimInvite('renter-1', 'tok')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('links the customer to the caller and marks the invite consumed', async () => {
    const customerUpdate = jest.fn();
    const inviteUpdate = jest.fn();
    const prisma = {
      customerInvite: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          customerId: 'c1',
          consumedAt: null,
          expiresAt: new Date(Date.now() + 10_000),
          customer: {
            id: 'c1',
            userId: null,
            agencyId: 'a1',
            agency: { name: 'Atlas Cars' },
          },
        }),
      },
      customer: { update: customerUpdate },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };
    // customer.update / customerInvite.update return values are wrapped as
    // promises through $transaction above; wire them to the same mocks the
    // service actually calls.
    prisma.customer.update = customerUpdate;
    (prisma.customerInvite as any).update = inviteUpdate;
    customerUpdate.mockReturnValue(Promise.resolve({}));
    inviteUpdate.mockReturnValue(Promise.resolve({}));

    const svc = new PortalService(prisma as any, {} as any, {} as any);

    const result = await svc.claimInvite('renter-1', 'tok');

    expect(customerUpdate).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { userId: 'renter-1' },
    });
    expect(inviteUpdate).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { consumedAt: expect.any(Date), consumedByUserId: 'renter-1' },
    });
    expect(result).toEqual({ agencyId: 'a1', agencyName: 'Atlas Cars' });
  });
});
