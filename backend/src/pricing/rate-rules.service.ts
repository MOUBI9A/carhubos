import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PricingService } from './pricing.service';
import {
  CreateRateRuleDto,
  UpdateRateRuleDto,
  assertRuleCoherent,
} from './dto/rate-rule.dto';

/**
 * CRUD for rate rules + the operator-facing quote. Tenant-scoped throughout;
 * pricing changes are audit-logged because they change what customers are
 * charged and "who moved the August rate" is a question that gets asked.
 */
@Injectable()
export class RateRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly pricing: PricingService,
  ) {}

  private toData(dto: CreateRateRuleDto, agencyId: string) {
    const coherence = assertRuleCoherent(dto);
    if (coherence) throw new BadRequestException(coherence);

    return {
      agencyId,
      name: dto.name.trim(),
      kind: dto.kind,
      active: dto.active ?? true,
      priority: dto.priority ?? 0,
      vehicleClass: dto.vehicleClass ?? null,
      carId: dto.carId ?? null,
      // Seasonal bounds only carry meaning on a seasonal rule, and vice
      // versa — normalise the irrelevant half to null so a rule can't be
      // half-configured in a way the engine would silently read.
      startDate:
        dto.kind === 'SEASONAL' && dto.startDate ? new Date(dto.startDate) : null,
      endDate:
        dto.kind === 'SEASONAL' && dto.endDate ? new Date(dto.endDate) : null,
      minDays: dto.kind === 'DURATION' ? (dto.minDays ?? null) : null,
      maxDays: dto.kind === 'DURATION' ? (dto.maxDays ?? null) : null,
      adjustmentType: dto.adjustmentType,
      adjustmentValue: new Prisma.Decimal(dto.adjustmentValue).toDecimalPlaces(2),
    };
  }

  /** A car-scoped rule must point at a car in the CALLER's agency. */
  private async assertCarInAgency(agencyId: string, carId?: string | null) {
    if (!carId) return;
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true },
    });
    if (!car) throw new NotFoundException('Car not found');
  }

  list(agencyId: string) {
    return this.prisma.rateRule.findMany({
      where: { agencyId },
      orderBy: [{ kind: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(agencyId: string, actorId: string, dto: CreateRateRuleDto) {
    await this.assertCarInAgency(agencyId, dto.carId);
    const rule = await this.prisma.rateRule.create({
      data: this.toData(dto, agencyId),
    });
    await this.auditLogs.log(
      agencyId,
      actorId,
      'CREATE_RATE_RULE',
      'RATE_RULE',
      rule.id,
      null,
      { name: rule.name, kind: rule.kind, adjustmentValue: rule.adjustmentValue },
    );
    return rule;
  }

  async update(
    agencyId: string,
    id: string,
    actorId: string,
    dto: UpdateRateRuleDto,
  ) {
    const existing = await this.prisma.rateRule.findFirst({
      where: { id, agencyId },
    });
    if (!existing) throw new NotFoundException('Rate rule not found');
    await this.assertCarInAgency(agencyId, dto.carId);

    const updated = await this.prisma.rateRule.update({
      where: { id },
      data: this.toData(dto, agencyId),
    });
    await this.auditLogs.log(
      agencyId,
      actorId,
      'UPDATE_RATE_RULE',
      'RATE_RULE',
      id,
      {
        name: existing.name,
        active: existing.active,
        adjustmentValue: existing.adjustmentValue,
      },
      {
        name: updated.name,
        active: updated.active,
        adjustmentValue: updated.adjustmentValue,
      },
    );
    return updated;
  }

  async remove(agencyId: string, id: string, actorId: string) {
    const existing = await this.prisma.rateRule.findFirst({
      where: { id, agencyId },
    });
    if (!existing) throw new NotFoundException('Rate rule not found');

    await this.prisma.rateRule.delete({ where: { id } });
    await this.auditLogs.log(
      agencyId,
      actorId,
      'DELETE_RATE_RULE',
      'RATE_RULE',
      id,
      { name: existing.name, kind: existing.kind },
      null,
    );
    return { deleted: true };
  }

  /** Set (or clear) a car's pricing segment. */
  async setVehicleClass(
    agencyId: string,
    carId: string,
    actorId: string,
    vehicleClass: string | null | undefined,
  ) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true, vehicleClass: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    const next = vehicleClass ?? null;
    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: { vehicleClass: next },
      select: { id: true, vehicleClass: true },
    });
    await this.auditLogs.log(
      agencyId,
      actorId,
      'SET_VEHICLE_CLASS',
      'CAR',
      carId,
      { vehicleClass: car.vehicleClass },
      { vehicleClass: next },
    );
    return updated;
  }

  /**
   * What would this rental cost? Used by the booking modal so staff quote
   * the same number the booking will actually be created at.
   */
  async quote(agencyId: string, carId: string, startDate: string, endDate: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true, vehicleClass: true, pricePerDay: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid dates.');
    }
    if (end < start) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }

    return this.pricing.quote(agencyId, car, start, end);
  }
}
