import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCarDocumentDto,
  RenewCarDocumentDto,
} from './dto/documents.dto';

const EXPIRING_SOON_DAYS = 30;

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  /** VALID / EXPIRING_SOON (≤30 days) / EXPIRED, derived from the expiry date. */
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

  async create(agencyId: string, dto: CreateCarDocumentDto) {
    await this.assertCarOwnership(agencyId, dto.carId);
    const expiry = new Date(dto.expiryDate);

    return this.prisma.carDocument.create({
      data: {
        carId: dto.carId,
        type: dto.type,
        expiryDate: expiry,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        fileUrl: dto.fileUrl ?? null,
        isMandatory: dto.isMandatory ?? true,
        status: this.deriveStatus(expiry),
      },
    });
  }

  async findAllForCar(agencyId: string, carId: string) {
    await this.assertCarOwnership(agencyId, carId);
    return this.prisma.carDocument.findMany({
      where: { carId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /** Agency-wide compliance view (Guardian Vault) — every document across the fleet. */
  async findAllForAgency(agencyId: string) {
    return this.prisma.carDocument.findMany({
      where: { car: { agencyId } },
      include: {
        car: { select: { brand: true, model: true, licensePlate: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /** Renewal: new expiry date recomputes the compliance status. */
  async renew(agencyId: string, documentId: string, dto: RenewCarDocumentDto) {
    await this.findOwnedDocument(agencyId, documentId);
    const expiry = new Date(dto.expiryDate);

    return this.prisma.carDocument.update({
      where: { id: documentId },
      data: {
        expiryDate: expiry,
        status: this.deriveStatus(expiry),
        ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),
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
