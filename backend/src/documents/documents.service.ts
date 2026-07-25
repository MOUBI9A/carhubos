import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCarDocumentDto,
  RenewCarDocumentDto,
} from './dto/documents.dto';

const EXPIRING_SOON_DAYS = 30;

// Backward-compatible caps (P2 backlog — flat array preserved; orderBy existed,
// take didn't). A car's document set is small; the agency-wide Vault view grows
// with the fleet, so bound it. Pagination is the real fix past these ceilings.
const CAR_DOC_CAP = 100;
const AGENCY_DOC_CAP = 500;

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * VALID / EXPIRING_SOON (≤30 days) / EXPIRED, derived from the expiry date.
   * Used at write time (create/renew) AND at read time (findAllForCar/
   * findAllForAgency) — nothing else in the backend ever updates the stored
   * `status` column as real time passes, so trusting it verbatim on read
   * would drift stale (a document created "VALID" stays "VALID" in the DB
   * forever, even long after its real expiryDate has passed). Always
   * recompute from `expiryDate` wherever status is displayed.
   */
  private deriveStatus(expiryDate: Date): string {
    const now = new Date();
    if (expiryDate <= now) return 'EXPIRED';
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + EXPIRING_SOON_DAYS);
    if (expiryDate <= threshold) return 'EXPIRING_SOON';
    return 'VALID';
  }

  private async assertCarOwnership(agencyId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
  }

  private async findOwnedDocument(agencyId: string, documentId: string) {
    const doc = await this.prisma.carDocument.findFirst({
      where: { id: documentId, car: { agencyId } },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }

  /**
   * A caller-supplied vaultFileId is just a string until proven otherwise —
   * verify the referenced VaultFile actually belongs to the caller's own
   * agency before linking it. Without this, an agency could attach another
   * tenant's already-uploaded file to their own compliance record just by
   * guessing/observing its id (an IDOR on the link, not the file's contents,
   * but still a real cross-tenant reference — the linked record would then
   * expose that id + its signed-download path to this agency's own users).
   */
  private async assertVaultFileOwnership(agencyId: string, vaultFileId: string) {
    const file = await this.prisma.vaultFile.findFirst({
      where: { id: vaultFileId, agencyId },
      select: { id: true },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
  }

  async create(agencyId: string, dto: CreateCarDocumentDto) {
    await this.assertCarOwnership(agencyId, dto.carId);
    if (dto.vaultFileId) {
      await this.assertVaultFileOwnership(agencyId, dto.vaultFileId);
    }
    const expiry = new Date(dto.expiryDate);

    return this.prisma.carDocument.create({
      data: {
        carId: dto.carId,
        type: dto.type,
        expiryDate: expiry,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        fileUrl: dto.fileUrl ?? null,
        vaultFileId: dto.vaultFileId ?? null,
        isMandatory: dto.isMandatory ?? true,
        status: this.deriveStatus(expiry),
      },
    });
  }

  async findAllForCar(agencyId: string, carId: string) {
    await this.assertCarOwnership(agencyId, carId);
    const docs = await this.prisma.carDocument.findMany({
      where: { carId },
      orderBy: { expiryDate: 'asc' },
      take: CAR_DOC_CAP,
    });
    return docs.map((d) => ({ ...d, status: this.deriveStatus(d.expiryDate) }));
  }

  /** Agency-wide compliance view (Guardian Vault) — every document across the fleet. */
  async findAllForAgency(agencyId: string) {
    const docs = await this.prisma.carDocument.findMany({
      where: { car: { agencyId } },
      include: {
        car: { select: { brand: true, model: true, licensePlate: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: AGENCY_DOC_CAP,
    });
    return docs.map((d) => ({ ...d, status: this.deriveStatus(d.expiryDate) }));
  }

  /** Renewal: new expiry date recomputes the compliance status. */
  async renew(agencyId: string, documentId: string, dto: RenewCarDocumentDto) {
    await this.findOwnedDocument(agencyId, documentId);
    if (dto.vaultFileId) {
      await this.assertVaultFileOwnership(agencyId, dto.vaultFileId);
    }
    const expiry = new Date(dto.expiryDate);

    return this.prisma.carDocument.update({
      where: { id: documentId },
      data: {
        expiryDate: expiry,
        status: this.deriveStatus(expiry),
        ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),
        ...(dto.vaultFileId !== undefined ? { vaultFileId: dto.vaultFileId } : {}),
      },
    });
  }

  async remove(agencyId: string, documentId: string) {
    await this.findOwnedDocument(agencyId, documentId);
    await this.prisma.carDocument.delete({ where: { id: documentId } });
    return { deleted: true };
  }

  // ── Legacy helpers (used by automations/notifications flows) ──────

  async createCarDocument(
    carId: string,
    data: { type: string; expiryDate: Date; fileUrl?: string },
  ) {
    return this.prisma.carDocument.create({
      data: {
        ...data,
        carId,
        status: this.deriveStatus(data.expiryDate),
      },
    });
  }

  async findExpiringSoon() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return this.prisma.carDocument.findMany({
      where: {
        expiryDate: {
          lte: nextMonth,
        },
        status: 'VALID',
      },
      include: {
        car: true,
      },
    });
  }
}
