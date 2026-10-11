import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConsentService } from './consent.service';

/**
 * Security-critical unit tests for the consent invariant. A mocked Prisma is
 * sufficient — every assertion is about the guard logic, not the DB. The DB
 * lifecycle (request → approve → read → revoke → 403) is proven separately by
 * a throwaway live harness during verification.
 */
function makePrisma() {
  return {
    consentGrant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    renterDocument: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    agency: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  };
}

describe('ConsentService', () => {
  describe('readDocuments — THE INVARIANT', () => {
    it('throws Forbidden and reads nothing when no active grant exists', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findFirst.mockResolvedValue(null);
      const svc = new ConsentService(prisma as any, {} as any);

      await expect(
        svc.readDocuments('agency-1', 'renter-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // The active-grant query must pin: same agency, same renter, APPROVED,
      // not revoked, not expired.
      const where = prisma.consentGrant.findFirst.mock.calls[0][0].where;
      expect(where).toMatchObject({
        agencyId: 'agency-1',
        grantorUserId: 'renter-1',
        status: 'APPROVED',
        revokedAt: null,
      });
      expect(where.expiresAt.gt).toBeInstanceOf(Date);
      // No grant → the global vault is never queried.
      expect(prisma.renterDocument.findMany).not.toHaveBeenCalled();
    });

    it('reads the GLOBAL vault (RenterDocument), in-scope only, when a grant is active', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findFirst.mockResolvedValue({
        id: 'g1',
        scope: ['DRIVING_LICENSE'],
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.renterDocument.findMany.mockResolvedValue([
        {
          id: 'rd1',
          type: 'DRIVING_LICENSE',
          label: 'Driving licence',
          fileUrl: 'https://x/rd1',
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const svc = new ConsentService(prisma as any, {} as any);

      const res = await svc.readDocuments('agency-1', 'renter-1');

      // Reads the renter-owned vault (NOT Customer/CustomerDocument), and the
      // scope filter is pushed into the query — out-of-scope types never load.
      const args = prisma.renterDocument.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        ownerUserId: 'renter-1',
        type: { in: ['DRIVING_LICENSE'] },
      });
      expect(res.documents).toEqual([
        expect.objectContaining({ id: 'rd1', type: 'DRIVING_LICENSE', verified: true }),
      ]);
    });
  });

  describe('approve / revoke — grantor-only', () => {
    it('approve → 404 when the caller is not the grantor', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findUnique.mockResolvedValue({
        id: 'g1',
        grantorUserId: 'other-renter',
        status: 'PENDING',
      });
      const svc = new ConsentService(prisma as any, {} as any);

      await expect(svc.approve('renter-1', 'g1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.consentGrant.update).not.toHaveBeenCalled();
    });

    it('revoke → 404 when the caller is not the grantor', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findUnique.mockResolvedValue({
        id: 'g1',
        grantorUserId: 'other-renter',
        status: 'APPROVED',
      });
      const svc = new ConsentService(prisma as any, {} as any);

      await expect(svc.revoke('renter-1', 'g1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.consentGrant.update).not.toHaveBeenCalled();
    });

    it('approve sets APPROVED with a 7-day window and notifies the requester', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findUnique.mockResolvedValue({
        id: 'g1',
        grantorUserId: 'renter-1',
        status: 'PENDING',
      });
      prisma.consentGrant.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'g1', requestedByUserId: 'staff-1', ...data }),
      );
      const svc = new ConsentService(prisma as any, {} as any);

      const res: any = await svc.approve('renter-1', 'g1');

      expect(res.status).toBe('APPROVED');
      const days = Math.round(
        (res.expiresAt.getTime() - res.approvedAt.getTime()) /
          (24 * 3600 * 1000),
      );
      expect(days).toBe(7);
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });

    it('revoke works from APPROVED and stamps revokedAt', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findUnique.mockResolvedValue({
        id: 'g1',
        grantorUserId: 'renter-1',
        status: 'APPROVED',
      });
      prisma.consentGrant.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'g1', requestedByUserId: 'staff-1', ...data }),
      );
      const svc = new ConsentService(prisma as any, {} as any);

      const res: any = await svc.revoke('renter-1', 'g1');
      expect(res.status).toBe('REVOKED');
      expect(res.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('requestGrant — resolution & dedup', () => {
    it('404s a non-RENTER target (no cross-account existence leak)', async () => {
      const prisma = makePrisma();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'AGENT' });
      const svc = new ConsentService(prisma as any, {} as any);

      await expect(
        svc.requestGrant('agency-1', 'staff-1', {
          renterUserId: 'u1',
          scope: ['CIN_FRONT'],
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a duplicate live grant with the same scope', async () => {
      const prisma = makePrisma();
      prisma.user.findUnique.mockResolvedValue({ id: 'r1', role: 'RENTER' });
      prisma.consentGrant.findMany.mockResolvedValue([{ scope: ['CIN_FRONT'] }]);
      const svc = new ConsentService(prisma as any, {} as any);

      await expect(
        svc.requestGrant('agency-1', 'staff-1', {
          renterUserId: 'r1',
          scope: ['CIN_FRONT'],
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('stamps the caller agencyId + requester and notifies the renter', async () => {
      const prisma = makePrisma();
      prisma.user.findUnique.mockResolvedValue({ id: 'r1', role: 'RENTER' });
      prisma.consentGrant.findMany.mockResolvedValue([]);
      prisma.consentGrant.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'g-new', ...data }),
      );
      prisma.agency.findUnique.mockResolvedValue({ name: 'Acme Cars' });
      const svc = new ConsentService(prisma as any, {} as any);

      const grant = await svc.requestGrant('agency-1', 'staff-1', {
        renterUserId: 'r1',
        scope: ['CIN_FRONT'],
      });

      const created = prisma.consentGrant.create.mock.calls[0][0].data;
      expect(created).toMatchObject({
        grantorUserId: 'r1',
        agencyId: 'agency-1',
        requestedByUserId: 'staff-1',
        status: 'PENDING',
      });
      expect(grant.id).toBe('g-new');
      const notif = prisma.notification.create.mock.calls[0][0].data;
      expect(notif).toMatchObject({ userId: 'r1', type: 'CONSENT_REQUESTED' });
    });
  });

  describe('expireDueGrants', () => {
    it('flips past-due APPROVED grants to EXPIRED', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.updateMany.mockResolvedValue({ count: 3 });
      const svc = new ConsentService(prisma as any, {} as any);

      const n = await svc.expireDueGrants();
      expect(n).toBe(3);
      const where = prisma.consentGrant.updateMany.mock.calls[0][0].where;
      expect(where.status).toBe('APPROVED');
      expect(where.expiresAt.lte).toBeInstanceOf(Date);
      expect(prisma.consentGrant.updateMany.mock.calls[0][0].data).toEqual({
        status: 'EXPIRED',
      });
    });
  });

  describe('getConsentedDocumentDownloadUrl — Vault entity-linking', () => {
    function makeStorage() {
      return {
        upload: jest.fn(),
        createSignedUrl: jest.fn().mockResolvedValue('https://signed.example/x'),
        remove: jest.fn(),
      };
    }

    it('throws Forbidden and never touches storage when no active grant exists', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findFirst.mockResolvedValue(null);
      const storage = makeStorage();
      const svc = new ConsentService(prisma as any, storage as any);

      await expect(
        svc.getConsentedDocumentDownloadUrl('agency-1', 'renter-1', 'doc-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.renterDocument.findFirst).not.toHaveBeenCalled();
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
    });

    it('404s a document outside the grant\'s scope, even with an active grant', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findFirst.mockResolvedValue({
        id: 'g1',
        scope: ['DRIVING_LICENSE'],
      });
      prisma.renterDocument.findFirst.mockResolvedValue(null); // scope filter excluded it
      const storage = makeStorage();
      const svc = new ConsentService(prisma as any, storage as any);

      await expect(
        svc.getConsentedDocumentDownloadUrl('agency-1', 'renter-1', 'cin-doc'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.renterDocument.findFirst.mock.calls[0][0].where).toEqual({
        id: 'cin-doc',
        ownerUserId: 'renter-1',
        type: { in: ['DRIVING_LICENSE'] },
      });
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
    });

    it('404s a document that has no real uploaded file (only a legacy fileUrl, or nothing)', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findFirst.mockResolvedValue({ id: 'g1', scope: ['CIN_FRONT'] });
      prisma.renterDocument.findFirst.mockResolvedValue({ storagePath: null });
      const storage = makeStorage();
      const svc = new ConsentService(prisma as any, storage as any);

      await expect(
        svc.getConsentedDocumentDownloadUrl('agency-1', 'renter-1', 'cin-doc'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
    });

    it('signs a URL for an in-scope document under an active grant', async () => {
      const prisma = makePrisma();
      prisma.consentGrant.findFirst.mockResolvedValue({ id: 'g1', scope: ['CIN_FRONT'] });
      prisma.renterDocument.findFirst.mockResolvedValue({
        storagePath: 'renter-documents/renter-1/cin.jpg',
      });
      const storage = makeStorage();
      const svc = new ConsentService(prisma as any, storage as any);

      const result = await svc.getConsentedDocumentDownloadUrl('agency-1', 'renter-1', 'cin-doc');

      expect(storage.createSignedUrl).toHaveBeenCalledWith('renter-documents/renter-1/cin.jpg');
      expect(result.url).toBe('https://signed.example/x');
    });
  });

  describe('expireDueGrants — ENABLE_CRON guard', () => {
    const origEnv = process.env.ENABLE_CRON;
    afterEach(() => {
      process.env.ENABLE_CRON = origEnv;
    });

    it('returns 0 and skips DB update when ENABLE_CRON is false', async () => {
      process.env.ENABLE_CRON = 'false';
      const prisma = makePrisma();
      const svc = new ConsentService(prisma as any, {} as any);

      const count = await svc.expireDueGrants();

      expect(count).toBe(0);
      expect(prisma.consentGrant.updateMany).not.toHaveBeenCalled();
    });
  });
});
