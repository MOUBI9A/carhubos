import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(agencyId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return { cars: [], customers: [], bookings: [], total: 0 };
    }

    const q = query.trim();

    const [cars, customers, bookings] = await Promise.all([
      // Cars — brand, model, licensePlate
      this.prisma.car.findMany({
        where: {
          agencyId,
          OR: [
            { brand: { contains: q } },
            { model: { contains: q } },
            { licensePlate: { contains: q } },
          ],
        },
        select: {
          id: true,
          brand: true,
          model: true,
          licensePlate: true,
          status: true,
          pricePerDay: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      // Customers — firstName, lastName, phone, identityNumber
      this.prisma.customer.findMany({
        where: {
          agencyId,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { phone: { contains: q } },
            { identityNumber: { contains: q } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          identityNumber: true,
          status: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      // Bookings — id (partial), status; include car brand/model and customer name
      this.prisma.booking.findMany({
        where: {
          agencyId,
          OR: [
            { id: { contains: q } },
            { status: { contains: q } },
            { car: { brand: { contains: q } } },
            { car: { model: { contains: q } } },
            { customer: { firstName: { contains: q } } },
            { customer: { lastName: { contains: q } } },
          ],
        },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          totalPrice: true,
          car: {
            select: { id: true, brand: true, model: true, licensePlate: true },
          },
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const total = cars.length + customers.length + bookings.length;

    return { cars, customers, bookings, total };
  }
}
