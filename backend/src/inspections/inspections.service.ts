import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService) {}

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

    return inspection;
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
}
