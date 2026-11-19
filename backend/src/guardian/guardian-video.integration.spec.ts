import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { GuardianService } from './guardian.service';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';

// Explicit isolated-DB opt-in only. Never fall back to DATABASE_URL, seed,
// truncate, or delete fixtures belonging to another run. Storage is mocked.
const testUrl = process.env.GUARDIAN_TEST_DATABASE_URL;
if (testUrl) {
  const parsed = new URL(testUrl);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    parsed.port !== '55432' ||
    parsed.pathname !== '/guardian_e2e' ||
    parsed.username !== 'guardian_test'
  ) {
    throw new Error(
      'Guardian video integration requires the isolated local Guardian test database.',
    );
  }
}
const integration = testUrl ? describe : describe.skip;
const sizeBytes = 6 * 1024 * 1024;
const sha256 = 'a'.repeat(64);

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

integration(
  'Guardian resumable video real PostgreSQL integrity (mocked storage)',
  () => {
    let prisma: PrismaClient;
    let service: GuardianService;
    const agencyId = randomUUID();
    const actorId = randomUUID();
    const customerId = randomUUID();
    const carId = randomUUID();
    const bookingIds: string[] = [];
    const storage = {
      createGuardianVideoUpload: jest.fn(async (_path: string) => ({
        bucketName: 'private-test-vault',
        endpoint: 'https://example.invalid/storage/v1/upload/resumable',
        token: 'mock-in-memory-upload-signature',
      })),
      verifyGuardianVideo: jest.fn(async (_path: string, _size: number) => ({
        sha256,
        sizeBytes,
        mimeType: 'video/mp4' as const,
      })),
      remove: jest.fn(async (_path: string) => undefined),
    };

    beforeAll(async () => {
      prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
      await prisma.$connect();
      service = new GuardianService(
        prisma as PrismaService,
        storage as unknown as VaultStorageService,
      );
      await prisma.agency.create({
        data: {
          id: agencyId,
          name: 'Guardian video isolated fixture',
          contactEmail: `${agencyId}@guardian-video-test.invalid`,
        },
      });
      await prisma.customer.create({
        data: {
          id: customerId,
          agencyId,
          firstName: 'Video',
          lastName: 'Fixture',
          phone: '+212600000002',
          identityNumber: customerId,
        },
      });
      await prisma.car.create({
        data: {
          id: carId,
          agencyId,
          brand: 'Test',
          model: 'Video',
          year: 2026,
          licensePlate: carId,
          pricePerDay: 100,
        },
      });
    });

    beforeEach(() => {
      jest.clearAllMocks();
      storage.verifyGuardianVideo.mockImplementation(async () => ({
        sha256,
        sizeBytes,
        mimeType: 'video/mp4',
      }));
    });

    afterAll(async () => {
      if (!prisma) return;
      try {
        const reports = await prisma.guardianReport.findMany({
          where: { agencyId },
          select: { id: true },
        });
        const reportIds = reports.map((report) => report.id);
        await prisma.$transaction(async (tx) => {
          await tx.guardianEvent.deleteMany({
            where: { reportId: { in: reportIds } },
          });
          await tx.guardianUploadIntent.deleteMany({
            where: { agencyId, reportId: { in: reportIds } },
          });
          await tx.guardianEvidence.deleteMany({
            where: { reportId: { in: reportIds } },
          });
          await tx.guardianReport.deleteMany({
            where: { agencyId, id: { in: reportIds } },
          });
          await tx.booking.deleteMany({
            where: { agencyId, id: { in: bookingIds } },
          });
          await tx.customer.deleteMany({ where: { id: customerId, agencyId } });
          await tx.car.deleteMany({ where: { id: carId, agencyId } });
          await tx.agency.deleteMany({ where: { id: agencyId } });
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    async function booking() {
      const id = randomUUID();
      bookingIds.push(id);
      return prisma.booking.create({
        data: {
          id,
          agencyId,
          customerId,
          carId,
          startDate: new Date('2036-02-01T00:00:00Z'),
          endDate: new Date('2036-02-02T00:00:00Z'),
          totalPrice: 100,
        },
      });
    }

    async function draft() {
      const b = await booking();
      return prisma.guardianReport.create({
        data: {
          agencyId,
          bookingId: b.id,
          carId,
          phase: 'OUT',
          mode: 'FULL',
          mileage: 10,
          fuelLevel: 8,
          createdById: actorId,
          agencyApprovedRevision: 1,
          customerApprovedRevision: 1,
        },
      });
    }

    async function init(reportId: string) {
      return service.initiateVideoUpload(actorId, agencyId, reportId, {
        revision: 1,
        kind: 'VIDEO',
        filename: 'fixture.mp4',
        mimeType: 'video/mp4',
        expectedSizeBytes: sizeBytes,
      });
    }

    async function counts(reportId: string) {
      const report = await prisma.guardianReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      return {
        revision: report.revision,
        agencyApprovedRevision: report.agencyApprovedRevision,
        customerApprovedRevision: report.customerApprovedRevision,
        evidence: await prisma.guardianEvidence.count({ where: { reportId } }),
        events: await prisma.guardianEvent.count({
          where: { reportId, action: 'EVIDENCE_UPLOADED' },
        }),
      };
    }

    it('persists immutable scope snapshots and resumes the same path without extending expiry or revision', async () => {
      const report = await draft();
      const intent = await init(report.id);
      expect(intent.storagePath).toMatch(
        new RegExp(`^${agencyId}/guardian/${report.id}/[0-9a-f-]{36}\\.mp4$`),
      );
      const saved = await prisma.guardianUploadIntent.findUniqueOrThrow({
        where: { id: intent.id },
      });
      expect(saved).toMatchObject({
        reportId: report.id,
        agencyId,
        actorId,
        side: 'AGENCY',
        kind: 'VIDEO',
        phaseAtInit: 'OUT',
        bookingId: report.bookingId,
        status: 'PENDING',
        revisionAtInit: 1,
        evidenceId: null,
      });
      const resumed = await service.resumeVideoUpload(
        actorId,
        agencyId,
        report.id,
        intent.id,
      );
      expect(resumed).toMatchObject({
        id: intent.id,
        storagePath: intent.storagePath,
        expiresAt: saved.expiresAt,
      });
      expect(
        storage.createGuardianVideoUpload.mock.calls.map(([path]) => path),
      ).toEqual([intent.storagePath, intent.storagePath]);
      const listed = await service.listVideoUploads(
        actorId,
        agencyId,
        report.id,
      );
      expect(listed).toHaveLength(1);
      expect(listed[0]).not.toHaveProperty('token');
      expect(await counts(report.id)).toMatchObject({
        revision: 1,
        evidence: 0,
        events: 0,
      });
    });

    it('rolls back intent and event when signing fails', async () => {
      const report = await draft();
      storage.createGuardianVideoUpload.mockRejectedValueOnce(
        new Error('mock signer unavailable'),
      );
      await expect(init(report.id)).rejects.toThrow('mock signer unavailable');
      expect(
        await prisma.guardianUploadIntent.count({
          where: { reportId: report.id },
        }),
      ).toBe(0);
      expect(
        await prisma.guardianEvent.count({ where: { reportId: report.id } }),
      ).toBe(0);
    });

    it('serializes duplicate initiation into one pending intent and one signing call', async () => {
      const report = await draft();
      const results = await Promise.allSettled([
        init(report.id),
        init(report.id),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.find((result) => result.status === 'rejected'),
      ).toMatchObject({ reason: expect.any(ConflictException) });
      expect(
        await prisma.guardianUploadIntent.count({
          where: { reportId: report.id },
        }),
      ).toBe(1);
      expect(storage.createGuardianVideoUpload).toHaveBeenCalledTimes(1);
    });

    it('commits concurrent finalizers once and replays the exact original result after a later revision', async () => {
      const report = await draft();
      const intent = await init(report.id);
      const entered = deferred();
      const release = deferred();
      let verifying = 0;
      storage.verifyGuardianVideo.mockImplementation(async () => {
        if (++verifying === 2) entered.resolve();
        await release.promise;
        return { sha256, sizeBytes, mimeType: 'video/mp4' };
      });
      const finalizations = Promise.all([
        service.finalizeVideoUpload(actorId, agencyId, report.id, intent.id),
        service.finalizeVideoUpload(actorId, agencyId, report.id, intent.id),
      ]);
      await entered.promise;
      release.resolve();
      const [first, second] = await finalizations;
      expect(first).toEqual(second);
      expect(first).toMatchObject({
        kind: 'VIDEO',
        sha256,
        sizeBytes,
        revision: 2,
      });
      expect(await counts(report.id)).toEqual({
        revision: 2,
        evidence: 1,
        events: 1,
        agencyApprovedRevision: null,
        customerApprovedRevision: null,
      });
      await prisma.guardianReport.update({
        where: { id: report.id },
        data: { revision: 3, status: 'CUSTOMER_REVIEW' },
      });
      expect(
        await service.finalizeVideoUpload(
          actorId,
          agencyId,
          report.id,
          intent.id,
        ),
      ).toEqual(first);
      expect(storage.verifyGuardianVideo).toHaveBeenCalledTimes(2);
      expect(
        await prisma.guardianUploadIntent.findUniqueOrThrow({
          where: { id: intent.id },
        }),
      ).toMatchObject({
        status: 'COMPLETED',
        evidenceId: first.id,
        completedRevision: 2,
      });
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('lets cancellation win while verification is in flight without attaching evidence', async () => {
      const report = await draft();
      const intent = await init(report.id);
      const entered = deferred();
      const release = deferred();
      storage.verifyGuardianVideo.mockImplementationOnce(async () => {
        entered.resolve();
        await release.promise;
        return { sha256, sizeBytes, mimeType: 'video/mp4' };
      });
      const result = service.finalizeVideoUpload(
        actorId,
        agencyId,
        report.id,
        intent.id,
      );
      const rejected = expect(result).rejects.toBeInstanceOf(ConflictException);
      await entered.promise;
      expect(
        await service.cancelVideoUpload(
          actorId,
          agencyId,
          report.id,
          intent.id,
        ),
      ).toEqual({ status: 'CANCELED' });
      release.resolve();
      await rejected;
      await service.cancelVideoUpload(actorId, agencyId, report.id, intent.id);
      expect(await counts(report.id)).toMatchObject({
        revision: 1,
        evidence: 0,
        events: 0,
      });
      expect(
        await prisma.guardianEvent.count({
          where: { reportId: report.id, action: 'VIDEO_UPLOAD_CANCELED' },
        }),
      ).toBe(1);
      expect(storage.remove).toHaveBeenCalledWith(intent.storagePath);
    });

    it('never deletes committed evidence when cancellation loses to finalization', async () => {
      const report = await draft();
      const intent = await init(report.id);
      await service.finalizeVideoUpload(
        actorId,
        agencyId,
        report.id,
        intent.id,
      );
      await expect(
        service.cancelVideoUpload(actorId, agencyId, report.id, intent.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(storage.remove).not.toHaveBeenCalled();
      expect(await counts(report.id)).toMatchObject({
        revision: 2,
        evidence: 1,
        events: 1,
      });
    });

    it.each(['revision', 'phase', 'state', 'booking'] as const)(
      'rechecks %s under lock after remote verification and rejects a changed report',
      async (change) => {
        const report = await draft();
        const intent = await init(report.id);
        const entered = deferred();
        const release = deferred();
        storage.verifyGuardianVideo.mockImplementationOnce(async () => {
          entered.resolve();
          await release.promise;
          return { sha256, sizeBytes, mimeType: 'video/mp4' };
        });
        const result = service.finalizeVideoUpload(
          actorId,
          agencyId,
          report.id,
          intent.id,
        );
        const rejected =
          expect(result).rejects.toBeInstanceOf(ConflictException);
        await entered.promise;
        const replacement = change === 'booking' ? await booking() : undefined;
        await prisma.guardianReport.update({
          where: { id: report.id },
          data:
            change === 'revision'
              ? { revision: 2 }
              : change === 'phase'
                ? { phase: 'IN' }
                : change === 'state'
                  ? { status: 'CUSTOMER_REVIEW' }
                  : { bookingId: replacement!.id },
        });
        release.resolve();
        await rejected;
        expect(await counts(report.id)).toMatchObject({
          evidence: 0,
          events: 0,
        });
        expect(
          await prisma.guardianUploadIntent.findUniqueOrThrow({
            where: { id: intent.id },
          }),
        ).toMatchObject({ status: 'PENDING', evidenceId: null });
        expect(storage.remove).not.toHaveBeenCalled();
      },
    );

    it('rejects foreign tenant and same-agency actor theft before signing, verifying, or deleting', async () => {
      const report = await draft();
      const intent = await init(report.id);
      storage.createGuardianVideoUpload.mockClear();
      await expect(
        service.initiateVideoUpload(actorId, randomUUID(), report.id, {
          revision: 1,
          kind: 'VIDEO',
          filename: 'fixture.mp4',
          mimeType: 'video/mp4',
          expectedSizeBytes: sizeBytes,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      for (const [actor, agency] of [
        [randomUUID(), agencyId],
        [actorId, randomUUID()],
      ]) {
        await expect(
          service.resumeVideoUpload(actor, agency, report.id, intent.id),
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(
          service.finalizeVideoUpload(actor, agency, report.id, intent.id),
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(
          service.cancelVideoUpload(actor, agency, report.id, intent.id),
        ).rejects.toBeInstanceOf(NotFoundException);
      }
      expect(
        await service.listVideoUploads(randomUUID(), agencyId, report.id),
      ).toEqual([]);
      expect(storage.createGuardianVideoUpload).not.toHaveBeenCalled();
      expect(storage.verifyGuardianVideo).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it.each(['truncated upload', 'wrong MP4 bytes'])(
      'keeps %s pending without evidence or revision on verifier rejection',
      async (reason) => {
        const report = await draft();
        const intent = await init(report.id);
        storage.verifyGuardianVideo.mockRejectedValueOnce(
          new BadRequestException(reason),
        );
        await expect(
          service.finalizeVideoUpload(actorId, agencyId, report.id, intent.id),
        ).rejects.toThrow(reason);
        expect(await counts(report.id)).toMatchObject({
          revision: 1,
          evidence: 0,
          events: 0,
        });
        expect(
          await prisma.guardianUploadIntent.findUniqueOrThrow({
            where: { id: intent.id },
          }),
        ).toMatchObject({ status: 'PENDING' });
        expect(storage.remove).not.toHaveBeenCalled();
      },
    );

    it('rejects expired intents but still permits their owner to cancel and clean up', async () => {
      const report = await draft();
      const intent = await init(report.id);
      await prisma.guardianUploadIntent.update({
        where: { id: intent.id },
        data: {
          createdAt: new Date(Date.now() - 7200000),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      await expect(
        service.resumeVideoUpload(actorId, agencyId, report.id, intent.id),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.finalizeVideoUpload(actorId, agencyId, report.id, intent.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        await service.cancelVideoUpload(
          actorId,
          agencyId,
          report.id,
          intent.id,
        ),
      ).toEqual({ status: 'CANCELED' });
      expect(storage.verifyGuardianVideo).not.toHaveBeenCalled();
    });

    it('enforces SQL size/scope/completion constraints and rolls failed writes back', async () => {
      const report = await draft();
      const intent = await init(report.id);
      const evidence = await prisma.guardianEvidence.create({
        data: {
          reportId: report.id,
          kind: 'VIDEO',
          storagePath: `integration-sql/${randomUUID()}`,
          sha256,
          filename: 'constraint-fixture.mp4',
          mimeType: 'video/mp4',
          sizeBytes,
          uploadedById: actorId,
          uploadedByRole: 'AGENCY',
        },
      });
      const invalid = [
        { expectedSizeBytes: sizeBytes - 1 },
        { expectedSizeBytes: 45 * 1024 * 1024 + 1 },
        { kind: 'DAMAGE' },
        { side: 'UNTRUSTED' },
        { mimeType: 'text/html' },
        { phaseAtInit: 'INVALID' },
        { revisionAtInit: 0 },
        { expiresAt: new Date(0) },
        { status: 'COMPLETED' as const, completedRevision: 2 },
        {
          status: 'COMPLETED' as const,
          evidenceId: evidence.id,
          completedRevision: null,
        },
        {
          status: 'COMPLETED' as const,
          evidenceId: evidence.id,
          completedRevision: 1,
        },
        { evidenceId: evidence.id, completedRevision: 2 },
      ];
      for (const data of invalid) {
        await expect(
          prisma.$transaction((tx) =>
            tx.guardianUploadIntent.update({ where: { id: intent.id }, data }),
          ),
        ).rejects.toThrow();
      }
      expect(
        await prisma.guardianUploadIntent.findUniqueOrThrow({
          where: { id: intent.id },
        }),
      ).toMatchObject({
        expectedSizeBytes: sizeBytes,
        kind: 'VIDEO',
        side: 'AGENCY',
        status: 'PENDING',
        evidenceId: null,
        completedRevision: null,
      });
    });

    it('keeps intent table RLS enabled with no public or Data API role grants or policies', async () => {
      const [security] = await prisma.$queryRaw<
        { enabled: boolean; clientGrants: bigint; policies: bigint }[]
      >`
      SELECT c.relrowsecurity AS enabled,
        (SELECT count(*) FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
         LEFT JOIN pg_roles r ON r.oid = acl.grantee
         WHERE acl.grantee = 0 OR r.rolname IN ('anon', 'authenticated')) AS "clientGrants",
        (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'GuardianUploadIntent') AS policies
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'GuardianUploadIntent'`;
      expect(security).toEqual({
        enabled: true,
        clientGrants: 0n,
        policies: 0n,
      });
    });
  },
);
