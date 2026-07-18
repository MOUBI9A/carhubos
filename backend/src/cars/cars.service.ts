import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto, UpdateCarDto } from './dto/cars.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

@Injectable()
export class CarsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private entitlements: EntitlementsService,
  ) {}

  async create(agencyId: string, createCarDto: CreateCarDto, actorId: string) {
    // SaaS gates: block suspended tenants, then enforce the plan's fleet limit
    // (no-op on unlimited/BETA plans). PLAN_LIMIT_REACHED drives the upgrade prompt.
    await this.entitlements.assertOperating(agencyId);
    await this.entitlements.assertWithinLimit(agencyId, 'cars');

    // licensePlate is unique per agency — surface a clean 409 instead of a P2002 500
    const existing = await this.prisma.car.findFirst({
      where: { agencyId, licensePlate: createCarDto.licensePlate },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A vehicle with this license plate already exists in your fleet',
      );
    }

    const car = await this.prisma.car.create({
      data: {
        ...createCarDto,
        agencyId,
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'CREATE_CAR',
      'CAR',
      car.id,
      null,
      car,
    );

    return car;
  }

  /**
   * Fleet list — cars with their compliance documents so the UI can
   * derive real compliance scores, plus booking counts for context.
   */
  async findAll(agencyId: string) {
    return this.prisma.car.findMany({
      where: { agencyId },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
            expiryDate: true,
            isMandatory: true,
          },
          orderBy: { expiryDate: 'asc' },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lean lookup used internally (audit before/after states, ownership checks). */
  async findOne(agencyId: string, id: string) {
    const car = await this.prisma.car.findFirst({
      where: { id, agencyId },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return car;
  }

  /**
   * Car profile — full detail for the fleet detail page: documents,
   * maintenance history, recent bookings and verified financials.
   */
  async findOneDetailed(agencyId: string, id: string) {
    const car = await this.prisma.car.findFirst({
      where: { id, agencyId },
      include: {
        documents: { orderBy: { expiryDate: 'asc' } },
        maintenance: { orderBy: { createdAt: 'desc' } },
        bookings: {
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        hubListing: { select: { id: true, dailyRateB2B: true, status: true } },
      },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }

    // Verified cash flow for this asset (strict ERP: real payments only)
    const revenueAgg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        type: 'INCOME',
        status: 'VERIFIED',
        invoice: { booking: { carId: id } },
      },
    });
    // Money is Prisma.Decimal — sum and subtract in Decimal space, exact.
    // The global DecimalToNumberInterceptor serialises these to JSON numbers.
    const totalRevenue = revenueAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalMaintenanceCost = car.maintenance.reduce(
      (sum, m) => sum.plus(m.cost),
      new Prisma.Decimal(0),
    );

    return {
      ...car,
      financials: {
        totalRevenue,
        totalMaintenanceCost,
        netProfit: totalRevenue.minus(totalMaintenanceCost),
      },
    };
  }

  async update(
    agencyId: string,
    id: string,
    updateCarDto: UpdateCarDto,
    actorId: string,
  ) {
    const oldCar = await this.findOne(agencyId, id);
    const updatedCar = await this.prisma.car.update({
      where: { id },
      data: updateCarDto,
    });

    // oldCar.pricePerDay is a Prisma.Decimal — compare via .equals(), not !==,
    // (a number vs Decimal !== is always true and mislabels every edit).
    const action =
      updateCarDto.pricePerDay !== undefined &&
      !oldCar.pricePerDay.equals(updateCarDto.pricePerDay)
        ? 'CHANGE_PRICE'
        : 'UPDATE_CAR';

    await this.auditLogs.log(
      agencyId,
      actorId,
      action,
      'CAR',
      id,
      oldCar,
      updatedCar,
    );

    return updatedCar;
  }

  async remove(agencyId: string, id: string, actorId: string) {
    const car = await this.findOne(agencyId, id);
    try {
      await this.prisma.car.delete({
        where: { id },
      });
    } catch (err) {
      // Booking FK is onDelete: Restrict — protect financial history
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException(
          'This vehicle has booking history and cannot be deleted. Set it to OUT_OF_SERVICE instead.',
        );
      }
      throw err;
    }

    await this.auditLogs.log(
      agencyId,
      actorId,
      'DELETE_CAR',
      'CAR',
      id,
      car,
      null,
    );
  }
}
