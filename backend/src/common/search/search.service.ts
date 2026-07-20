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

    // Prefix-based (startsWith) matching, not leading-wildcard contains: a
    // leading '%' LIKE can't use a btree index on these columns and would
    // force a sequential scan as data grows. startsWith compiles to a
    // sargable `col LIKE 'q%'`, which the existing indexes can serve.
    // This narrows mid-string matches (e.g. searching "corolla" won't find
    // "Toyota Corolla" via model alone, only via a field that starts with
    // it) — acceptable for a global quick-search UX; each field is still
    // agencyId-scoped with a take:5 cap per entity.
    const [cars, customers, bookings] = await Promise.all([
      // Cars — brand, model, licensePlate
      this.prisma.car.findMany({
        where: {
          agencyId,
          OR: [
            { brand: { startsWith: q, mode: 'insensitive' } },
            { model: { startsWith: q, mode: 'insensitive' } },
            { licensePlate: { startsWith: q, mode: 'insensitive' } },
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
            { firstName: { startsWith: q, mode: 'insensitive' } },
            { lastName: { startsWith: q, mode: 'insensitive' } },
            { phone: { startsWith: q } },
            { identityNumber: { startsWith: q, mode: 'insensitive' } },
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
            { id: { startsWith: q } },
            { status: { startsWith: q, mode: 'insensitive' } },
            { car: { brand: { startsWith: q, mode: 'insensitive' } } },
            { car: { model: { startsWith: q, mode: 'insensitive' } } },
            { customer: { firstName: { startsWith: q, mode: 'insensitive' } } },
            { customer: { lastName: { startsWith: q, mode: 'insensitive' } } },
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
