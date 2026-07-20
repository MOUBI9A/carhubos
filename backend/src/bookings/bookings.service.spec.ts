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
