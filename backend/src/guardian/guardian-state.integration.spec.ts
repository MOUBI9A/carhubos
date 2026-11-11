import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { GuardianService } from './guardian.service';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';

// This suite never uses DATABASE_URL or resets a database. An operator must
// explicitly opt into the dedicated local Guardian database; cleanup only
// removes this run's UUID fixtures. Storage remains mocked, not storage E2E.
const testUrl = process.env.GUARDIAN_TEST_DATABASE_URL;
if (testUrl) {
  const parsed = new URL(testUrl);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    parsed.port !== '55432' ||
    parsed.pathname !== '/guardian_e2e' ||
    parsed.username !== 'guardian_test'
  )
    throw new Error(
      'Guardian state integration requires the isolated local Guardian test database.',
    );
}
const integration = testUrl ? describe : describe.skip;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

integration(
  'Guardian real PostgreSQL state serialization (explicit opt-in)',
  () => {
    let prisma: PrismaClient;
    const agencyId = randomUUID();
    const renterId = randomUUID();
    const customerId = randomUUID();
    const carId = randomUUID();
    const staffId = randomUUID();
    const bookingIds: string[] = [];
    const storage = {
      upload: jest.fn(async () => undefined),
      remove: jest.fn(async () => undefined),
      createSignedUrl: jest.fn(
        async () => 'https://example.invalid/not-real-storage',
      ),
    };
    let service: GuardianService;
    const file = {
      originalname: 'damage.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 224, 0]),
      size: 5,
    } as Express.Multer.File;

    beforeAll(async () => {
      prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
      service = new GuardianService(
        prisma as PrismaService,
        storage as unknown as VaultStorageService,
      );
      await prisma.$connect();
      await prisma.agency.create({
        data: {
          id: agencyId,
          name: 'Guardian isolated concurrency fixture',
          contactEmail: `${agencyId}@guardian-test.invalid`,
        },
      });
      await prisma.user.create({
        data: {
          id: renterId,
          email: `${renterId}@guardian-test.invalid`,
          password: 'not-a-login-hash',
          name: 'Test renter',
          role: 'RENTER',
        },
      });
      await prisma.customer.create({
        data: {
          id: customerId,
          agencyId,
          userId: renterId,
          firstName: 'Test',
          lastName: 'Renter',
          phone: '+212600000001',
          identityNumber: customerId,
        },
      });
      await prisma.car.create({
        data: {
          id: carId,
          agencyId,
          brand: 'Test',
          model: 'Concurrency',
          year: 2026,
          licensePlate: carId,
          pricePerDay: 100,
        },
      });
    });

    afterAll(async () => {
      if (!prisma) return;
      try {
        const reports = await prisma.guardianReport.findMany({
          where: { agencyId, bookingId: { in: bookingIds } },
          select: { id: true },
        });
        const reportIds = reports.map((report) => report.id);
        await prisma.$transaction(async (tx) => {
          await tx.guardianEvent.deleteMany({
            where: { reportId: { in: reportIds } },
          });
          await tx.guardianFinding.deleteMany({
            where: { reportId: { in: reportIds } },
          });
          await tx.guardianEvidence.deleteMany({
            where: { reportId: { in: reportIds } },
          });
          await tx.guardianReport.deleteMany({
            where: { id: { in: reportIds }, agencyId },
          });
          await tx.booking.deleteMany({
            where: { id: { in: bookingIds }, agencyId },
          });
          await tx.customer.deleteMany({ where: { id: customerId, agencyId } });
          await tx.car.deleteMany({ where: { id: carId, agencyId } });
          await tx.user.deleteMany({ where: { id: renterId } });
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
          renterId,
          customerId,
          carId,
          startDate: new Date('2036-01-01T00:00:00Z'),
          endDate: new Date('2036-01-02T00:00:00Z'),
          totalPrice: 100,
        },
      });
    }

    async function report(status = 'CUSTOMER_REVIEW') {
      const b = await booking();
      const r = await prisma.guardianReport.create({
        data: {
          agencyId,
          bookingId: b.id,
          carId,
          phase: 'OUT',
          mode: 'QUICK',
          mileage: 100,
          fuelLevel: 8,
          createdById: staffId,
          status,
          agencyApprovedRevision: status === 'DRAFT' ? null : 1,
          customerApprovedRevision: status === 'MUTUALLY_APPROVED' ? 1 : null,
          publishedAt: status === 'DRAFT' ? null : new Date(),
          mutuallyApprovedAt:
            status === 'MUTUALLY_APPROVED' ? new Date() : null,
        },
      });
      for (const kind of ['OVERVIEW', 'FUEL', 'ODOMETER'])
        await evidence(r.id, kind, 'AGENCY', staffId);
      return r;
    }

    async function evidence(
      reportId: string,
      kind: string,
      side: string,
      actorId: string,
    ) {
      return prisma.guardianEvidence.create({
        data: {
          reportId,
          kind,
          storagePath: `guardian-state-test/${randomUUID()}`,
          sha256: randomUUID().replaceAll('-', '').repeat(2),
          filename: 'fixture.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5,
          uploadedById: actorId,
          uploadedByRole: side,
        },
      });
    }

    /** Both contenders must really be waiting on PostgreSQL locks before release. */
    async function waitForLocks(count: number) {
      const deadline = Date.now() + 4000;
      do {
        const [row] = await prisma.$queryRaw<
          { count: bigint }[]
        >`SELECT count(*)::bigint AS count FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE '%GuardianReport%'`;
        if (Number(row.count) >= count) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } while (Date.now() < deadline);
      throw new Error(
        'Concurrent Guardian requests did not reach PostgreSQL row locks.',
      );
    }

    it('serializes a renter finding against approval; only one revision can win', async () => {
      const r = await report();
      const photo = await evidence(r.id, 'DAMAGE', 'CUSTOMER', renterId);
      // An orphan photo already blocks approval. Link it to a reviewed finding
      // first, then use a separate valid photo for the competing correction.
      await prisma.guardianFinding.create({
        data: {
          reportId: r.id,
          zone: 'BONNET',
          kind: 'SCRATCH',
          photoId: photo.id,
          source: 'CUSTOMER',
          status: 'ACCEPTED',
        },
      });
      const correctionPhoto = await evidence(
        r.id,
        'DAMAGE',
        'CUSTOMER',
        renterId,
      );
      // The correction photo itself is not part of the approved baseline yet;
      // approve must fail while the competing finding advances revision 2.
      const locked = deferred();
      const release = deferred();
      const blocker = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "GuardianReport" WHERE id = ${r.id} FOR UPDATE`;
          locked.resolve();
          await release.promise;
        },
        { timeout: 15000 },
      );
      await locked.promise;
      const outcomes = Promise.allSettled([
        service.approveCustomer(renterId, r.id, 1),
        service.finding(renterId, 'CUSTOMER', r.id, {
          revision: 1,
          zone: 'FRONT_BUMPER',
          kind: 'DENT',
          photoId: correctionPhoto.id,
        }),
      ]);
      try {
        await waitForLocks(2);
      } finally {
        release.resolve();
      }
      await blocker;
      const results = await outcomes;
      expect(results[0]).toMatchObject({
        status: 'rejected',
        reason: expect.any(ConflictException),
      });
      expect(results[1].status).toBe('fulfilled');
      const current = await prisma.guardianReport.findUniqueOrThrow({
        where: { id: r.id },
      });
      expect(current).toMatchObject({
        revision: 2,
        status: 'CORRECTIONS_PENDING',
        agencyApprovedRevision: null,
        customerApprovedRevision: null,
      });
      expect(
        await prisma.guardianEvent.count({
          where: { reportId: r.id, action: 'APPROVED' },
        }),
      ).toBe(0);
    });

    it('rejects approval waiting behind an evidence upload and records the new revision', async () => {
      const r = await report();
      const entered = deferred();
      const release = deferred();
      storage.upload.mockImplementationOnce(async () => {
        entered.resolve();
        await release.promise;
      });
      const upload = service.upload(
        renterId,
        'CUSTOMER',
        r.id,
        'DAMAGE',
        file,
        undefined,
        1,
      );
      await entered.promise;
      const approval = Promise.allSettled([
        service.approveCustomer(renterId, r.id, 1),
      ]);
      try {
        await waitForLocks(1);
      } finally {
        release.resolve();
      }
      const saved = await upload;
      expect(saved.revision).toBe(2);
      expect((await approval)[0]).toMatchObject({
        status: 'rejected',
        reason: expect.any(ConflictException),
      });
      expect(
        await prisma.guardianReport.findUniqueOrThrow({ where: { id: r.id } }),
      ).toMatchObject({
        revision: 2,
        status: 'CORRECTIONS_PENDING',
        agencyApprovedRevision: null,
        customerApprovedRevision: null,
      });
      expect(
        await prisma.guardianEvent.findFirst({
          where: { reportId: r.id, action: 'EVIDENCE_UPLOADED' },
        }),
      ).toMatchObject({ revision: 2 });
    });

    it('makes concurrent same-revision approvals idempotent with one immutable event', async () => {
      const r = await report();
      const results = await Promise.all([
        service.approveCustomer(renterId, r.id, 1),
        service.approveCustomer(renterId, r.id, 1),
      ]);
      expect(
        results.every((result) => result.status === 'MUTUALLY_APPROVED'),
      ).toBe(true);
      expect(
        await prisma.guardianEvent.count({
          where: { reportId: r.id, action: 'APPROVED' },
        }),
      ).toBe(1);
      expect(
        await prisma.guardianReport.findUniqueOrThrow({ where: { id: r.id } }),
      ).toMatchObject({
        revision: 1,
        agencyApprovedRevision: 1,
        customerApprovedRevision: 1,
      });
    });

    it('rejects one of two concurrent finding edits based on the same stale revision', async () => {
      const r = await report();
      const first = await evidence(r.id, 'DAMAGE', 'CUSTOMER', renterId);
      const second = await evidence(r.id, 'DAMAGE', 'CUSTOMER', renterId);
      const results = await Promise.allSettled([
        service.finding(renterId, 'CUSTOMER', r.id, {
          revision: 1,
          zone: 'BONNET',
          kind: 'SCRATCH',
          photoId: first.id,
        }),
        service.finding(renterId, 'CUSTOMER', r.id, {
          revision: 1,
          zone: 'FRONT_BUMPER',
          kind: 'DENT',
          photoId: second.id,
        }),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toEqual([
        { status: 'rejected', reason: expect.any(ConflictException) },
      ]);
      expect(
        await prisma.guardianFinding.count({ where: { reportId: r.id } }),
      ).toBe(1);
      expect(
        await prisma.guardianReport.findUniqueOrThrow({ where: { id: r.id } }),
      ).toMatchObject({
        revision: 2,
        status: 'CORRECTIONS_PENDING',
        agencyApprovedRevision: null,
      });
      expect(
        await prisma.guardianEvent.count({
          where: { reportId: r.id, action: 'FINDING_ADDED' },
        }),
      ).toBe(1);
    });

    it('allows only one concurrent repair and preserves the original accepted baseline', async () => {
      const r = await report('MUTUALLY_APPROVED');
      const before = await evidence(r.id, 'DAMAGE', 'AGENCY', staffId);
      const after = await evidence(r.id, 'REPAIR', 'AGENCY', staffId);
      const f = await prisma.guardianFinding.create({
        data: {
          reportId: r.id,
          zone: 'BONNET',
          kind: 'DENT',
          photoId: before.id,
          description: 'Original baseline',
          source: 'AGENCY',
          status: 'ACCEPTED',
        },
      });
      const results = await Promise.allSettled([
        service.repair(agencyId, staffId, r.id, f.id, after.id, 1),
        service.repair(agencyId, staffId, r.id, f.id, after.id, 1),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toEqual([
        { status: 'rejected', reason: expect.any(NotFoundException) },
      ]);
      expect(
        await prisma.guardianFinding.findUniqueOrThrow({ where: { id: f.id } }),
      ).toMatchObject({
        status: 'ACCEPTED',
        photoId: before.id,
        description: 'Original baseline',
        repairPhotoId: after.id,
        repairedAt: expect.any(Date),
      });
      expect(
        await prisma.guardianEvent.count({
          where: { reportId: r.id, action: 'REPAIR_VERIFIED' },
        }),
      ).toBe(1);
      expect(
        await prisma.guardianReport.findUniqueOrThrow({ where: { id: r.id } }),
      ).toMatchObject({
        revision: 1,
        agencyApprovedRevision: 1,
        customerApprovedRevision: 1,
      });
    });

    it('atomically creates one report and its creation event under duplicate requests', async () => {
      const b = await booking();
      const input = {
        bookingId: b.id,
        phase: 'OUT' as const,
        mode: 'QUICK' as const,
        mileage: 100,
        fuelLevel: 8,
      };
      const results = await Promise.allSettled([
        service.create(agencyId, staffId, input),
        service.create(agencyId, staffId, input),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toEqual([
        { status: 'rejected', reason: expect.any(ConflictException) },
      ]);
      const reports = await prisma.guardianReport.findMany({
        where: { bookingId: b.id, agencyId },
        include: { events: true },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].events).toEqual([
        expect.objectContaining({
          action: 'CREATED',
          revision: 1,
          actorId: staffId,
        }),
      ]);
    });

    it('enforces canonical linked renter and rejects foreign scope on real rows', async () => {
      const r = await report();
      await expect(
        service.getCustomer(randomUUID(), r.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getStaff(randomUUID(), r.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.getStaff(undefined as unknown as string, r.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.approveCustomer(randomUUID(), r.id, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(
        await prisma.guardianEvent.count({ where: { reportId: r.id } }),
      ).toBe(0);
      expect(await service.getCustomer(renterId, r.id)).toMatchObject({
        id: r.id,
        revision: 1,
      });
    });
  },
);
