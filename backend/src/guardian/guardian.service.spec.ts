import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GuardianService } from './guardian.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GuardianDecisionDto,
  GuardianEvidenceDto,
  GuardianFindingDto,
  GuardianRepairDto,
} from './guardian.dto';

const STAFF = 'staff-1';
const RENTER = 'renter-1';
const AGENCY = 'agency-1';
const REPORT = 'report-1';
const BOOKING = 'booking-1';

type Finding = {
  id: string;
  reportId: string;
  zone: string;
  kind: string;
  description: string;
  photoId: string;
  videoId?: string;
  source: string;
  status: string;
  agencyNote?: string;
  repairPhotoId?: string;
  repairedAt?: Date;
};
type Evidence = {
  id: string;
  reportId: string;
  kind: string;
  uploadedById: string;
  uploadedByRole: string;
  storagePath: string;
  sha256: string;
  mimeType: string;
};
function setup(status = 'DRAFT') {
  const report: any = {
    id: REPORT,
    agencyId: AGENCY,
    bookingId: BOOKING,
    carId: 'car-1',
    car: { agencyId: AGENCY },
    status,
    phase: 'OUT',
    mode: 'QUICK',
    revision: 1,
    agencyApprovedRevision: ['CUSTOMER_REVIEW', 'MUTUALLY_APPROVED'].includes(
      status,
    )
      ? 1
      : null,
    customerApprovedRevision: status === 'MUTUALLY_APPROVED' ? 1 : null,
    publishedAt: status === 'DRAFT' ? null : new Date('2026-11-11T01:00:00Z'),
    mutuallyApprovedAt:
      status === 'MUTUALLY_APPROVED' ? new Date('2026-11-11T02:00:00Z') : null,
  };
  const booking = {
    id: BOOKING,
    agencyId: AGENCY,
    carId: 'car-1',
    renterId: RENTER,
    customer: { userId: RENTER, agencyId: AGENCY },
    car: { agencyId: AGENCY },
  };
  const evidence: Evidence[] = [];
  const findings: Finding[] = [];
  const events: any[] = [];
  const hydrated = () => ({
    ...report,
    booking: { ...booking, customer: { ...booking.customer } },
    evidence: [...evidence],
    findings: findings.map((f) => ({
      ...f,
      photo: evidence.find((e) => e.id === f.photoId),
      video: evidence.find((e) => e.id === f.videoId),
      repairPhoto: evidence.find((e) => e.id === f.repairPhotoId),
    })),
    events: [...events],
  });
  const matchesReport = (where: any) =>
    (!where.id || where.id === report.id) &&
    (!where.agencyId || where.agencyId === report.agencyId) &&
    where.status?.not !== report.status &&
    (!where.OR ||
      where.OR.some(
        (condition: any) =>
          condition.booking?.renterId === booking.renterId &&
          (!condition.booking?.customer ||
            condition.booking.customer.userId === booking.customer.userId),
      ));
  const prisma: any = {
    guardianReport: {
      findFirst: jest.fn(async ({ where }: any) =>
        matchesReport(where) ? hydrated() : null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        matchesReport(where) ? [hydrated()] : [],
      ),
      findUnique: jest.fn(async ({ where }: any) =>
        where.bookingId_phase
          ? where.bookingId_phase.bookingId === report.bookingId
            ? report
            : null
          : null,
      ),
      update: jest.fn(async ({ data }: any) => {
        for (const [key, value] of Object.entries(data)) {
          if (
            typeof value === 'object' &&
            value !== null &&
            'increment' in value
          ) {
            report[key] += Number((value as any).increment);
          } else report[key] = value;
        }
        return { ...report };
      }),
      create: jest.fn(async ({ data }: any) => ({
        id: 'new-1',
        revision: 1,
        ...data,
      })),
    },
    guardianEvidence: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          evidence.find(
            (e) =>
              (!where.id || e.id === where.id) &&
              e.reportId === where.reportId &&
              (!where.kind || e.kind === where.kind) &&
              (!where.sha256 || e.sha256 === where.sha256) &&
              (!where.uploadedById || e.uploadedById === where.uploadedById) &&
              (!where.uploadedByRole ||
                e.uploadedByRole === where.uploadedByRole),
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: 'media-' + (evidence.length + 1), ...data };
        evidence.push(row);
        return row;
      }),
    },
    guardianFinding: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          findings.find(
            (f) =>
              (!where.id || f.id === where.id) &&
              (!where.reportId || f.reportId === where.reportId) &&
              (!where.photoId || f.photoId === where.photoId) &&
              (!where.repairPhotoId ||
                f.repairPhotoId === where.repairPhotoId) &&
              (!where.OR ||
                where.OR.some((condition: any) =>
                  condition.photoId
                    ? f.photoId === condition.photoId
                    : condition.repairPhotoId
                      ? f.repairPhotoId === condition.repairPhotoId
                      : condition.photo?.sha256
                        ? evidence.find((e) => e.id === f.photoId)?.sha256 ===
                          condition.photo.sha256
                        : condition.repairPhoto?.sha256
                          ? evidence.find((e) => e.id === f.repairPhotoId)
                              ?.sha256 === condition.repairPhoto.sha256
                          : false,
                )) &&
              (!where.source || f.source === where.source) &&
              (where.repairedAt !== null || !f.repairedAt) &&
              (!where.status ||
                (typeof where.status === 'string'
                  ? f.status === where.status
                  : where.status.in.includes(f.status))),
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: 'finding-' + (findings.length + 1), ...data };
        findings.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = findings.find((f) => f.id === where.id)!;
        Object.assign(row, data);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        findings.filter(
          (f) =>
            f.status === where.status &&
            !(f as Finding & { repairedAt?: Date }).repairedAt &&
            report.carId === where.report.carId,
        ),
      ),
    },
    guardianEvent: {
      create: jest.fn(async ({ data }: any) => {
        const e = { id: String(events.length + 1), ...data };
        events.push(e);
        return e;
      }),
    },
    car: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === report.carId && where.agencyId === AGENCY
          ? { id: report.carId }
          : null,
      ),
    },
    booking: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === BOOKING && where.agencyId === AGENCY ? booking : null,
      ),
    },
    $queryRaw: jest.fn(async () => [{ id: REPORT }]),
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const storage = {
    upload: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
    createSignedUrl: jest.fn(
      async () => 'https://example.invalid/private-signed-url',
    ),
  };
  const service = new GuardianService(prisma, storage as any);
  function addEvidence(kind: string, side = 'AGENCY', uploader = STAFF) {
    const media: Evidence = {
      id: 'media-' + (evidence.length + 1),
      reportId: REPORT,
      kind,
      uploadedByRole: side,
      uploadedById: uploader,
      storagePath: 'private/test',
      sha256: (evidence.length + 1).toString(16).padStart(64, '0'),
      mimeType: 'image/jpeg',
    };
    evidence.push(media);
    return media.id;
  }
  const file = {
    originalname: 'damage.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]),
    size: 5,
  } as Express.Multer.File;
  return {
    service,
    prisma,
    storage,
    report,
    booking,
    evidence,
    findings,
    events,
    addEvidence,
    file,
  };
}

describe('Guardian Vision mutual evidence and approval', () => {
  it('fail-closes on another tenant and a different customer', async () => {
    const { service, report } = setup('CUSTOMER_REVIEW');
    await expect(
      service.getStaff('other-agency', report.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getCustomer('unrelated-renter', report.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getStaff(AGENCY, report.id)).resolves.toHaveProperty(
      'id',
      REPORT,
    );
    await expect(
      service.getCustomer(RENTER, report.id),
    ).resolves.toHaveProperty('id', REPORT);
  });

  it('requires real baseline media and matching report revision before approval', async () => {
    const t = setup();
    await expect(
      t.service.publish(AGENCY, STAFF, REPORT, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    t.addEvidence('OVERVIEW');
    t.addEvidence('FUEL');
    t.addEvidence('ODOMETER');
    await expect(
      t.service.publish(AGENCY, STAFF, REPORT, 12),
    ).rejects.toBeInstanceOf(ConflictException);
    const published = await t.service.publish(AGENCY, STAFF, REPORT, 1);
    expect(published.status).toBe('CUSTOMER_REVIEW');
    await expect(
      t.service.approveCustomer(RENTER, REPORT, 2),
    ).rejects.toBeInstanceOf(ConflictException);
    const approved = await t.service.approveCustomer(RENTER, REPORT, 1);
    expect(approved.status).toBe('MUTUALLY_APPROVED');
    expect(t.report.agencyApprovedRevision).toBe(
      t.report.customerApprovedRevision,
    );
    expect(t.events.map((e) => e.action)).toEqual(['PUBLISHED', 'APPROVED']);
  });

  it('saves individual customer photographic evidence and blocks approval until attached to finding', async () => {
    const t = setup('CUSTOMER_REVIEW');
    const uploaded = await t.service.upload(
      RENTER,
      'CUSTOMER',
      REPORT,
      'DAMAGE',
      t.file,
      undefined,
      1,
    );
    expect(t.storage.upload).toHaveBeenCalledTimes(1);
    expect(uploaded.sha256).toHaveLength(64);
    await expect(
      t.service.approveCustomer(RENTER, REPORT, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.finding(RENTER, 'CUSTOMER', REPORT, {
        revision: uploaded.revision,
        zone: 'FRONT_LEFT_DOOR',
        kind: 'SCRATCH',
        photoId: uploaded.id,
        description: 'Missing scratch, added by renter',
      }),
    ).resolves.toHaveProperty('status', 'PROPOSED');
    expect(t.report.revision).toBe(3);
    expect(t.report.agencyApprovedRevision).toBeNull();
    expect(t.report.status).toBe('CORRECTIONS_PENDING');
    await expect(
      t.service.publish(AGENCY, STAFF, REPORT, 3),
    ).rejects.toBeInstanceOf(BadRequestException);
    t.addEvidence('OVERVIEW');
    t.addEvidence('FUEL');
    t.addEvidence('ODOMETER');
    await expect(
      t.service.publish(AGENCY, STAFF, REPORT, 3),
    ).rejects.toBeInstanceOf(ConflictException);
    await t.service.decide(
      AGENCY,
      STAFF,
      REPORT,
      t.findings[0].id,
      'ACCEPT',
      undefined,
      3,
    );
    const published = await t.service.publish(AGENCY, STAFF, REPORT, 4);
    expect(published.agencyApprovedRevision).toBe(4);
    const approved = await t.service.approveCustomer(RENTER, REPORT, 4);
    expect(approved.status).toBe('MUTUALLY_APPROVED');
    expect(t.findings[0].status).toBe('ACCEPTED');
    expect(t.events.map((e) => e.action)).toContain('CORRECTION_ACCEPT');
  });

  it('enforces agency media state and no premature repair', async () => {
    const t = setup('CUSTOMER_REVIEW');
    await expect(
      t.service.upload(STAFF, 'AGENCY', REPORT, 'DAMAGE', t.file, AGENCY, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.upload(STAFF, 'AGENCY', REPORT, 'REPAIR', t.file, AGENCY, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    t.report.status = 'DRAFT';
    await expect(
      t.service.upload(STAFF, 'AGENCY', REPORT, 'REPAIR', t.file, AGENCY, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    const photoId = t.addEvidence('DAMAGE');
    const f = await t.service.finding(
      STAFF,
      'AGENCY',
      REPORT,
      {
        revision: t.report.revision,
        zone: 'FRONT_BUMPER',
        kind: 'DENT',
        photoId,
      },
      AGENCY,
    );
    await expect(
      t.service.repair(AGENCY, STAFF, REPORT, f.id, photoId, t.report.revision),
    ).rejects.toBeInstanceOf(ConflictException);
    t.report.status = 'MUTUALLY_APPROVED';
    t.report.agencyApprovedRevision = t.report.revision;
    t.report.customerApprovedRevision = t.report.revision;
    const repairPhoto = t.addEvidence('REPAIR');
    await t.service.repair(
      AGENCY,
      STAFF,
      REPORT,
      f.id,
      repairPhoto,
      t.report.revision,
    );
    expect(t.findings[0].status).toBe('ACCEPTED');
    expect(
      (t.findings[0] as Finding & { repairedAt?: Date }).repairedAt,
    ).toBeInstanceOf(Date);
    await expect(
      t.service.activeCarDamage(AGENCY, t.report.carId),
    ).resolves.toEqual([]);
  });

  it('does not reuse the same close-up photo for a second distinct defect', async () => {
    const t = setup('DRAFT');
    const photoId = t.addEvidence('DAMAGE');
    await t.service.finding(
      STAFF,
      'AGENCY',
      REPORT,
      {
        revision: t.report.revision,
        zone: 'FRONT_LEFT_DOOR',
        kind: 'SCRATCH',
        photoId,
      },
      AGENCY,
    );
    await expect(
      t.service.finding(
        STAFF,
        'AGENCY',
        REPORT,
        {
          revision: t.report.revision,
          zone: 'FRONT_LEFT_DOOR',
          kind: 'DENT',
          photoId,
        },
        AGENCY,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.findings).toHaveLength(1);
  });

  it('rejects forged photo ownership, cross-report media and invalid image bytes', async () => {
    const t = setup('CUSTOMER_REVIEW');
    const wrong = t.addEvidence('DAMAGE', 'AGENCY', STAFF);
    await expect(
      t.service.finding(RENTER, 'CUSTOMER', REPORT, {
        revision: t.report.revision,
        zone: 'FRONT_BUMPER',
        kind: 'SCRATCH',
        photoId: wrong,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      t.service.upload(
        RENTER,
        'CUSTOMER',
        REPORT,
        'DAMAGE',
        {
          ...t.file,
          buffer: Buffer.from('invalid'),
          size: 7,
        },
        undefined,
        t.report.revision,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.storage.upload).not.toHaveBeenCalled();
  });

  it('rejects missing authenticated scope before Prisma can omit its filter', async () => {
    const t = setup('CUSTOMER_REVIEW');
    await expect(
      t.service.getStaff(undefined as any, REPORT),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.getCustomer(undefined as any, REPORT),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.staffBooking(undefined as any, BOOKING),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.activeCarDamage(undefined as any, 'car-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.listCustomer(undefined as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(t.prisma.guardianReport.findFirst).not.toHaveBeenCalled();
    expect(t.prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(t.prisma.car.findFirst).not.toHaveBeenCalled();
  });

  it('never exposes draft reports or signed media URLs to renters or foreign tenants', async () => {
    const t = setup();
    const photo = t.addEvidence('DAMAGE');
    await expect(t.service.getCustomer(RENTER, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      t.service.mediaUrl(RENTER, 'CUSTOMER', REPORT, photo),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.mediaUrl(STAFF, 'AGENCY', REPORT, photo, 'foreign'),
    ).rejects.toBeInstanceOf(NotFoundException);
    t.report.status = 'CUSTOMER_REVIEW';
    await expect(
      t.service.mediaUrl('foreign-renter', 'CUSTOMER', REPORT, photo),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.mediaUrl(RENTER, 'CUSTOMER', REPORT, 'other-report-photo'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(t.storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it('rejects unauthorized write attempts before storing bytes or changing report state', async () => {
    const t = setup('CUSTOMER_REVIEW');
    const photoId = t.addEvidence('DAMAGE');
    const foreign = 'foreign-renter';
    const requests = [
      t.service.upload(
        foreign,
        'CUSTOMER',
        REPORT,
        'DAMAGE',
        t.file,
        undefined,
        1,
      ),
      t.service.finding(foreign, 'CUSTOMER', REPORT, {
        revision: 1,
        zone: 'FRONT_BUMPER',
        kind: 'SCRATCH',
        photoId,
      }),
      t.service.approveCustomer(foreign, REPORT, 1),
      t.service.disputeCustomer(foreign, REPORT, 'Unrelated renter', 1),
      t.service.publish('foreign-agency', STAFF, REPORT, 1),
      t.service.reopen('foreign-agency', STAFF, REPORT, 'Unrelated staff', 1),
      t.service.decide(
        'foreign-agency',
        STAFF,
        REPORT,
        'f-1',
        'ACCEPT',
        undefined,
        1,
      ),
      t.service.repair('foreign-agency', STAFF, REPORT, 'f-1', photoId, 1),
    ];
    const outcomes = await Promise.allSettled(requests);
    expect(
      outcomes.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof NotFoundException,
      ),
    ).toBe(true);
    expect(t.storage.upload).not.toHaveBeenCalled();
    expect(t.prisma.guardianReport.update).not.toHaveBeenCalled();
    expect(t.prisma.guardianFinding.create).not.toHaveBeenCalled();
    expect(t.events).toEqual([]);
  });

  it('invalidates the published revision as soon as customer evidence is uploaded', async () => {
    const t = setup('CUSTOMER_REVIEW');
    const uploaded = await t.service.upload(
      RENTER,
      'CUSTOMER',
      REPORT,
      'DAMAGE',
      t.file,
      undefined,
      1,
    );
    expect(uploaded.revision).toBe(2);
    expect(t.report).toMatchObject({
      revision: 2,
      status: 'CORRECTIONS_PENDING',
      agencyApprovedRevision: null,
      customerApprovedRevision: null,
      publishedAt: null,
      mutuallyApprovedAt: null,
    });
    expect(t.events[0]).toMatchObject({
      revision: 2,
      action: 'EVIDENCE_UPLOADED',
      details: { evidenceId: uploaded.id, sha256: uploaded.sha256 },
    });
    await expect(
      t.service.approveCustomer(RENTER, REPORT, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.upload(
        RENTER,
        'CUSTOMER',
        REPORT,
        'DAMAGE',
        t.file,
        undefined,
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.storage.upload).toHaveBeenCalledTimes(1);
  });

  it('retains the existing approval and revision when storage rejects an upload', async () => {
    const t = setup('CUSTOMER_REVIEW');
    t.storage.upload.mockRejectedValueOnce(
      new Error('Storage unavailable'),
    );
    await expect(
      t.service.upload(
        RENTER,
        'CUSTOMER',
        REPORT,
        'DAMAGE',
        t.file,
        undefined,
        1,
      ),
    ).rejects.toThrow('Storage unavailable');
    expect(t.report).toMatchObject({
      revision: 1,
      status: 'CUSTOMER_REVIEW',
      agencyApprovedRevision: 1,
    });
    expect(t.prisma.guardianEvidence.create).not.toHaveBeenCalled();
    expect(t.prisma.guardianReport.update).not.toHaveBeenCalled();
    expect(t.events).toEqual([]);
  });

  it('does not allow orphaned staff damage photos to be silently published', async () => {
    const t = setup();
    for (const kind of ['OVERVIEW', 'FUEL', 'ODOMETER', 'DAMAGE'])
      t.addEvidence(kind);
    await expect(
      t.service.publish(AGENCY, STAFF, REPORT, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.report.status).toBe('DRAFT');
    expect(t.events).toEqual([]);
    // Defence in depth against historical malformed published rows.
    t.report.status = 'CUSTOMER_REVIEW';
    t.report.agencyApprovedRevision = 1;
    await expect(
      t.service.approveCustomer(RENTER, REPORT, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects stale findings, decisions and repairs without writes', async () => {
    const t = setup('CORRECTIONS_PENDING');
    t.report.revision = 4;
    const photoId = t.addEvidence('DAMAGE');
    await expect(
      t.service.finding(
        STAFF,
        'AGENCY',
        REPORT,
        { revision: 3, zone: 'FRONT_BUMPER', kind: 'DENT', photoId },
        AGENCY,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.decide(
        AGENCY,
        STAFF,
        REPORT,
        'finding-1',
        'ACCEPT',
        undefined,
        3,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.repair(AGENCY, STAFF, REPORT, 'finding-1', photoId, 3),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.prisma.guardianFinding.create).not.toHaveBeenCalled();
    expect(t.prisma.guardianFinding.update).not.toHaveBeenCalled();
    expect(t.prisma.guardianReport.update).not.toHaveBeenCalled();
  });

  it('preserves one sealed approval event on an exact-revision retry', async () => {
    const t = setup('CUSTOMER_REVIEW');
    await t.service.approveCustomer(RENTER, REPORT, 1);
    const approvedAt = t.report.mutuallyApprovedAt;
    await t.service.approveCustomer(RENTER, REPORT, 1);
    expect(
      t.events.filter((event) => event.action === 'APPROVED'),
    ).toHaveLength(1);
    expect(t.report.mutuallyApprovedAt).toBe(approvedAt);
    await expect(
      t.service.approveCustomer('foreign-renter', REPORT, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.approveCustomer(RENTER, REPORT, 2),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.disputeCustomer(RENTER, REPORT, 'Late dispute', 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves the dispute until staff explicitly reopen or review the new proposed finding', async () => {
    const t = setup('CUSTOMER_REVIEW');
    await t.service.disputeCustomer(RENTER, REPORT, 'Please check the door', 1);
    expect(t.report).toMatchObject({
      revision: 2,
      status: 'DISPUTED',
      agencyApprovedRevision: null,
      publishedAt: null,
    });
    const photoId = t.addEvidence('DAMAGE', 'CUSTOMER', RENTER);
    await t.service.finding(RENTER, 'CUSTOMER', REPORT, {
      revision: 2,
      zone: 'FRONT_LEFT_DOOR',
      kind: 'SCRATCH',
      photoId,
    });
    expect(t.report.status).toBe('DISPUTED');
    await expect(
      t.service.reopen(AGENCY, STAFF, REPORT, 'Check again', 2),
    ).rejects.toBeInstanceOf(ConflictException);
    await t.service.reopen(AGENCY, STAFF, REPORT, 'Check again', 3);
    expect(t.report).toMatchObject({
      revision: 4,
      status: 'CORRECTIONS_PENDING',
    });
  });

  it('binds each damage and repair photo to the actual uploader', async () => {
    const t = setup();
    const photoId = t.addEvidence('DAMAGE', 'AGENCY', 'other-staff');
    await expect(
      t.service.finding(
        STAFF,
        'AGENCY',
        REPORT,
        { revision: 1, zone: 'FRONT_BUMPER', kind: 'DENT', photoId },
        AGENCY,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    t.report.status = 'MUTUALLY_APPROVED';
    t.report.agencyApprovedRevision = 1;
    t.report.customerApprovedRevision = 1;
    t.findings.push({
      id: 'finding-1',
      reportId: REPORT,
      zone: 'FRONT_BUMPER',
      kind: 'DENT',
      description: '',
      photoId,
      source: 'AGENCY',
      status: 'ACCEPTED',
    });
    const repairId = t.addEvidence('REPAIR', 'AGENCY', 'other-staff');
    await expect(
      t.service.repair(AGENCY, STAFF, REPORT, 'finding-1', repairId, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('appends repairs without changing approval revisions or rewriting original findings', async () => {
    const t = setup('MUTUALLY_APPROVED');
    const photoId = t.addEvidence('DAMAGE');
    t.findings.push({
      id: 'finding-1',
      reportId: REPORT,
      zone: 'FRONT_BUMPER',
      kind: 'DENT',
      description: 'Original dent',
      photoId,
      source: 'AGENCY',
      status: 'ACCEPTED',
    });
    const repair = await t.service.upload(
      STAFF,
      'AGENCY',
      REPORT,
      'REPAIR',
      t.file,
      AGENCY,
      1,
    );
    await t.service.repair(AGENCY, STAFF, REPORT, 'finding-1', repair.id, 1);
    expect(t.report).toMatchObject({
      revision: 1,
      agencyApprovedRevision: 1,
      customerApprovedRevision: 1,
      status: 'MUTUALLY_APPROVED',
    });
    expect(t.findings[0]).toMatchObject({
      photoId,
      description: 'Original dent',
      status: 'ACCEPTED',
      repairPhotoId: repair.id,
    });
    expect(t.events.map((event) => event.action)).toEqual([
      'EVIDENCE_UPLOADED',
      'REPAIR_VERIFIED',
    ]);
    await expect(
      t.service.repair(AGENCY, STAFF, REPORT, 'finding-1', repair.id, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(t.events).toHaveLength(2);
    await expect(
      t.service.finding(
        STAFF,
        'AGENCY',
        REPORT,
        { revision: 1, zone: 'FRONT_BUMPER', kind: 'DENT', photoId },
        AGENCY,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires both actual matching approvals before uploading or verifying repairs', async () => {
    const t = setup('MUTUALLY_APPROVED');
    t.report.customerApprovedRevision = null;
    const photoId = t.addEvidence('DAMAGE');
    t.findings.push({
      id: 'finding-1',
      reportId: REPORT,
      zone: 'FRONT_BUMPER',
      kind: 'DENT',
      description: '',
      photoId,
      source: 'AGENCY',
      status: 'ACCEPTED',
    });
    const repairPhoto = t.addEvidence('REPAIR');
    await expect(
      t.service.upload(STAFF, 'AGENCY', REPORT, 'REPAIR', t.file, AGENCY, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      t.service.repair(AGENCY, STAFF, REPORT, 'finding-1', repairPhoto, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.storage.upload).not.toHaveBeenCalled();
  });

  it('locks the report before loading its mutable state', async () => {
    const t = setup('CUSTOMER_REVIEW');
    await t.service.approveCustomer(RENTER, REPORT, 1);
    expect(t.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 60000,
    });
    const [sql, id] = t.prisma.$queryRaw.mock.calls[0];
    expect(sql.join('?')).toBe(
      'SELECT id FROM "GuardianReport" WHERE id = ? FOR UPDATE',
    );
    expect(id).toBe(REPORT);
    expect(t.prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      t.prisma.guardianReport.findFirst.mock.invocationCallOrder[0],
    );
    expect(
      t.prisma.guardianReport.update.mock.invocationCallOrder[0],
    ).toBeLessThan(t.prisma.guardianEvent.create.mock.invocationCallOrder[0]);
  });

  it('requires revision preconditions at every evidence mutation DTO boundary', async () => {
    for (const Dto of [
      GuardianEvidenceDto,
      GuardianFindingDto,
      GuardianDecisionDto,
      GuardianRepairDto,
    ]) {
      const result = await validate(plainToInstance(Dto as any, {}));
      expect(result.some((error) => error.property === 'revision')).toBe(true);
    }
    const multipart = plainToInstance(GuardianEvidenceDto, {
      kind: 'DAMAGE',
      revision: '4',
    });
    expect(multipart.revision).toBe(4);
    expect(await validate(multipart)).toEqual([]);
    const invalid = plainToInstance(GuardianEvidenceDto, {
      kind: 'DAMAGE',
      revision: 'not-a-revision',
    });
    expect(
      (await validate(invalid)).some((error) => error.property === 'revision'),
    ).toBe(true);
  });

  it('gives an explicit booking renter precedence over a conflicting customer account', async () => {
    const t = setup('CUSTOMER_REVIEW');
    t.booking.customer.userId = 'different-customer-account';
    await expect(
      t.service.getCustomer('different-customer-account', REPORT),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.listCustomer('different-customer-account'),
    ).resolves.toEqual([]);
    await expect(t.service.getCustomer(RENTER, REPORT)).resolves.toHaveProperty(
      'id',
      REPORT,
    );
    t.booking.renterId = null as any;
    await expect(
      t.service.getCustomer('different-customer-account', REPORT),
    ).resolves.toHaveProperty('id', REPORT);
    await expect(t.service.getCustomer(RENTER, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('fails closed on corrupted cross-agency booking/customer links and mismatched cars', async () => {
    const t = setup('CUSTOMER_REVIEW');
    t.booking.customer.agencyId = 'foreign-agency';
    await expect(t.service.getCustomer(RENTER, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(t.service.getStaff(AGENCY, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(t.service.listCustomer(RENTER)).resolves.toEqual([]);
    t.booking.customer.agencyId = AGENCY;
    t.booking.agencyId = 'foreign-agency';
    await expect(t.service.getStaff(AGENCY, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    t.booking.agencyId = AGENCY;
    t.booking.carId = 'wrong-car';
    await expect(t.service.getCustomer(RENTER, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    t.booking.carId = t.report.carId;
    t.report.car.agencyId = 'foreign-agency';
    await expect(t.service.getStaff(AGENCY, REPORT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(t.storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it('rejects duplicate damage and repair bytes before creating an orphan storage object', async () => {
    for (const kind of ['DAMAGE', 'REPAIR']) {
      const t = setup(kind === 'REPAIR' ? 'MUTUALLY_APPROVED' : 'DRAFT');
      const uploaded = await t.service.upload(
        STAFF,
        'AGENCY',
        REPORT,
        kind,
        t.file,
        AGENCY,
        1,
      );
      await expect(
        t.service.upload(
          STAFF,
          'AGENCY',
          REPORT,
          kind,
          t.file,
          AGENCY,
          uploaded.revision,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(t.storage.upload).toHaveBeenCalledTimes(1);
      expect(t.evidence).toHaveLength(1);
      expect(t.events).toHaveLength(1);
    }
  });

  it('does not reuse identical photo bytes for a second defect through another evidence ID', async () => {
    const t = setup();
    const first = t.addEvidence('DAMAGE');
    const second = t.addEvidence('DAMAGE');
    t.evidence[1].sha256 = t.evidence[0].sha256;
    await t.service.finding(
      STAFF,
      'AGENCY',
      REPORT,
      { revision: 1, zone: 'BONNET', kind: 'SCRATCH', photoId: first },
      AGENCY,
    );
    await expect(
      t.service.finding(
        STAFF,
        'AGENCY',
        REPORT,
        { revision: 2, zone: 'FRONT_BUMPER', kind: 'DENT', photoId: second },
        AGENCY,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.findings).toHaveLength(1);
    expect(t.report.revision).toBe(2);
  });

  it('does not reuse identical repair bytes for a second repair through another evidence ID', async () => {
    const t = setup('MUTUALLY_APPROVED');
    const before1 = t.addEvidence('DAMAGE');
    const before2 = t.addEvidence('DAMAGE');
    const after1 = t.addEvidence('REPAIR');
    const after2 = t.addEvidence('REPAIR');
    t.evidence[3].sha256 = t.evidence[2].sha256;
    for (const [index, photoId] of [before1, before2].entries())
      t.findings.push({
        id: `finding-${index}`,
        reportId: REPORT,
        zone: 'BONNET',
        kind: 'DENT',
        description: '',
        photoId,
        source: 'AGENCY',
        status: 'ACCEPTED',
      });
    await t.service.repair(AGENCY, STAFF, REPORT, 'finding-0', after1, 1);
    await expect(
      t.service.repair(AGENCY, STAFF, REPORT, 'finding-1', after2, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.findings[1].repairedAt).toBeUndefined();
    expect(
      t.events.filter((event) => event.action === 'REPAIR_VERIFIED'),
    ).toHaveLength(1);
  });
});
