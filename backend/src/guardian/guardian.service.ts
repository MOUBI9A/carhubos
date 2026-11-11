import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';

export const ZONES = [
  'FRONT_BUMPER',
  'BONNET',
  'WINDSCREEN',
  'ROOF',
  'REAR_WINDOW',
  'BOOT',
  'REAR_BUMPER',
  'FRONT_LEFT_WING',
  'FRONT_LEFT_DOOR',
  'REAR_LEFT_DOOR',
  'FRONT_RIGHT_WING',
  'FRONT_RIGHT_DOOR',
  'REAR_RIGHT_DOOR',
  'FRONT_LEFT_WHEEL',
  'FRONT_RIGHT_WHEEL',
  'REAR_LEFT_WHEEL',
  'REAR_RIGHT_WHEEL',
  'INTERIOR',
  'OTHER',
] as const;
export const MEDIA_KINDS = [
  'OVERVIEW',
  'ODOMETER',
  'FUEL',
  'DAMAGE',
  'VIDEO',
  'REPAIR',
] as const;
const details = {
  car: { select: { agencyId: true } },
  booking: {
    select: {
      agencyId: true,
      carId: true,
      renterId: true,
      customer: { select: { agencyId: true, userId: true } },
    },
  },
  findings: { include: { photo: true, video: true, repairPhoto: true } },
  evidence: true,
  events: { orderBy: { createdAt: 'asc' as const } },
};
type Side = 'AGENCY' | 'CUSTOMER';

@Injectable()
export class GuardianService {
  constructor(
    private prisma: PrismaService,
    private storage: VaultStorageService,
  ) {}
  /** Serialize all mutations on the report row, then re-read state inside the transaction.
   * This also makes findings, approval revisions and audit events commit together. */
  private mutate<T>(
    id: string,
    work: (service: GuardianService) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "GuardianReport" WHERE id = ${id} FOR UPDATE`;
        return work(new GuardianService(tx as PrismaService, this.storage));
      },
      { timeout: 60000 },
    );
  }
  upload(
    actorId: string,
    side: Side,
    id: string,
    kind: string,
    file: Express.Multer.File,
    agencyId: string | undefined,
    revision: number,
  ) {
    return this.mutate(id, (s) =>
      s.uploadLocked(actorId, side, id, kind, file, agencyId, revision),
    );
  }
  finding(
    actorId: string,
    side: Side,
    id: string,
    dto: {
      revision: number;
      zone: string;
      kind: string;
      photoId: string;
      description?: string;
      videoId?: string;
      videoOffsetSec?: number;
    },
    agencyId?: string,
  ) {
    return this.mutate(id, (s) =>
      s.findingLocked(actorId, side, id, dto, agencyId),
    );
  }
  decide(
    agencyId: string,
    actorId: string,
    id: string,
    findingId: string,
    decision: 'ACCEPT' | 'DISPUTE',
    note: string | undefined,
    revision: number,
  ) {
    return this.mutate(id, (s) =>
      s.decideLocked(
        agencyId,
        actorId,
        id,
        findingId,
        decision,
        note,
        revision,
      ),
    );
  }
  publish(agencyId: string, actorId: string, id: string, revision: number) {
    return this.mutate(id, (s) =>
      s.publishLocked(agencyId, actorId, id, revision),
    );
  }
  approveCustomer(userId: string, id: string, revision: number) {
    return this.mutate(id, (s) =>
      s.approveCustomerLocked(userId, id, revision),
    );
  }
  disputeCustomer(userId: string, id: string, note: string, revision: number) {
    return this.mutate(id, (s) =>
      s.disputeCustomerLocked(userId, id, note, revision),
    );
  }
  repair(
    agencyId: string,
    actorId: string,
    id: string,
    findingId: string,
    photoId: string,
    revision: number,
  ) {
    return this.mutate(id, (s) =>
      s.repairLocked(agencyId, actorId, id, findingId, photoId, revision),
    );
  }
  reopen(
    agencyId: string,
    actorId: string,
    id: string,
    note: string,
    revision: number,
  ) {
    return this.mutate(id, async (s) => {
      const r = await s.staff(agencyId, id);
      s.requireScope(actorId);
      s.assertRevision(r, revision);
      if (!note?.trim() || note.trim().length < 5)
        throw new BadRequestException('Provide a reopening reason.');
      if (r.status !== 'DISPUTED')
        throw new ConflictException(
          'Refresh the disputed report before reopening.',
        );
      const updated = await s.prisma.guardianReport.update({
        where: { id },
        data: {
          status: 'CORRECTIONS_PENDING',
          revision: { increment: 1 },
          agencyApprovedRevision: null,
          customerApprovedRevision: null,
          publishedAt: null,
          mutuallyApprovedAt: null,
        },
      });
      await s.log(id, updated.revision, actorId, 'AGENCY', 'REOPENED', {
        note,
      });
      return updated;
    });
  }
  private missing(): never {
    throw new NotFoundException('Inspection not found.');
  }
  /** Prisma omits undefined filters. Reject missing JWT scope before a query can broaden. */
  private requireScope(value: string | undefined) {
    if (typeof value !== 'string' || !value.trim()) this.missing();
  }
  private assertRevision(report: { revision: number }, revision: number) {
    if (!Number.isSafeInteger(revision) || report.revision !== revision)
      throw new ConflictException('Report changed. Refresh before continuing.');
  }
  private validReportScope(report: {
    agencyId: string;
    carId: string;
    car: { agencyId: string };
    booking: {
      agencyId: string;
      carId: string;
      customer: { agencyId: string };
    };
  }) {
    return (
      report.booking.agencyId === report.agencyId &&
      report.booking.customer.agencyId === report.agencyId &&
      report.car.agencyId === report.agencyId &&
      report.booking.carId === report.carId
    );
  }
  private async staff(agencyId: string, id: string) {
    this.requireScope(agencyId);
    const report = await this.prisma.guardianReport.findFirst({
      where: { id, agencyId },
      include: details,
    });
    if (!report || !this.validReportScope(report)) this.missing();
    return report;
  }
  private async customer(userId: string, id: string) {
    this.requireScope(userId);
    const report = await this.prisma.guardianReport.findFirst({
      where: {
        id,
        status: { not: 'DRAFT' },
        OR: [
          { booking: { renterId: userId } },
          { booking: { renterId: null, customer: { userId } } },
        ],
      },
      include: details,
    });
    if (!report || !this.validReportScope(report)) this.missing();
    return report;
  }
  private log(
    id: string,
    revision: number,
    actorId: string,
    actorRole: Side,
    action: string,
    details: object = {},
  ) {
    return this.prisma.guardianEvent.create({
      data: { reportId: id, revision, actorId, actorRole, action, details },
    });
  }
  async create(
    agencyId: string,
    actorId: string,
    input: {
      bookingId: string;
      phase: 'OUT' | 'IN';
      mode?: 'FULL' | 'QUICK';
      mileage: number;
      fuelLevel: number;
    },
  ) {
    this.requireScope(agencyId);
    this.requireScope(actorId);
    // Creation and its first audit event must commit or roll back together.
    return this.prisma.$transaction((tx) =>
      new GuardianService(tx as PrismaService, this.storage).createLocked(
        agencyId,
        actorId,
        input,
      ),
    );
  }
  private async createLocked(
    agencyId: string,
    actorId: string,
    input: {
      bookingId: string;
      phase: 'OUT' | 'IN';
      mode?: 'FULL' | 'QUICK';
      mileage: number;
      fuelLevel: number;
    },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: input.bookingId, agencyId },
      select: {
        id: true,
        carId: true,
        customer: { select: { agencyId: true } },
        car: { select: { agencyId: true } },
      },
    });
    if (
      !booking ||
      booking.customer.agencyId !== agencyId ||
      booking.car.agencyId !== agencyId
    )
      this.missing();
    const existing = await this.prisma.guardianReport.findUnique({
      where: { bookingId_phase: { bookingId: booking.id, phase: input.phase } },
    });
    if (existing)
      throw new ConflictException(
        'Report already exists for this booking and phase.',
      );
    let report;
    try {
      report = await this.prisma.guardianReport.create({
        data: {
          agencyId,
          bookingId: booking.id,
          carId: booking.carId,
          phase: input.phase,
          mode: input.mode ?? 'FULL',
          mileage: input.mileage,
          fuelLevel: input.fuelLevel,
          createdById: actorId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException(
          'Report already exists for this booking and phase.',
        );
      throw e;
    }
    await this.log(report.id, report.revision, actorId, 'AGENCY', 'CREATED');
    return report;
  }
  async staffBooking(agencyId: string, bookingId: string) {
    this.requireScope(agencyId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      include: {
        customer: { select: { agencyId: true } },
        car: { select: { agencyId: true } },
      },
    });
    if (
      !booking ||
      booking.customer.agencyId !== agencyId ||
      booking.car.agencyId !== agencyId
    )
      this.missing();
    const reports = await this.prisma.guardianReport.findMany({
      where: { agencyId, bookingId },
      include: details,
    });
    return reports.filter((report) => this.validReportScope(report));
  }
  getStaff(agencyId: string, id: string) {
    return this.staff(agencyId, id);
  }
  getCustomer(userId: string, id: string) {
    return this.customer(userId, id);
  }
  async listCustomer(userId: string) {
    this.requireScope(userId);
    const reports = await this.prisma.guardianReport.findMany({
      where: {
        status: { not: 'DRAFT' },
        OR: [
          { booking: { renterId: userId } },
          { booking: { renterId: null, customer: { userId } } },
        ],
      },
      include: {
        car: {
          select: {
            agencyId: true,
            brand: true,
            model: true,
            licensePlate: true,
          },
        },
        booking: details.booking,
        findings: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return reports.filter((report) => this.validReportScope(report));
  }
  private validateFile(file: Express.Multer.File, kind: string) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Missing evidence file.');
    const jpeg =
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
    const png = file.buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      file.buffer.toString('ascii', 0, 4) === 'RIFF' &&
      file.buffer.toString('ascii', 8, 12) === 'WEBP';
    const mp4 = file.buffer.toString('ascii', 4, 8) === 'ftyp';
    const valid =
      kind === 'VIDEO'
        ? file.mimetype === 'video/mp4' && mp4
        : (file.mimetype === 'image/jpeg' && jpeg) ||
          (file.mimetype === 'image/png' && png) ||
          (file.mimetype === 'image/webp' && webp);
    if (!valid)
      throw new BadRequestException('Unsupported or invalid media contents.');
    if (
      file.buffer.length !== file.size ||
      file.size > (kind === 'VIDEO' ? 32 : 8) * 1048576
    ) {
      throw new BadRequestException(
        'Pilot file size limit exceeded (32 MB video, 8 MB image).',
      );
    }
  }
  private async uploadLocked(
    actorId: string,
    side: Side,
    id: string,
    kind: string,
    file: Express.Multer.File,
    agencyId: string | undefined,
    revision: number,
  ) {
    this.requireScope(actorId);
    if (!(MEDIA_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException('Unknown evidence kind.');
    }
    const report =
      side === 'AGENCY'
        ? await this.staff(agencyId ?? '', id)
        : await this.customer(actorId, id);
    this.assertRevision(report, revision);
    if (
      side === 'CUSTOMER' &&
      (kind !== 'DAMAGE' ||
        !['CUSTOMER_REVIEW', 'CORRECTIONS_PENDING', 'DISPUTED'].includes(
          report.status,
        ))
    ) {
      throw new ConflictException(
        'Customer may add damage photos only during review.',
      );
    }
    // Never allow new baseline evidence while the customer is approving a
    // report. Only the open correction phase accepts additional damage photos.
    // Repair media belongs to an already mutually approved vehicle record.
    if (side === 'AGENCY') {
      const allowed =
        report.status === 'DRAFT'
          ? kind !== 'REPAIR'
          : report.status === 'CORRECTIONS_PENDING'
            ? kind === 'DAMAGE'
            : report.status === 'MUTUALLY_APPROVED'
              ? kind === 'REPAIR' &&
                report.agencyApprovedRevision === report.revision &&
                report.customerApprovedRevision === report.revision
              : false;
      if (!allowed)
        throw new ConflictException(
          'Evidence is closed for this report state.',
        );
    }
    this.validateFile(file, kind);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    if (
      ['DAMAGE', 'REPAIR'].includes(kind) &&
      (await this.prisma.guardianEvidence.findFirst({
        where: { reportId: report.id, kind, sha256 },
        select: { id: true },
      }))
    )
      throw new ConflictException(
        'Use a different photograph for each defect or repair.',
      );
    const ext =
      kind === 'VIDEO'
        ? 'mp4'
        : file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const storagePath = [
      report.agencyId,
      'guardian',
      report.id,
      randomUUID() + '.' + ext,
    ].join('/');
    await this.storage.upload(storagePath, file.buffer, file.mimetype);
    try {
      const evidence = await this.prisma.guardianEvidence.create({
        data: {
          reportId: report.id,
          kind,
          storagePath,
          sha256,
          filename: file.originalname.slice(0, 160),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedById: actorId,
          uploadedByRole: side,
        },
      });
      // Repairs append lifecycle evidence to the sealed baseline. Every other
      // upload changes the snapshot, so approvals of its old revision expire.
      const changed =
        kind === 'REPAIR'
          ? report
          : await this.prisma.guardianReport.update({
              where: { id: report.id },
              data: {
                revision: { increment: 1 },
                agencyApprovedRevision: null,
                customerApprovedRevision: null,
                publishedAt: null,
                mutuallyApprovedAt: null,
                status:
                  side === 'CUSTOMER' && report.status === 'CUSTOMER_REVIEW'
                    ? 'CORRECTIONS_PENDING'
                    : report.status,
              },
            });
      await this.log(
        report.id,
        changed.revision,
        actorId,
        side,
        'EVIDENCE_UPLOADED',
        { evidenceId: evidence.id, kind, sha256 },
      );
      return {
        id: evidence.id,
        kind,
        sha256,
        sizeBytes: evidence.sizeBytes,
        revision: changed.revision,
      };
    } catch (e) {
      await this.storage.remove(storagePath);
      throw e;
    }
  }
  async mediaUrl(
    actorId: string,
    side: Side,
    reportId: string,
    evidenceId: string,
    agencyId?: string,
  ) {
    await (side === 'AGENCY'
      ? this.staff(agencyId ?? '', reportId)
      : this.customer(actorId, reportId));
    const media = await this.prisma.guardianEvidence.findFirst({
      where: { id: evidenceId, reportId },
      select: { storagePath: true, mimeType: true },
    });
    if (!media) this.missing();
    return {
      url: await this.storage.createSignedUrl(media.storagePath, 300),
      expiresIn: 300,
    };
  }
  private async assertMedia(
    id: string,
    reportId: string,
    kind: string,
    actorId?: string,
    side?: Side,
  ) {
    const media = await this.prisma.guardianEvidence.findFirst({
      where: {
        id,
        reportId,
        kind,
        ...(actorId ? { uploadedById: actorId, uploadedByRole: side } : {}),
      },
      select: { id: true, sha256: true },
    });
    if (!media)
      throw new BadRequestException(
        'Provide a matching evidence file from this inspection.',
      );
    return media;
  }
  private async findingLocked(
    actorId: string,
    side: Side,
    reportId: string,
    dto: {
      revision: number;
      zone: string;
      kind: string;
      photoId: string;
      description?: string;
      videoId?: string;
      videoOffsetSec?: number;
    },
    agencyId?: string,
  ) {
    this.requireScope(actorId);
    if (!(ZONES as readonly string[]).includes(dto.zone))
      throw new BadRequestException('Invalid car zone.');
    const report =
      side === 'AGENCY'
        ? await this.staff(agencyId ?? '', reportId)
        : await this.customer(actorId, reportId);
    this.assertRevision(report, dto.revision);
    const open =
      side === 'AGENCY'
        ? ['DRAFT', 'CORRECTIONS_PENDING']
        : ['CUSTOMER_REVIEW', 'CORRECTIONS_PENDING', 'DISPUTED'];
    if (!open.includes(report.status))
      throw new ConflictException('Inspection edits are closed.');
    const photo = await this.assertMedia(
      dto.photoId,
      report.id,
      'DAMAGE',
      actorId,
      side,
    );
    // One individually photographed defect per original evidence image.
    if (
      await this.prisma.guardianFinding.findFirst({
        where: {
          reportId: report.id,
          OR: [{ photoId: dto.photoId }, { photo: { sha256: photo.sha256 } }],
        },
        select: { id: true },
      })
    )
      throw new ConflictException(
        'Each defect needs its own unused close-up photo.',
      );
    if (dto.videoOffsetSec !== undefined && !dto.videoId)
      throw new BadRequestException('Video reference required for timestamp.');
    if (dto.videoId) await this.assertMedia(dto.videoId, report.id, 'VIDEO');
    const result = await this.prisma.guardianFinding.create({
      data: {
        reportId: report.id,
        zone: dto.zone,
        kind: dto.kind,
        photoId: dto.photoId,
        description: dto.description ?? '',
        videoId: dto.videoId,
        videoOffsetSec: dto.videoOffsetSec,
        source: side,
        status: side === 'AGENCY' ? 'ACCEPTED' : 'PROPOSED',
      },
    });
    const changed = await this.prisma.guardianReport.update({
      where: { id: report.id },
      data: {
        revision: { increment: 1 },
        agencyApprovedRevision: null,
        customerApprovedRevision: null,
        publishedAt: null,
        mutuallyApprovedAt: null,
        status:
          side === 'CUSTOMER' && report.status !== 'DISPUTED'
            ? 'CORRECTIONS_PENDING'
            : report.status,
      },
    });
    await this.log(
      report.id,
      changed.revision,
      actorId,
      side,
      'FINDING_ADDED',
      { findingId: result.id },
    );
    return result;
  }
  private async decideLocked(
    agencyId: string,
    actorId: string,
    reportId: string,
    findingId: string,
    decision: 'ACCEPT' | 'DISPUTE',
    note: string | undefined,
    revision: number,
  ) {
    const report = await this.staff(agencyId, reportId);
    this.requireScope(actorId);
    this.assertRevision(report, revision);
    if (!['CORRECTIONS_PENDING', 'DISPUTED'].includes(report.status)) {
      throw new ConflictException('No corrections are open.');
    }
    const finding = await this.prisma.guardianFinding.findFirst({
      where: {
        id: findingId,
        reportId,
        source: 'CUSTOMER',
        status: { in: ['PROPOSED', 'DISPUTED'] },
      },
    });
    if (!finding) this.missing();
    if (decision === 'DISPUTE' && !note?.trim())
      throw new BadRequestException('A reason is required.');
    const result = await this.prisma.guardianFinding.update({
      where: { id: findingId },
      data: {
        status: decision === 'ACCEPT' ? 'ACCEPTED' : 'DISPUTED',
        agencyNote: note,
      },
    });
    const updated = await this.prisma.guardianReport.update({
      where: { id: report.id },
      data: {
        revision: { increment: 1 },
        agencyApprovedRevision: null,
        customerApprovedRevision: null,
        publishedAt: null,
        mutuallyApprovedAt: null,
        status: decision === 'DISPUTE' ? 'DISPUTED' : 'CORRECTIONS_PENDING',
      },
    });
    await this.log(
      report.id,
      updated.revision,
      actorId,
      'AGENCY',
      'CORRECTION_' + decision,
      { findingId, note },
    );
    return result;
  }
  private async publishLocked(
    agencyId: string,
    actorId: string,
    id: string,
    revision: number,
  ) {
    const r = await this.staff(agencyId, id);
    this.requireScope(actorId);
    this.assertRevision(r, revision);
    if (!['DRAFT', 'CORRECTIONS_PENDING'].includes(r.status))
      throw new ConflictException('Not publishable.');
    const need =
      r.mode === 'FULL'
        ? ['OVERVIEW', 'ODOMETER', 'FUEL', 'VIDEO']
        : ['OVERVIEW', 'ODOMETER', 'FUEL'];
    const types = new Set(r.evidence.map((e) => e.kind));
    const missing = need.filter((k) => !types.has(k));
    if (missing.length)
      throw new BadRequestException('Missing evidence: ' + missing.join(', '));
    if (r.findings.some((f) => ['PROPOSED', 'DISPUTED'].includes(f.status))) {
      throw new ConflictException(
        'Resolve outstanding findings before publishing.',
      );
    }
    const unlinked = r.evidence.filter(
      (e) => e.kind === 'DAMAGE' && !r.findings.some((f) => f.photoId === e.id),
    );
    if (unlinked.length)
      throw new ConflictException(
        'Every damage photo needs a linked, reviewed finding.',
      );
    const updated = await this.prisma.guardianReport.update({
      where: { id },
      data: {
        status: 'CUSTOMER_REVIEW',
        agencyApprovedRevision: r.revision,
        customerApprovedRevision: null,
        mutuallyApprovedAt: null,
        publishedAt: new Date(),
      },
    });
    await this.log(id, r.revision, actorId, 'AGENCY', 'PUBLISHED');
    return updated;
  }
  private async approveCustomerLocked(
    userId: string,
    id: string,
    revision: number,
  ) {
    const r = await this.customer(userId, id);
    this.assertRevision(r, revision);
    // Retries of the exact sealed approval are safe and do not append duplicate events.
    if (
      r.status === 'MUTUALLY_APPROVED' &&
      r.agencyApprovedRevision === revision &&
      r.customerApprovedRevision === revision
    )
      return r;
    if (
      r.revision !== revision ||
      r.status !== 'CUSTOMER_REVIEW' ||
      r.agencyApprovedRevision !== r.revision ||
      r.findings.some((f) => ['PROPOSED', 'DISPUTED'].includes(f.status)) ||
      r.evidence.some(
        (e) =>
          e.kind === 'DAMAGE' && !r.findings.some((f) => f.photoId === e.id),
      )
    ) {
      throw new ConflictException(
        'The latest report needs agency review before approval.',
      );
    }
    const updated = await this.prisma.guardianReport.update({
      where: { id },
      data: {
        customerApprovedRevision: r.revision,
        status: 'MUTUALLY_APPROVED',
        mutuallyApprovedAt: new Date(),
      },
    });
    await this.log(id, r.revision, userId, 'CUSTOMER', 'APPROVED');
    return updated;
  }
  private async disputeCustomerLocked(
    userId: string,
    id: string,
    note: string,
    revision: number,
  ) {
    const r = await this.customer(userId, id);
    this.assertRevision(r, revision);
    if (!note?.trim() || note.trim().length < 5)
      throw new BadRequestException('Provide a dispute reason.');
    if (r.status !== 'CUSTOMER_REVIEW')
      throw new ConflictException('Not awaiting customer review.');
    const updated = await this.prisma.guardianReport.update({
      where: { id },
      data: {
        status: 'DISPUTED',
        revision: { increment: 1 },
        agencyApprovedRevision: null,
        customerApprovedRevision: null,
        publishedAt: null,
        mutuallyApprovedAt: null,
      },
    });
    await this.log(id, updated.revision, userId, 'CUSTOMER', 'DISPUTED', {
      note,
    });
    return updated;
  }
  private async repairLocked(
    agencyId: string,
    actorId: string,
    id: string,
    findingId: string,
    photoId: string,
    revision: number,
  ) {
    const r = await this.staff(agencyId, id);
    this.requireScope(actorId);
    this.assertRevision(r, revision);
    const finding = await this.prisma.guardianFinding.findFirst({
      where: {
        id: findingId,
        reportId: id,
        status: 'ACCEPTED',
        repairedAt: null,
      },
    });
    if (!finding) this.missing();
    if (
      r.status !== 'MUTUALLY_APPROVED' ||
      r.agencyApprovedRevision !== r.revision ||
      r.customerApprovedRevision !== r.revision
    )
      throw new ConflictException(
        'Approve the baseline before recording repairs.',
      );
    const photo = await this.assertMedia(
      photoId,
      id,
      'REPAIR',
      actorId,
      'AGENCY',
    );
    if (
      await this.prisma.guardianFinding.findFirst({
        where: {
          reportId: id,
          OR: [
            { repairPhotoId: photoId },
            { repairPhoto: { sha256: photo.sha256 } },
          ],
        },
        select: { id: true },
      })
    )
      throw new ConflictException(
        'Each repair needs its own unused after-repair photo.',
      );
    const updated = await this.prisma.guardianFinding.update({
      where: { id: findingId },
      // Preserve the accepted condition recorded in the sealed report.
      // Repair is an additional lifecycle event, never a rewrite of the
      // original vehicle condition at rental handover.
      data: { repairedAt: new Date(), repairPhotoId: photoId },
    });
    await this.log(id, r.revision, actorId, 'AGENCY', 'REPAIR_VERIFIED', {
      findingId,
      photoId,
    });
    return updated;
  }
  async activeCarDamage(agencyId: string, carId: string) {
    this.requireScope(agencyId);
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
    });
    if (!car) this.missing();
    return this.prisma.guardianFinding.findMany({
      where: {
        report: {
          agencyId,
          carId,
          status: 'MUTUALLY_APPROVED',
          booking: { agencyId, carId, customer: { agencyId } },
        },
        status: 'ACCEPTED',
        repairedAt: null,
      },
      include: {
        photo: true,
        report: {
          select: { id: true, phase: true, bookingId: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
