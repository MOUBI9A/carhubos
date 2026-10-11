import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: {
    car: { findMany: jest.Mock };
    customer: { findMany: jest.Mock };
    booking: { findMany: jest.Mock };
  };

  const AGENCY_A = 'agency-a';

  beforeEach(() => {
    prisma = {
      car: { findMany: jest.fn() },
      customer: { findMany: jest.fn() },
      booking: { findMany: jest.fn() },
    };
    service = new SearchService(prisma as any);
  });

  it('returns empty result set immediately for empty or whitespace query without querying DB', async () => {
    const result1 = await service.search(AGENCY_A, '');
    const result2 = await service.search(AGENCY_A, '   ');

    expect(result1).toEqual({ cars: [], customers: [], bookings: [], total: 0 });
    expect(result2).toEqual({ cars: [], customers: [], bookings: [], total: 0 });
    expect(prisma.car.findMany).not.toHaveBeenCalled();
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('queries cars, customers, and bookings strictly scoped to caller agencyId', async () => {
    const mockCars = [{ id: 'car-1', brand: 'Renault', model: 'Clio' }];
    const mockCustomers = [{ id: 'cust-1', firstName: 'Karim', lastName: 'Ben' }];
    const mockBookings = [{ id: 'book-1', status: 'ACTIVE' }];

    prisma.car.findMany.mockResolvedValue(mockCars);
    prisma.customer.findMany.mockResolvedValue(mockCustomers);
    prisma.booking.findMany.mockResolvedValue(mockBookings);

    const result = await service.search(AGENCY_A, '  Clio  ');

    expect(prisma.car.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ agencyId: AGENCY_A }),
        take: 5,
      }),
    );
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ agencyId: AGENCY_A }),
        take: 5,
      }),
    );
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ agencyId: AGENCY_A }),
        take: 5,
      }),
    );

    expect(result.cars).toEqual(mockCars);
    expect(result.customers).toEqual(mockCustomers);
    expect(result.bookings).toEqual(mockBookings);
    expect(result.total).toBe(3);
  });
});
