import { ConflictException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

// Exercise the public transition boundary: Prisma transaction failures must be
// mapped narrowly, and failures must never emit a successful status audit.
describe('Booking PostgreSQL conflict mapping', () => {
  function fixture(error: Error) {
    const prisma = { $transaction: jest.fn().mockRejectedValue(error) };
    const audit = { log: jest.fn() };
    const service = new BookingsService(prisma as any, audit as any, {} as any, {} as any, {} as any, {} as any);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'booking', status: 'REQUESTED' } as any);
    return { service, audit };
  }
  it.each([
    'PostgresError code: "23P01", constraint: "booking_active_car_dates_excl"',
    'conflicting key value violates exclusion constraint "booking_active_car_dates_excl"',
  ])('maps only the known overlap constraint: %s', async (message) => {
    const { service, audit } = fixture(new Error(message));
    await expect(service.updateStatus('agency', 'booking', 'APPROVED', 'actor')).rejects.toBeInstanceOf(ConflictException);
    expect(audit.log).not.toHaveBeenCalled();
  });
  it.each([
    'Database connection failed',
    'foreign key violation booking_active_car_dates_excl',
    '23P01 exclusion constraint other_constraint',
  ])('preserves unrelated database failure: %s', async (message) => {
    const error = new Error(message);
    const { service } = fixture(error);
    await expect(service.updateStatus('agency', 'booking', 'APPROVED', 'actor')).rejects.toBe(error);
  });
});
