import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/**
 * Minimal shape needed to diff two inspections — deliberately looser than the
 * full Prisma `Inspection` model so it stays easy to unit-test with plain objects.
 */
interface InspectionLike {
  id?: string;
  fuelLevel: number;
  mileage: number;
  damages?: string | null;
  inspectorId?: string;
}

export interface InspectionDiff {
  damagesAdded: any[];
  damagesAddedCount: number;
  fuelLevelDelta: number; // post - pre; negative = fuel used
  mileageDelta: number; // post - pre
  fuelMaterialDrop: boolean;
  hasNewDamage: boolean;
}

// Eighths-of-a-tank drop considered material enough to flag as unaccounted fuel use.
const FUEL_MATERIAL_DROP_THRESHOLD = 2;

// Best-effort candidate fields a frontend/AI-vision damage entry might carry a cost on.
// Only used when present as a real positive number — never invented.
const DAMAGE_COST_FIELDS = ['cost', 'estimatedCost', 'repairCost', 'amount', 'price'];

@Injectable()
export class InspectionsService {
  // Configurable placeholder used when no reliable cost signal exists on the new
  // damage entries. Defaults to 0 so money is never fabricated — staff must review.
  private readonly damageChargePlaceholder = new Prisma.Decimal(
    process.env.DAMAGE_AUTO_CHARGE_PLACEHOLDER_AMOUNT &&
      !Number.isNaN(Number(process.env.DAMAGE_AUTO_CHARGE_PLACEHOLDER_AMOUNT))
      ? Number(process.env.DAMAGE_AUTO_CHARGE_PLACEHOLDER_AMOUNT)
      : 0,
  );

  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(agencyId: string, data: {
    type: string;
    fuelLevel: number;
    mileage: number;
    damages?: string;
    photos?: string;
    notes?: string;
    carId: string;
    bookingId?: string;
    inspectorId: string;
  }) {
    const car = await this.prisma.car.findFirst({
      where: { id: data.carId, agencyId },
      select: { id: true, agencyId: true, nextServiceKm: true, brand: true, model: true },
    });
    if (!car) throw new NotFoundException('Car not found');

    if (data.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: data.bookingId, agencyId, carId: data.carId },
        select: { id: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
    }

    const inspection = await this.prisma.inspection.create({
      data,
    });

    // 1. Update the car's live mileage
    const updatedCar = await this.prisma.car.update({
      where: { id: car.id },
      data: { mileage: data.mileage },
    });

    // 2. BP Pillar C: Mileage Intelligence Logic
    // If we are within 500km of the next service, trigger an automation
    if (updatedCar.nextServiceKm && data.mileage >= updatedCar.nextServiceKm - 500) {
      const priority = data.mileage >= updatedCar.nextServiceKm ? 'URGENT' : 'HIGH';
      const statusText = data.mileage >= updatedCar.nextServiceKm ? 'OVERDUE' : 'DUE SOON';

      await this.prisma.task.create({
        data: {
          title: `Mechanical Service ${statusText}: ${car.brand} ${car.model}`,
          description: `Current: ${data.mileage}km | Service Limit: ${updatedCar.nextServiceKm}km. Please schedule vidange and filter inspection.`,
          priority,
          status: 'PENDING',
          agencyId: car.agencyId,
        },
      });
    }

    // 3. Compare with PRE_RENTAL evidence, flag review, never fabricate payment.
    if (data.type === 'POST_RENTAL' && data.bookingId) {
      await this.autoAssessDamage(agencyId, data.bookingId, inspection);
    }

    return inspection;
  }

  async findAll(agencyId: string) {
    return this.prisma.inspection.findMany({
      where: { car: { agencyId } },
      include: {
        car: {
          select: { id: true, brand: true, model: true, licensePlate: true },
        },
        inspector: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findByCar(agencyId: string, carId: string) {
    return this.prisma.inspection.findMany({
      where: { carId, car: { agencyId } },
      include: { inspector: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBooking(agencyId: string, bookingId: string) {
    return this.prisma.inspection.findMany({
      where: { bookingId, booking: { agencyId } },
      include: { inspector: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * PRE/POST inspection pair for a booking plus a computed diff summary
   * (damages added, fuel delta, mileage delta) for the frontend to render.
   */
  async findBookingDiff(agencyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      select: { id: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const inspections = await this.prisma.inspection.findMany({
      where: { bookingId, booking: { agencyId } },
      include: { inspector: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const pre = inspections.find((i) => i.type === 'PRE_RENTAL') ?? null;
    const post = [...inspections].reverse().find((i) => i.type === 'POST_RENTAL') ?? null;

    return {
      bookingId,
      pre,
      post,
      inspections,
      diff: pre && post ? this.diffInspections(pre, post) : null,
    };
  }

  /** Flag new damage for staff review; no charge or money movement occurs. */
  private async autoAssessDamage(
    agencyId: string,
    bookingId: string,
    post: InspectionLike,
  ) {
    const pre = await this.prisma.inspection.findFirst({
      where: { bookingId, type: 'PRE_RENTAL', booking: { agencyId } },
      orderBy: { createdAt: 'desc' },
    });
    if (!pre) return null;

    const diff = this.diffInspections(pre, post);
    if (!diff.hasNewDamage) return null;

    // Detection is evidence for human review, NOT evidence that funds were received.
    // Never create VERIFIED income, an invoice payment, or a deposit claim here.
    const { amount, manualReview, signalSource } =
      this.estimateDamageAmount(diff.damagesAdded);
    await this.auditLogs.log(
      agencyId,
      post.inspectorId ?? 'system',
      'DAMAGE_REVIEW_REQUIRED',
      'BOOKING',
      bookingId,
      { preInspectionId: pre.id, postInspectionId: post.id },
      {
        proposedAmount: amount.toString(),
        manualReview: true, // liability and collection always require explicit review
        sourceCostProvided: !manualReview,
        signalSource,
        damagesAdded: diff.damagesAdded,
        fuelLevelDelta: diff.fuelLevelDelta,
        mileageDelta: diff.mileageDelta,
      },
    );
    return null;
  }

  private parseDamages(json?: string | null): any[] {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** Best-effort stable identity for a damage entry so we can diff two arrays. */
  private damageKey(item: any): string {
    if (item && typeof item === 'object') {
      const type = typeof item.type === 'string' ? item.type : typeof item.name === 'string' ? item.name : '';
      const location = typeof item.location === 'string' ? item.location : typeof item.area === 'string' ? item.area : '';
      if (type || location) return `${type}|${location}`.toLowerCase();
      return JSON.stringify(item, Object.keys(item).sort());
    }
    return String(item);
  }

  private diffInspections(pre: InspectionLike, post: InspectionLike): InspectionDiff {
    const preDamages = this.parseDamages(pre.damages);
    const postDamages = this.parseDamages(post.damages);
    const preKeys = new Set(preDamages.map((d) => this.damageKey(d)));
    const damagesAdded = postDamages.filter((d) => !preKeys.has(this.damageKey(d)));

    const fuelLevelDelta = post.fuelLevel - pre.fuelLevel;
    const mileageDelta = post.mileage - pre.mileage;
    const fuelMaterialDrop = fuelLevelDelta <= -FUEL_MATERIAL_DROP_THRESHOLD;

    return {
      damagesAdded,
      damagesAddedCount: damagesAdded.length,
      fuelLevelDelta,
      mileageDelta,
      fuelMaterialDrop,
      hasNewDamage: damagesAdded.length > 0 || fuelMaterialDrop,
    };
  }

  /**
   * Never fabricates a specific damage amount. Only sums real, positive,
   * numeric cost signals already present on the new damage entries (e.g. from
   * an AI-vision scan or a manual estimate the agent typed in). If none
   * exist, falls back to the configurable placeholder and flags manual review.
   */
  private estimateDamageAmount(
    damagesAdded: any[],
  ): { amount: Prisma.Decimal; manualReview: boolean; signalSource: string } {
    let sum = new Prisma.Decimal(0);
    let foundSignal = false;

    for (const item of damagesAdded) {
      if (!item || typeof item !== 'object') continue;
      for (const field of DAMAGE_COST_FIELDS) {
        const value = item[field];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          sum = sum.plus(new Prisma.Decimal(value));
          foundSignal = true;
          break; // one cost field per entry — avoid double counting cost+price etc.
        }
      }
    }

    if (foundSignal && sum.gt(0)) {
      return {
        amount: sum.toDecimalPlaces(2),
        manualReview: false,
        signalSource: 'declared cost fields on the new damage entries',
      };
    }

    return {
      amount: this.damageChargePlaceholder.toDecimalPlaces(2),
      manualReview: true,
      signalSource: 'none',
    };
  }
}
