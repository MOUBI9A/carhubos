import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';
import { BookingsController } from './bookings.controller';

jest.mock('../auth/auth.guard', () => ({ AuthGuard: class AuthGuard {} }));

describe('BookingsController create authorization context', () => {
  it('forwards identity and tenant from the authenticated user, not the DTO', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: 'booking-1' }) };
    const controller = new BookingsController(service as any);
    const payload = {
      carId: 'car-1', customerId: 'customer-1', startDate: '2099-10-01', endDate: '2099-10-03',
      overrideReason: 'Verified', role: 'ROOT_ADMIN', agencyId: 'agency-b', id: 'forged-actor',
    };
    await controller.create({ id: 'actor-1', role: 'AGENT', agencyId: 'agency-a' }, payload);
    expect(service.create).toHaveBeenCalledWith('agency-a', payload, 'actor-1', 'AGENT');
  });

  it('retains authentication and booking.create capability enforcement', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, BookingsController)).toEqual([AuthGuard, CapabilitiesGuard]);
    const handler = Object.getOwnPropertyDescriptor(BookingsController.prototype, 'create')!.value;
    expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toEqual(['booking.create']);
  });
});
