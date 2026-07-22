import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateMaintenanceDto } from './dto/maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
  ) {}

  /** Verifies the car belongs to the caller's agency before any read/write. */
  private async assertCarOwnership(agencyId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      select: { id: true, mileage: true },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return car;
  }

  async create(agencyId: string, dto: CreateMaintenanceDto) {
    const car = await this.assertCarOwnership(agencyId, dto.carId);

    const record = await this.prisma.maintenanceRecord.create({
      data: {
        ...dto,
        status: dto.status || 'COMPLETED',
      },
    });

    // Keep the odometer in sync when the workshop reports a higher reading
    if (dto.mileage && dto.mileage > car.mileage) {
      await this.prisma.car.update({
        where: { id: car.id },
        data: { mileage: dto.mileage },
      });
    }

    // BP Pillar C: Trigger ROI recalculation after any mechanical spend
    // (agencyId scopes the recompute — record.carId is already agency-owned via
    // assertCarOwnership above).
    await this.analytics.calculateCarRoi(agencyId, record.carId);

    return record;
  }

  async findAllForCar(agencyId: string, carId: string) {
    await this.assertCarOwnership(agencyId, carId);
    return this.prisma.maintenanceRecord.findMany({
      where: { carId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGlobalHistory(agencyId: string) {
    return this.prisma.maintenanceRecord.findMany({
      where: {
        car: { agencyId },
      },
      include: { car: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
