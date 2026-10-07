import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';

const payload = {
  carId: 'car-1', customerId: 'customer-1',
  startDate: '2099-10-01', endDate: '2099-10-03',
  overrideReason: '  Identity and deposit verified  ',
};

function subject(role: string | null = 'AGENT') {
  const transaction = {
    booking: { create: jest.fn().mockResolvedValue({ id: 'booking-1' }) },
    invoice: { create: jest.fn().mockResolvedValue({ id: 'invoice-1' }) },
    payment: { create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
  };
  const prisma = {
    car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1', brand: 'Dacia', documents: [], pricePerDay: new Prisma.Decimal(350) }) },
    customer: { findFirst: jest.fn().mockResolvedValue({ id: 'customer-1', firstName: 'Test', lastName: 'Renter', phone: '0600000000' }) },
    booking: { findFirst: jest.fn().mockResolvedValue(null) },
    agencyMembership: { findUnique: jest.fn().mockResolvedValue(role ? { rolePreset: role } : null) },
    refusalLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction)),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const trust = { blockingFlagForCustomer: jest.fn().mockResolvedValue({ id: 'flag-1', reason: 'UNPAID_DEBT' }) };
  const webhooks = { trigger: jest.fn().mockResolvedValue(undefined) };
  const entitlements = {
    assertOperating: jest.fn().mockResolvedValue(undefined),
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
  };
  const service = new BookingsService(prisma as any, audit as any, webhooks as any, {} as any, trust as any, entitlements as any);
  return { service, prisma, transaction, audit, trust, webhooks };
}

describe('Booking trust override authorization', () => {
  it('fails closed if the membership lookup fails', async () => {
    const { service, prisma, audit } = subject('OWNER');
    prisma.agencyMembership.findUnique.mockRejectedValue(new Error('Membership lookup unavailable'));
    await expect(service.create('agency-a', payload, 'actor-1')).rejects.toThrow('Membership lookup unavailable');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('requires a nonblank reason even for the platform administrator', async () => {
    const { service, prisma } = subject(null);
    await expect(service.create('agency-a', { ...payload, overrideReason: '  ' }, 'root-1', 'ROOT_ADMIN')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows an authenticated platform administrator with an explicit reason', async () => {
    const { service, prisma, audit } = subject(null);
    await expect(service.create('agency-a', payload, 'root-1', 'ROOT_ADMIN')).resolves.toEqual({ id: 'booking-1' });
    expect(prisma.agencyMembership.findUnique).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith('agency-a', 'root-1', 'TRUST_OVERRIDE', 'CUSTOMER', 'customer-1', undefined, expect.objectContaining({
      overrideReason: 'Identity and deposit verified',
    }));
  });

  it('does not trust a stale manager token after the membership was demoted', async () => {
    const { service, prisma } = subject('AGENT');
    await expect(service.create('agency-a', payload, 'actor-1', 'MANAGER')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TRUST_OVERRIDE_FORBIDDEN' }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not accept a platform role or tenant from the booking payload', async () => {
    const { service, prisma } = subject('AGENT');
    await expect(service.create('agency-a', { ...payload, ...{ role: 'ROOT_ADMIN', agencyId: 'agency-b' } }, 'actor-1', 'AGENT')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.agencyMembership.findUnique).toHaveBeenCalledWith({
      where: { userId_agencyId: { userId: 'actor-1', agencyId: 'agency-a' } },
      select: { rolePreset: true },
    });
  });

  it.each(['AGENT', 'RENTER', 'CUSTOM', null])('rejects an override with membership role %s before financial writes', async (role) => {
    const { service, prisma, transaction, audit, webhooks } = subject(role);
    await expect(service.create('agency-a', payload, 'actor-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.agencyMembership.findUnique).toHaveBeenCalledWith({
      where: { userId_agencyId: { userId: 'actor-1', agencyId: 'agency-a' } },
      select: { rolePreset: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(transaction.booking.create).not.toHaveBeenCalled();
    expect(transaction.invoice.create).not.toHaveBeenCalled();
    expect(transaction.payment.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(webhooks.trigger).not.toHaveBeenCalled();
  });

  it.each([undefined, '', ' \t\n '])('rejects missing or blank reasons (%j) even for managers', async (overrideReason) => {
    const { service, prisma, audit } = subject('MANAGER');
    await expect(service.create('agency-a', { ...payload, overrideReason }, 'actor-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(prisma.refusalLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ agencyId: 'agency-a', status: 'LOST' }),
    }));
  });

  it.each(['OWNER', 'MANAGER'])('allows %s and audits the normalized reason and actor', async (role) => {
    const { service, audit, transaction } = subject(role);
    await expect(service.create('agency-a', payload, 'actor-1')).resolves.toEqual({ id: 'booking-1' });
    expect(audit.log).toHaveBeenCalledWith('agency-a', 'actor-1', 'TRUST_OVERRIDE', 'CUSTOMER', 'customer-1', undefined, {
      flagId: 'flag-1', reason: 'UNPAID_DEBT', overrideReason: 'Identity and deposit verified',
    });
    expect(transaction.booking.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ agencyId: 'agency-a', status: 'REQUESTED' }),
    }));
  });

  it('does not restrict normal unblocked agent bookings', async () => {
    const { service, trust, prisma, audit } = subject();
    trust.blockingFlagForCustomer.mockResolvedValue(null);
    await expect(service.create('agency-a', { ...payload, overrideReason: undefined }, 'actor-1')).resolves.toEqual({ id: 'booking-1' });
    expect(prisma.agencyMembership.findUnique).not.toHaveBeenCalled();
    expect(audit.log.mock.calls.some((entry) => entry[2] === 'TRUST_OVERRIDE')).toBe(false);
  });

  it.each(['car', 'customer'] as const)('preserves tenant-scoped 404 for a missing %s before override authorization', async (entity) => {
    const { service, prisma } = subject();
    prisma[entity].findFirst.mockResolvedValue(null);
    await expect(service.create('agency-a', payload, 'actor-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma[entity].findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: payload[entity === 'car' ? 'carId' : 'customerId'], agencyId: 'agency-a' },
    }));
    expect(prisma.agencyMembership.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
