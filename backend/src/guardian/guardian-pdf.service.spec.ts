import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { GuardianPdfService } from './guardian-pdf.service';

const HASH =
  'a94d7d03f2a2b6109d413e6bf2edf428f04fca5d83783106532be0207f347ad23';
function fixture() {
  return {
    id: 'report-1',
    agencyId: 'agency-1',
    bookingId: 'booking-1',
    carId: 'car-1',
    phase: 'OUT',
    mode: 'QUICK',
    status: 'MUTUALLY_APPROVED',
    revision: 3,
    agencyApprovedRevision: 3,
    customerApprovedRevision: 3,
    mileage: 32100,
    fuelLevel: 6,
    createdAt: new Date('2026-11-11T08:00:00Z'),
    updatedAt: new Date('2026-11-11T09:05:00Z'),
    publishedAt: new Date('2026-11-11T09:00:00Z'),
    mutuallyApprovedAt: new Date('2026-11-11T09:05:00Z'),
    agency: { name: 'Agency & Partners' },
    car: {
      agencyId: 'agency-1',
      brand: 'Dacia',
      model: 'Sandero',
      licensePlate: '12345-A-6',
    },
    booking: {
      agencyId: 'agency-1',
      carId: 'car-1',
      renterId: 'renter-1' as string | null,
      customer: { agencyId: 'agency-1', userId: 'renter-1' },
    },
    findings: [
      {
        id: 'finding-1',
        reportId: 'report-1',
        zone: 'FRONT_BUMPER',
        kind: 'SCRATCH',
        description: 'Scratch close to the left light',
        source: 'AGENCY',
        status: 'ACCEPTED',
        photoId: 'photo-1',
        videoId: null,
        videoOffsetSec: null,
        agencyNote: null,
        repairPhotoId: null,
        repairedAt: null,
        createdAt: new Date('2026-11-11T08:10:00Z'),
        updatedAt: new Date('2026-11-11T08:10:00Z'),
      },
    ],
    evidence: [
      {
        id: 'photo-1',
        kind: 'DAMAGE',
        filename: 'bumper.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 512,
        sha256: HASH,
        createdAt: new Date('2026-11-11T08:05:00Z'),
      },
    ],
    events: [
      {
        id: 'old-publish',
        revision: 2,
        action: 'PUBLISHED',
        actorRole: 'AGENCY',
        createdAt: new Date('2026-11-11T08:30:00Z'),
      },
      {
        id: 'publish',
        revision: 3,
        action: 'PUBLISHED',
        actorRole: 'AGENCY',
        createdAt: new Date('2026-11-11T09:00:00Z'),
      },
      {
        id: 'approve',
        revision: 3,
        action: 'APPROVED',
        actorRole: 'CUSTOMER',
        createdAt: new Date('2026-11-11T09:05:00Z'),
      },
    ],
  };
}

function setup(report: any = fixture()) {
  const prisma: any = {
    guardianReport: { findFirst: jest.fn().mockResolvedValue(report) },
    $transaction: jest.fn((work: (tx: any) => unknown) => work(prisma)),
  };
  const service = new GuardianPdfService(prisma);
  const render = jest
    .spyOn(service as any, 'render')
    .mockResolvedValue(Buffer.from('%PDF-1.7\nmock'));
  return { prisma, service, render, report };
}

describe('GuardianPdfService authorization and snapshot exports', () => {
  it('queries a single repeatable-read snapshot scoped to the JWT agency before rendering', async () => {
    const { service, prisma, render } = setup();
    const pdf = await service.forStaff('agency-1', 'report-1');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(prisma.guardianReport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-1', agencyId: 'agency-1' },
      }),
    );
    expect(pdf.filename).toBe('guardian-report-1-r3.pdf');
    expect(pdf.revision).toBe(3);
    expect(render).toHaveBeenCalledTimes(1);
    const select = prisma.guardianReport.findFirst.mock.calls[0][0].select;
    expect(select.evidence.select.storagePath).toBeUndefined();
    expect(select.events.select.actorId).toBeUndefined();
    expect(select.events.select.details).toBeUndefined();
  });

  it('requires a linked renter and hides drafts in the PDF read query', async () => {
    const { service, prisma } = setup();
    await service.forCustomer('renter-1', 'report-1');
    expect(prisma.guardianReport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'report-1',
          status: { not: 'DRAFT' },
          OR: [
            { booking: { renterId: 'renter-1' } },
            { booking: { renterId: null, customer: { userId: 'renter-1' } } },
          ],
        },
      }),
    );
  });

  it.each(['staff', 'customer'])(
    'does not render foreign or nonexistent %s reports',
    async (side) => {
      const { service, render } = setup(null);
      await expect(
        side === 'staff'
          ? service.forStaff('agency-foreign', 'report-1')
          : service.forCustomer('renter-foreign', 'report-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(render).not.toHaveBeenCalled();
    },
  );

  it('fails closed on missing tenant or user instead of letting Prisma omit a filter', () => {
    const { service, prisma, render } = setup();
    expect(() => service.forStaff(undefined, 'report-1')).toThrow(
      NotFoundException,
    );
    expect(() => service.forCustomer(undefined, 'report-1')).toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it.each(['bookingAgency', 'carAgency', 'bookingCar'])(
    'rejects inconsistent cross-tenant linkage: %s',
    async (field) => {
      const report = fixture();
      if (field === 'bookingAgency') report.booking.agencyId = 'foreign';
      if (field === 'carAgency') report.car.agencyId = 'foreign';
      if (field === 'bookingCar') report.booking.carId = 'foreign';
      const { service, render } = setup(report);
      await expect(
        service.forStaff('agency-1', 'report-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(render).not.toHaveBeenCalled();
    },
  );

  it('rejects a customer row belonging to another agency', async () => {
    const report = fixture();
    report.booking.customer.agencyId = 'foreign';
    const { service, render } = setup(report);
    await expect(
      service.forCustomer('renter-1', 'report-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(render).not.toHaveBeenCalled();
  });

  it('prioritizes explicit booking renter over a conflicting customer user', async () => {
    const report = fixture();
    report.booking.customer.userId = 'different-renter';
    const { service, render } = setup(report);
    await expect(
      service.forCustomer('different-renter', 'report-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(render).not.toHaveBeenCalled();
    await expect(
      service.forCustomer('renter-1', 'report-1'),
    ).resolves.toMatchObject({ revision: 3 });
  });

  it('allows the same-agency claimed customer account only when no explicit booking renter exists', async () => {
    const report = fixture();
    report.booking.renterId = null;
    const { service } = setup(report);
    await expect(
      service.forCustomer('renter-1', 'report-1'),
    ).resolves.toMatchObject({ revision: 3 });
  });

  it('exports exact statuses, revision, approval event times, finding and original evidence hash', async () => {
    const { service, render } = setup();
    await service.forStaff('agency-1', 'report-1');
    const html = render.mock.calls[0][0] as string;
    for (const value of [
      'Dacia',
      'Sandero',
      '12345-A-6',
      'Departure',
      'Recorded fuel: 6/8 (eighths)',
      'Current revision 3',
      'MUTUALLY_APPROVED',
      '2026-11-11T09:00:00.000Z',
      '2026-11-11T09:05:00.000Z',
      'FRONT_BUMPER',
      'SCRATCH',
      'photo-1',
      HASH,
      'not a cryptographically signed document',
    ]) {
      expect(html).toContain(value);
    }
  });

  it('never labels historical approvals or stale timestamps as current revision approval', async () => {
    const report = fixture();
    report.status = 'CORRECTIONS_PENDING';
    report.revision = 4;
    report.agencyApprovedRevision = 3;
    report.customerApprovedRevision = 3;
    const { service, render } = setup(report);
    await service.forStaff('agency-1', 'report-1');
    const html = render.mock.calls[0][0] as string;
    expect(html).toContain('This revision is not mutually approved.');
    expect(html).toContain('Current revision published: Not recorded');
    expect(html).toContain('Current agency approval recorded: Not approved');
    expect(html).toContain('Current customer approval recorded: Not approved');
    expect(html).toContain(
      'Mutual approval for current revision: Not mutually approved',
    );
    expect(html).not.toContain('Both parties approved this revision.');
  });

  it('escapes every user-editable field, emits no media URL, and denies script/network sources', async () => {
    const report = fixture();
    const attack =
      '<img src="http://127.0.0.1:9999/private"><script>fetch("file:///etc/passwd")</script>';
    report.agency.name = attack;
    report.car.brand = attack;
    report.car.model = attack;
    report.car.licensePlate = attack;
    report.findings[0].description = attack;
    report.evidence[0].filename = attack;
    const { service, render } = setup(report);
    await service.forStaff('agency-1', 'report-1');
    const html = render.mock.calls[0][0] as string;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain(
      '&lt;img src=&quot;http://127.0.0.1:9999/private&quot;&gt;',
    );
    expect(html).toContain("script-src 'none'");
    expect(html).toContain('img-src data:');
    expect(html).not.toContain('<a ');
  });

  it('separates appended repair metadata from the original accepted finding', async () => {
    const report: any = fixture();
    report.findings[0].repairedAt = new Date('2026-11-12T10:00:00Z');
    report.findings[0].repairPhotoId = 'repair-1';
    report.evidence.push({
      ...report.evidence[0],
      id: 'repair-1',
      kind: 'REPAIR',
      sha256: 'b'.repeat(64),
    });
    const { service, render } = setup(report);
    await service.forStaff('agency-1', 'report-1');
    const html = render.mock.calls[0][0] as string;
    expect(html).toContain('Status: ACCEPTED');
    expect(html).toContain('Later repair verified: 2026-11-12T10:00:00.000Z');
    expect(html).toContain('the original finding remains recorded');
    expect(html).toContain('After-repair photograph evidence');
    expect(html).toContain(
      'they are not a new customer approval of the repaired condition',
    );
    expect(html).toContain(HASH);
    expect(html).toContain('b'.repeat(64));
  });
});

// Opt-in because ordinary Jest should not require an installed Chromium/PDF
// utility or start a browser on the resource-constrained development machine.
// Run: GUARDIAN_REAL_PDF_TEST=1 npx jest guardian-pdf.service --runInBand
(process.env.GUARDIAN_REAL_PDF_TEST === '1' ? describe : describe.skip)(
  'Guardian actual PDF export',
  () => {
    it('renders a real PDF and extracts its vehicle, approvals, finding and original SHA256', () => {
      const code = `
      const { GuardianPdfService } = require('./src/guardian/guardian-pdf.service.ts');
      let input = '';
      process.stdin.on('data', chunk => input += chunk);
      process.stdin.on('end', async () => {
        const report = JSON.parse(input);
        const tx = { guardianReport: { findFirst: async () => report } };
        const service = new GuardianPdfService({ $transaction: work => work(tx) });
        try { const result = await service.forStaff('agency-1', 'report-1'); process.stdout.write(result.buffer); }
        catch { process.exitCode = 1; }
      });`;
      const buffer = execFileSync(
        process.execPath,
        ['-r', 'ts-node/register/transpile-only', '-e', code],
        {
          cwd: process.cwd(),
          input: JSON.stringify(fixture()),
          timeout: 45000,
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buffer.subarray(-20).toString()).toContain('%%EOF');
      const text = execFileSync('pdftotext', ['-', '-'], {
        input: buffer,
        timeout: 10000,
      }).toString();
      expect(text).toContain('Guardian inspection report');
      expect(text).toContain('Dacia Sandero');
      expect(text).toContain('12345-A-6');
      expect(text).toContain('Current revision 3');
      expect(text).toContain('MUTUALLY_APPROVED');
      expect(text).toContain('2026-11-11T09:05:00.000Z');
      expect(text).toContain('SCRATCH');
      expect(text).toContain('photo-1');
      expect(text.replace(/\s/g, '')).toContain(HASH);
    }, 60000);
  },
);

describe('Guardian PDF private photo evidence', () => {
  it('embeds hash-verified images only after the tenant-scoped report lookup', async () => {
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
      'base64',
    );
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const report = fixture();
    report.evidence[0] = {
      ...report.evidence[0],
      mimeType: 'image/png',
      sizeBytes: bytes.length,
      sha256,
    };
    const prisma: any = {
      guardianReport: { findFirst: jest.fn().mockResolvedValue(report) },
      guardianEvidence: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'photo-1',
            storagePath: 'private/agency/secret-photo.png',
            mimeType: 'image/png',
            sizeBytes: bytes.length,
            sha256,
          },
        ]),
      },
    };
    prisma.$transaction = jest.fn(async (work: any) => work(prisma));
    const storage: any = {
      downloadEvidence: jest.fn().mockResolvedValue(bytes),
    };
    const service = new GuardianPdfService(prisma, storage);
    const render = jest
      .spyOn(service as any, 'render')
      .mockResolvedValue(Buffer.from('%PDF-1.7\nmock'));
    const output = await service.forStaff('agency-1', 'report-1');
    const html = render.mock.calls[0][0] as string;
    expect(output.filename).toBe('guardian-report-1-r3.pdf');
    expect(storage.downloadEvidence).toHaveBeenCalledWith(
      'private/agency/secret-photo.png',
    );
    expect(html).toContain(
      '<img class="evidence-img" src="data:image/png;base64,',
    );
    expect(html).toContain(
      '<img class="evidence-thumb" src="data:image/png;base64,',
    );
    expect(html).toContain('img-src data:');
    expect(html).not.toContain('private/agency/secret-photo.png');
  });

  it('omits mismatched image bytes instead of embedding misleading evidence', async () => {
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const report = fixture();
    report.evidence[0] = {
      ...report.evidence[0],
      mimeType: 'image/png',
      sizeBytes: bytes.length,
      sha256: '0'.repeat(64),
    };
    const prisma: any = {
      guardianReport: { findFirst: jest.fn().mockResolvedValue(report) },
      guardianEvidence: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'photo-1',
            storagePath: 'private/file.png',
            mimeType: 'image/png',
            sizeBytes: bytes.length,
            sha256: '0'.repeat(64),
          },
        ]),
      },
    };
    prisma.$transaction = jest.fn(async (work: any) => work(prisma));
    const service = new GuardianPdfService(prisma, {
      downloadEvidence: jest.fn().mockResolvedValue(bytes),
    } as any);
    const render = jest
      .spyOn(service as any, 'render')
      .mockResolvedValue(Buffer.from('%PDF-1.7\nmock'));
    await service.forStaff('agency-1', 'report-1');
    const html = render.mock.calls[0][0] as string;
    expect(html).toContain('Photo unavailable in this PDF');
    expect(html).not.toContain('<img class="evidence-img"');
  });
});
