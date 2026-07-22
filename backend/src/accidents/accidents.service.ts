import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccidentDto, UpdateAccidentDto } from './dto/accidents.dto';

/**
 * Fleet accident/incident dossiers. Every query is scoped by the caller's
 * agencyId (from the JWT, never the body) — a cross-tenant read/write resolves
 * to nothing and throws NotFoundException (404, no existence leak), per
 * CLAUDE.md §5.1. estimatedCost is money = Prisma.Decimal (§5.3): the DTO takes
 * a number, we convert through the Decimal API before persisting, and the global
 * DecimalToNumberInterceptor turns it back into a number on the wire.
 */
@Injectable()
export class AccidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verify a car belongs to the caller's agency before linking an accident to it. */
  private async assertCarOwnership(agencyId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return car;
  }

  /** Verify an optional booking belongs to the caller's agency before linking it. */
  private async assertBookingOwnership(agencyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      select: { id: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  /** estimatedCost | number | undefined → Prisma.Decimal | undefined (no number math). */
  private toMoney(value?: number): Prisma.Decimal | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  async create(agencyId: string, dto: CreateAccidentDto) {
    await this.assertCarOwnership(agencyId, dto.carId);
    if (dto.bookingId) {
      await this.assertBookingOwnership(agencyId, dto.bookingId);
    }

    return this.prisma.accident.create({
      data: {
        agencyId,
        carId: dto.carId,
        bookingId: dto.bookingId ?? null,
        occurredAt: new Date(dto.occurredAt),
        severity: dto.severity,
        // schema default is REPORTED; honour an explicit status if provided
        ...(dto.status ? { status: dto.status } : {}),
        description: dto.description,
        location: dto.location ?? null,
        thirdParty: dto.thirdParty ?? false,
        estimatedCost: this.toMoney(dto.estimatedCost) ?? null,
      },
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.accident.findMany({
      where: { agencyId },
      include: { car: { select: { id: true, brand: true, model: true, licensePlate: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Fetch one accident scoped to the caller's agency. A cross-tenant id resolves
   * to null → 404. This is the boundary-tested enforcement point (accidents.service.spec.ts).
   */
  async findOne(agencyId: string, id: string) {
    const accident = await this.prisma.accident.findFirst({
      where: { id, agencyId },
      include: { car: { select: { id: true, brand: true, model: true, licensePlate: true } } },
    });
    if (!accident) {
      throw new NotFoundException('Accident not found');
    }
    return accident;
  }

  async update(agencyId: string, id: string, dto: UpdateAccidentDto) {
    // Tenant guard first: 404 before we touch anything cross-tenant.
    await this.findOne(agencyId, id);

    // If the caller re-points the car/booking, re-verify ownership of the target.
    if (dto.carId) {
      await this.assertCarOwnership(agencyId, dto.carId);
    }
    if (dto.bookingId) {
      await this.assertBookingOwnership(agencyId, dto.bookingId);
    }

    const data: Prisma.AccidentUpdateInput = {};
    if (dto.carId !== undefined) data.car = { connect: { id: dto.carId } };
    if (dto.bookingId !== undefined) {
      data.booking = dto.bookingId
        ? { connect: { id: dto.bookingId } }
        : { disconnect: true };
    }
    if (dto.occurredAt !== undefined) data.occurredAt = new Date(dto.occurredAt);
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.thirdParty !== undefined) data.thirdParty = dto.thirdParty;
    if (dto.estimatedCost !== undefined) {
      data.estimatedCost = this.toMoney(dto.estimatedCost) ?? null;
    }

    return this.prisma.accident.update({ where: { id }, data });
  }
}
