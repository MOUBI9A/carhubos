import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';

/**
 * Unit tests for the late-fee charge in updateStatus(): an OVERDUE booking
 * being closed out is charged for every day past its scheduled return, at the
 * car's own daily rate (a real rate already on the booking — never invented).
 * A mocked Prisma is sufficient — this is about the money math and call shape,
 * not the DB. The other transitions (deposit HOLD, car status sync, general
 * audit/webhook) are pre-existing and untouched by this change.
 */
function makeTx() {
  return {
    booking: {
      findFirst: jest.fn().mockResolvedValue(null), // no conflicting booking
      update: jest.fn().mockResolvedValue({ id: 'b1', status: 'COMPLETED' }),
    },
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    payment: {
      create: jest.fn().mockResolvedValue({ id: 'pay-late' }),
      aggregate: jest.fn(),
    },
    car: { update: jest.fn(), updateMany: jest.fn() },
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>) {
  return {
    booking: { findFirst: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(tx)),
  };
}

function makeServices() {
  return {
    auditLogs: { log: jest.fn() },
    webhooks: { trigger: jest.fn() },
    pdfEngine: {},
    trust: {},
    entitlements: {},
  };
}

// Fixed epoch so daysLate math (Date.now() - endDate) is deterministic —
// avoids real-clock flakiness where a few ms between test setup and the code
// under test reading Date.now() pushes Math.ceil() to the next day.
const FIXED_NOW = new Date('2026-07-20T12:00:00.000Z').getTime();

function makeOverdueBooking(daysAgo: number) {
  return {
    id: 'b1',
    agencyId: 'agency-1',
    status: 'OVERDUE',
    depositStatus: 'HELD',
    depositAmount: { gt: () => false },
    carId: 'car-1',
    endDate: new Date(FIXED_NOW - daysAgo * 86_400_000),
    car: {
      pricePerDay: {
        times: (n: number) => ({
          toDecimalPlaces: () => ({
            toNumber: () => 300 * n,
            toFixed: (d: number) => (300 * n).toFixed(d),
            gt: () => 300 * n > 0,
          }),
        }),
        toFixed: (d: number) => (300).toFixed(d),
      },
    },
  };
}

describe('BookingsService.updateStatus — late fee', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('charges a late fee when closing an OVERDUE booking with an open invoice', async () => {
    const tx = makeTx();
    tx.invoice.findFirst.mockResolvedValue({
      id: 'inv-1',
      amount: { times: () => ({ toNumber: () => 100000 }) }, // 1000.00 MAD in cents
    });
    tx.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: { times: () => ({ toNumber: () => 100000 }) } } }) // income
      .mockResolvedValueOnce({ _sum: { amount: null } }); // refund

    const prisma = makePrisma(tx);
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );

    const booking = makeOverdueBooking(3);
    jest.spyOn(svc, 'findOne').mockResolvedValue(booking as any);

    await svc.updateStatus('agency-1', 'b1', 'COMPLETED', 'actor-1');

    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    const paymentArg = tx.payment.create.mock.calls[0][0].data;
    expect(paymentArg.amount.toNumber()).toBe(900); // 3 days late * 300 MAD/day
    expect(paymentArg.type).toBe('INCOME');
    expect(paymentArg.status).toBe('VERIFIED');
    expect(paymentArg.invoiceId).toBe('inv-1');
    expect(paymentArg.reference).toMatch(/Late fee/);

    // A LATE_FEE_CHARGE audit entry is written alongside the standard one.
    const auditActions = services.auditLogs.log.mock.calls.map((c) => c[2]);
    expect(auditActions).toContain('LATE_FEE_CHARGE');
    expect(auditActions).toContain('UPDATE_BOOKING_STATUS');
  });

  it('does not charge a late fee when there is no invoice to attach it to', async () => {
    const tx = makeTx();
    tx.invoice.findFirst.mockResolvedValue(null);

    const prisma = makePrisma(tx);
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );

    jest.spyOn(svc, 'findOne').mockResolvedValue(makeOverdueBooking(2) as any);

    await svc.updateStatus('agency-1', 'b1', 'COMPLETED', 'actor-1');

    expect(tx.payment.create).not.toHaveBeenCalled();
    const auditActions = services.auditLogs.log.mock.calls.map((c) => c[2]);
    expect(auditActions).not.toContain('LATE_FEE_CHARGE');
  });

  it('never charges a late fee for a booking that was not OVERDUE', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );

    const activeBooking = { ...makeOverdueBooking(0), status: 'ACTIVE' };
    jest.spyOn(svc, 'findOne').mockResolvedValue(activeBooking as any);

    await svc.updateStatus('agency-1', 'b1', 'COMPLETED', 'actor-1');

    expect(tx.invoice.findFirst).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});

/**
 * findAll's optional filters. The critical one is `from`/`to`: they must use
 * OVERLAP semantics (startDate <= to AND endDate >= from) so the scheduler grid
 * doesn't silently drop a rental that began before the window but is still
 * running. A mocked Prisma that records the `where`/pagination args is enough —
 * this is about the query shape, not the DB.
 */
describe('BookingsService.findAll — overlap window + pagination', () => {
  function makeSvc(
    findMany: jest.Mock,
    count: jest.Mock = jest.fn().mockResolvedValue(0),
  ) {
    const prisma = { booking: { findMany, count } };
    return new BookingsService(
      prisma as any,
      { log: jest.fn() } as any,
      { trigger: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('returns the same flat array (tenant-scoped only) when no params are given', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'b1' }]);
    const svc = makeSvc(findMany);

    const result = await svc.findAll('agency-1');

    expect(result).toEqual([{ id: 'b1' }]);
    expect(findMany.mock.calls[0][0].where).toEqual({ agencyId: 'agency-1' });
    expect(findMany.mock.calls[0][0].skip).toBeUndefined();
  });

  it('filters on overlap (startDate <= to AND endDate >= from), not startDate alone', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = makeSvc(findMany);

    const from = '2026-07-01T00:00:00.000Z';
    const to = '2026-07-15T00:00:00.000Z';
    await svc.findAll('agency-1', { from, to });

    const where = findMany.mock.calls[0][0].where;
    expect(where.agencyId).toBe('agency-1');
    // The regression guard: a booking that STARTED before the window but ends
    // inside it must still match — impossible with a startDate-only `gte` filter.
    expect(where.startDate).toEqual({ lte: new Date(to) });
    expect(where.endDate).toEqual({ gte: new Date(from) });
  });

  it('still returns a flat array (no envelope) when only from/to are given', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'b1' }]);
    const svc = makeSvc(findMany);

    const result = await svc.findAll('agency-1', {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-15T00:00:00.000Z',
    });

    expect(Array.isArray(result)).toBe(true); // scheduler consumes a flat array
    expect(findMany.mock.calls[0][0].skip).toBeUndefined();
  });

  it('returns a paginated envelope only when page/pageSize are supplied', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'b1' }]);
    const svc = makeSvc(findMany, jest.fn().mockResolvedValue(42));

    const result = await svc.findAll('agency-1', { page: 2, pageSize: 10 });

    expect(result).toEqual({ items: [{ id: 'b1' }], total: 42, page: 2, pageSize: 10 });
    expect(findMany.mock.calls[0][0].skip).toBe(10); // (page - 1) * pageSize
    expect(findMany.mock.calls[0][0].take).toBe(10);
  });
});

describe('BookingsService — calendar boundary & DST / clock-shift day-count math', () => {
  it('correctly calculates day count across Morocco clock shift (23h and 25h intervals)', () => {
    // Morocco shifts between UTC+0 and UTC+1 (e.g. before and after Ramadan)
    // A 1-day rental spanning a 23h transition:
    const start23 = new Date('2026-03-15T10:00:00.000Z');
    const end23 = new Date(start23.getTime() + 23 * 3600 * 1000);
    const diffDays23 = Math.ceil(Math.abs(end23.getTime() - start23.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays23).toBe(1);

    // A 1-day rental spanning 24h:
    const start24 = new Date('2026-04-15T10:00:00.000Z');
    const end24 = new Date(start24.getTime() + 24 * 3600 * 1000);
    const diffDays24 = Math.ceil(Math.abs(end24.getTime() - start24.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays24).toBe(1);

    // A multi-day rental spanning across multiple days (e.g. 7 days):
    const start7 = new Date('2026-05-01T09:00:00.000Z');
    const end7 = new Date(start7.getTime() + 7 * 24 * 3600 * 1000);
    const diffDays7 = Math.ceil(Math.abs(end7.getTime() - start7.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays7).toBe(7);
  });

  it('computes integer overdue daysLate correctly without fractional drift', () => {
    const scheduledEnd = new Date('2026-07-01T12:00:00.000Z');

    // 2 hours late -> counts as 1 day late (minimum 1 day late fee)
    const twoHoursLate = scheduledEnd.getTime() + 2 * 3600 * 1000;
    const daysLate2h = Math.max(1, Math.ceil((twoHoursLate - scheduledEnd.getTime()) / 86_400_000));
    expect(daysLate2h).toBe(1);

    // Exactly 24 hours late -> 1 day late
    const twentyFourHoursLate = scheduledEnd.getTime() + 24 * 3600 * 1000;
    const daysLate24h = Math.max(1, Math.ceil((twentyFourHoursLate - scheduledEnd.getTime()) / 86_400_000));
    expect(daysLate24h).toBe(1);

    // 24 hours and 1 minute late -> rolls over to 2 days late
    const twentyFourHoursOneMin = scheduledEnd.getTime() + (24 * 3600 + 60) * 1000;
    const daysLate25h = Math.max(1, Math.ceil((twentyFourHoursOneMin - scheduledEnd.getTime()) / 86_400_000));
    expect(daysLate25h).toBe(2);
  });
});

describe('BookingsService.create — end-to-end creation, invariants and concurrency', () => {
  const AGENCY_ID = 'agency-1';
  const ACTOR_ID = 'actor-1';
  const CAR_ID = 'car-1';
  const CUSTOMER_ID = 'cust-1';

  function setupCreateMocks() {
    const entitlements = {
      assertOperating: jest.fn().mockResolvedValue(undefined),
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };
    const auditLogs = { log: jest.fn().mockResolvedValue(undefined) };
    const webhooks = { trigger: jest.fn().mockResolvedValue(undefined) };
    const pdfEngine = {};
    const trust = {
      blockingFlagForCustomer: jest.fn().mockResolvedValue(null),
    };
    const automationEngine = {
      runTrigger: jest.fn().mockResolvedValue(undefined),
    };

    const mockCar = {
      id: CAR_ID,
      agencyId: AGENCY_ID,
      brand: 'Dacia',
      model: 'Duster',
      pricePerDay: new Prisma.Decimal('400.00'),
      documents: [] as any[],
    };

    const mockCustomer = {
      id: CUSTOMER_ID,
      agencyId: AGENCY_ID,
      firstName: 'Fatima',
      lastName: 'Zahra',
      phone: '0612345678',
    };

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'booking-new', ...data }),
        ),
      },
      invoice: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'invoice-new', ...data }),
        ),
      },
      payment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'payment-new', ...data }),
        ),
      },
    };

    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue(mockCar) },
      customer: { findFirst: jest.fn().mockResolvedValue(mockCustomer) },
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
      refusalLog: { create: jest.fn().mockResolvedValue({ id: 'refusal-1' }) },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };

    const svc = new BookingsService(
      prisma as any,
      auditLogs as any,
      webhooks as any,
      pdfEngine as any,
      trust as any,
      entitlements as any,
      automationEngine as any,
    );

    return {
      svc,
      prisma,
      tx,
      mockCar,
      mockCustomer,
      trust,
      auditLogs,
      webhooks,
      automationEngine,
      entitlements,
    };
  }

  it('rejects booking when end date is before or equal to start date', async () => {
    const { svc } = setupCreateMocks();

    await expect(
      svc.create(
        AGENCY_ID,
        {
          carId: CAR_ID,
          customerId: CUSTOMER_ID,
          startDate: '2026-11-05T10:00:00Z',
          endDate: '2026-11-05T10:00:00Z',
        } as any,
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('locks car and rejects booking when car has expired mandatory documents (Guardian lock)', async () => {
    const { svc, mockCar, prisma } = setupCreateMocks();
    mockCar.documents = [
      {
        id: 'doc-1',
        type: 'ASSURANCE',
        isMandatory: true,
        status: 'EXPIRED',
        expiryDate: new Date('2026-01-01'),
      },
    ];

    await expect(
      svc.create(
        AGENCY_ID,
        {
          carId: CAR_ID,
          customerId: CUSTOMER_ID,
          startDate: '2026-11-01T10:00:00Z',
          endDate: '2026-11-05T10:00:00Z',
        } as any,
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.refusalLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: AGENCY_ID,
          status: 'LOST',
        }),
      }),
    );
  });

  it('rejects booking when customer has blocking Trust Network flag without overrideReason', async () => {
    const { svc, trust, prisma } = setupCreateMocks();
    trust.blockingFlagForCustomer.mockResolvedValue({
      id: 'flag-1',
      severity: 'CRITICAL',
      reason: 'Vehicle stolen in prior rental',
      agency: { name: 'Prestige Cars' },
    });

    await expect(
      svc.create(
        AGENCY_ID,
        {
          carId: CAR_ID,
          customerId: CUSTOMER_ID,
          startDate: '2026-11-01T10:00:00Z',
          endDate: '2026-11-05T10:00:00Z',
        } as any,
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.refusalLog.create).toHaveBeenCalled();
  });

  it('permits booking with Trust Network flag when overrideReason is supplied, logging forensic audit', async () => {
    const { svc, trust, auditLogs, tx } = setupCreateMocks();
    trust.blockingFlagForCustomer.mockResolvedValue({
      id: 'flag-1',
      severity: 'CRITICAL',
      reason: 'Prior damage dispute',
      agency: { name: 'Prestige Cars' },
    });

    const booking = await svc.create(
      AGENCY_ID,
      {
        carId: CAR_ID,
        customerId: CUSTOMER_ID,
        startDate: '2026-11-01T10:00:00Z',
        endDate: '2026-11-05T10:00:00Z',
        overrideReason: 'VIP client with full cash guarantee deposit of 10000 MAD',
      },
      ACTOR_ID,
    );

    expect(booking).toBeDefined();
    expect(auditLogs.log).toHaveBeenCalledWith(
      AGENCY_ID,
      ACTOR_ID,
      'TRUST_OVERRIDE',
      'CUSTOMER',
      CUSTOMER_ID,
      undefined,
      expect.objectContaining({
        flagId: 'flag-1',
        overrideReason: 'VIP client with full cash guarantee deposit of 10000 MAD',
      }),
    );
  });

  it('rejects booking when vehicle already has overlapping booking', async () => {
    const { svc, prisma } = setupCreateMocks();
    prisma.booking.findFirst.mockResolvedValue({ id: 'existing-booking' });

    await expect(
      svc.create(
        AGENCY_ID,
        {
          carId: CAR_ID,
          customerId: CUSTOMER_ID,
          startDate: '2026-11-01T10:00:00Z',
          endDate: '2026-11-05T10:00:00Z',
        } as any,
        ACTOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.refusalLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'WAITING',
        }),
      }),
    );
  });

  it('creates booking, invoice with 20% embedded VAT, and pending payment inside transaction under row lock', async () => {
    const { svc, tx, auditLogs, webhooks, automationEngine } = setupCreateMocks();

    const booking = await svc.create(
      AGENCY_ID,
      {
        carId: CAR_ID,
        customerId: CUSTOMER_ID,
        startDate: '2026-11-01T10:00:00Z',
        endDate: '2026-11-05T10:00:00Z', // 4 days * 400 = 1600 MAD
        depositAmount: 1000,
        depositMethod: 'CASH',
      } as any,
      ACTOR_ID,
    );

    // Row-level lock acquired on the car
    expect(tx.$executeRaw).toHaveBeenCalled();

    // Booking created
    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: AGENCY_ID,
          carId: CAR_ID,
          customerId: CUSTOMER_ID,
          status: 'REQUESTED',
          depositStatus: 'PENDING',
        }),
      }),
    );

    // Total price is 1600 MAD (4 days * 400 MAD/day)
    const bookingData = tx.booking.create.mock.calls[0][0].data;
    expect(bookingData.totalPrice.toNumber()).toBe(1600);
    expect(bookingData.depositAmount.toNumber()).toBe(1000);

    // Invoice has 20% embedded VAT: 1600 * 20 / 120 = 266.67 MAD
    const invoiceData = tx.invoice.create.mock.calls[0][0].data;
    expect(invoiceData.amount.toNumber()).toBe(1600);
    expect(invoiceData.taxAmount.toNumber()).toBe(266.67);
    expect(invoiceData.status).toBe('DUE');

    // Pending payment created
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: bookingData.totalPrice,
          status: 'PENDING',
          type: 'INCOME',
        }),
      }),
    );

    // Forensic audit log & webhook
    expect(auditLogs.log).toHaveBeenCalledWith(
      AGENCY_ID,
      ACTOR_ID,
      'CREATE_BOOKING',
      'BOOKING',
      'booking-new',
      null,
      expect.any(Object),
    );
    expect(webhooks.trigger).toHaveBeenCalledWith(
      AGENCY_ID,
      'BOOKING_CREATED',
      expect.any(Object),
    );
    expect(automationEngine.runTrigger).toHaveBeenCalledWith(
      AGENCY_ID,
      'BOOKING_CREATED',
      expect.any(Object),
    );
  });
});


