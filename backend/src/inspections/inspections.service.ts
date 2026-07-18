import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
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
    const inspection = await this.prisma.inspection.create({
      data,
    });

    // 1. Update the car's live mileage
    const car = await this.prisma.car.update({
      where: { id: data.carId },
      data: { mileage: data.mileage },
    });

    // 2. BP Pillar C: Mileage Intelligence Logic
    // If we are within 500km of the next service, trigger an automation
    if (car.nextServiceKm && data.mileage >= car.nextServiceKm - 500) {
      const priority = data.mileage >= car.nextServiceKm ? 'URGENT' : 'HIGH';
      const statusText = data.mileage >= car.nextServiceKm ? 'OVERDUE' : 'DUE SOON';

      await this.prisma.task.create({
        data: {
          title: `Mechanical Service ${statusText}: ${car.brand} ${car.model}`,
          description: `Current: ${data.mileage}km | Service Limit: ${car.nextServiceKm}km. Please schedule vidange and filter inspection.`,
          priority,
          status: 'PENDING',
          agencyId: car.agencyId,
        },
      });
    }

    return inspection;
  }

  async findByCar(carId: string) {
    return this.prisma.inspection.findMany({
      where: { carId },
      include: { inspector: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.inspection.findMany({
      where: { bookingId },
      include: { inspector: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
