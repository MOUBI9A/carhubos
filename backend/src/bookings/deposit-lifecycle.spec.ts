import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';

/**
 * Coverage for the security-deposit state machine (MASTER_BACKLOG §4:
 * "highest-risk flow with no coverage" — money + state machine, the existing
 * bookings.service.spec.ts explicitly excludes it). Real Prisma.Decimal
 * instances are used throughout (not hand-rolled fakes) so `.gt`/`.lt`/
 * `.times` behave exactly as they do against the real DB.
 *
 * Lifecycle: PENDING --capture/HOLD--> HELD --RETURN--> RETURNED
 *                                        \--CLAIM--> CLAIMED (+ optional
 *                                            damage INCOME on the invoice)
 */
function money(n: number) {
  return new Prisma.Decimal(n).toDecimalPlaces(2);
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

function makeBooking(overrides: Record<string, any> = {}) {
  return {
    id: 'booking-1',
    agencyId: 'agency-a',
    status: 'ACTIVE',
    depositStatus: 'PENDING',
    depositAmount: money(0),
    depositMethod: 'CASH',
    ...overrides,
  };
}

describe('BookingsService.captureDeposit', () => {
  function makeSvc(booking: any) {
    const prismaFindFirst = jest.fn(({ where }: any) =>
      Promise.resolve(
        where.id === booking.id && where.agencyId === booking.agencyId
          ? { ...booking, car: {}, customer: {}, invoices: [] }
          : null,
      ),
    );
    const update = jest.fn((args: any) => Promise.resolve({ ...booking, ...args.data }));
    const prisma = { booking: { findFirst: prismaFindFirst, update } };
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );
    return { svc, update, auditLog: services.auditLogs.log, prismaFindFirst };
  }

  it('sets depositAmount from a PENDING booking and logs the audit trail', async () => {
    const booking = makeBooking({ depositStatus: 'PENDING', depositAmount: money(0) });
    const { svc, update, auditLog } = makeSvc(booking);

    const result = await svc.captureDeposit('agency-a', 'booking-1', 'actor-1', {
      amount: 500,
    });

    expect(update.mock.calls[0][0].data.depositAmount).toBeInstanceOf(Prisma.Decimal);
    expect(update.mock.calls[0][0].data.depositAmount.equals(money(500))).toBe(true);
    expect(update.mock.calls[0][0].data.depositStatus).toBe('PENDING');
    expect(result.depositAmount.equals(money(500))).toBe(true);
    expect(auditLog).toHaveBeenCalledWith(
      'agency-a',
      'actor-1',
      'CAPTURE_DEPOSIT',
      'BOOKING',
      'booking-1',
      expect.any(Object),
      expect.objectContaining({ depositStatus: 'PENDING' }),
    );
  });

  it('rejects capture when depositStatus is not PENDING', async () => {
    const booking = makeBooking({ depositStatus: 'HELD' });
    const { svc, update } = makeSvc(booking);

    await expect(
      svc.captureDeposit('agency-a', 'booking-1', 'actor-1', { amount: 500 } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['COMPLETED', 'CANCELLED'])(
    'rejects capture on a closed booking (status=%s)',
    async (status) => {
      const booking = makeBooking({ depositStatus: 'PENDING', status });
      const { svc, update } = makeSvc(booking);

      await expect(
        svc.captureDeposit('agency-a', 'booking-1', 'actor-1', { amount: 500 } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('cross-tenant bookingId 404s before any write', async () => {
    const booking = makeBooking();
    const { svc, update } = makeSvc(booking);

    await expect(
      svc.captureDeposit('agency-b', 'booking-1', 'actor-1', { amount: 500 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('BookingsService.updateDeposit — HOLD', () => {
  function makeSvc(booking: any) {
    const findFirst = jest.fn(({ where }: any) =>
      Promise.resolve(
        where.id === booking.id && where.agencyId === booking.agencyId
          ? { ...booking, invoices: booking.invoices ?? [] }
          : null,
      ),
    );
    const update = jest.fn((args: any) => Promise.resolve({ ...booking, ...args.data }));
    const prisma = { booking: { findFirst, update } };
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );
    return { svc, update };
  }

  it('PENDING + depositAmount > 0 -> HELD', async () => {
    const booking = makeBooking({ depositStatus: 'PENDING', depositAmount: money(500) });
    const { svc, update } = makeSvc(booking);

    const result = await svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
      action: 'HOLD',
    } as any);

    expect(update.mock.calls[0][0].data.depositStatus).toBe('HELD');
    expect(result.depositStatus).toBe('HELD');
  });

  it('rejects HOLD when depositStatus is not PENDING', async () => {
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const { svc, update } = makeSvc(booking);

    await expect(
      svc.updateDeposit('agency-a', 'booking-1', 'actor-1', { action: 'HOLD' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects HOLD on a zero deposit (nothing to hold)', async () => {
    const booking = makeBooking({ depositStatus: 'PENDING', depositAmount: money(0) });
    const { svc, update } = makeSvc(booking);

    await expect(
      svc.updateDeposit('agency-a', 'booking-1', 'actor-1', { action: 'HOLD' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('BookingsService.updateDeposit — RETURN', () => {
  function makeSvc(booking: any) {
    const findFirst = jest.fn(({ where }: any) =>
      Promise.resolve(
        where.id === booking.id && where.agencyId === booking.agencyId
          ? { ...booking, invoices: booking.invoices ?? [] }
          : null,
      ),
    );
    const update = jest.fn((args: any) => Promise.resolve({ ...booking, ...args.data }));
    const prisma = { booking: { findFirst, update } };
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );
    return { svc, update };
  }

  it('HELD -> RETURNED, no payment or invoice touched (off-books release)', async () => {
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const { svc, update } = makeSvc(booking);

    const result = await svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
      action: 'RETURN',
    } as any);

    expect(update.mock.calls[0][0].data).toEqual({ depositStatus: 'RETURNED' });
    expect(result.depositStatus).toBe('RETURNED');
  });

  it('rejects RETURN when depositStatus is not HELD', async () => {
    const booking = makeBooking({ depositStatus: 'PENDING' });
    const { svc, update } = makeSvc(booking);

    await expect(
      svc.updateDeposit('agency-a', 'booking-1', 'actor-1', { action: 'RETURN' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('cross-tenant bookingId 404s before any write', async () => {
    const booking = makeBooking({ depositStatus: 'HELD' });
    const { svc, update } = makeSvc(booking);

    await expect(
      svc.updateDeposit('agency-b', 'booking-1', 'actor-1', { action: 'RETURN' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('BookingsService.updateDeposit — CLAIM', () => {
  function makeTx(
    invoiceAmount: number,
    priorIncomeCents: number,
    priorRefundCents: number,
    // count: 0 simulates the loser of a concurrent CLAIM race — a rival
    // transaction already flipped depositStatus away from HELD before this
    // one's compound-where updateMany ran.
    updateManyCount = 1,
  ) {
    const bookingUpdateMany = jest.fn().mockResolvedValue({ count: updateManyCount });
    const bookingFindUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'booking-1',
      depositStatus: 'CLAIMED',
    });
    const paymentCreate = jest.fn().mockResolvedValue({ id: 'pay-claim' });
    const paymentAggregate = jest.fn(({ where }: any) => {
      if (where.type === 'INCOME') {
        return Promise.resolve({ _sum: { amount: money(priorIncomeCents / 100) } });
      }
      return Promise.resolve({ _sum: { amount: money(priorRefundCents / 100) } });
    });
    const invoiceUpdate = jest.fn().mockResolvedValue({});
    return {
      booking: { updateMany: bookingUpdateMany, findUniqueOrThrow: bookingFindUniqueOrThrow },
      payment: { create: paymentCreate, aggregate: paymentAggregate },
      invoice: { update: invoiceUpdate },
      invoiceAmount,
    };
  }

  function makeSvc(booking: any, tx: ReturnType<typeof makeTx>) {
    const findFirst = jest.fn(({ where }: any) =>
      Promise.resolve(
        where.id === booking.id && where.agencyId === booking.agencyId
          ? {
              ...booking,
              invoices: [{ id: 'invoice-1', amount: money(tx.invoiceAmount) }],
            }
          : null,
      ),
    );
    const prisma = {
      booking: { findFirst },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };
    const services = makeServices();
    const svc = new BookingsService(
      prisma as any,
      services.auditLogs as any,
      services.webhooks as any,
      services.pdfEngine as any,
      services.trust as any,
      services.entitlements as any,
    );
    return { svc, tx };
  }

  it('claimAmount 0 -> CLAIMED, no payment created (deposit-only claim)', async () => {
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const tx = makeTx(1000, 0, 0);
    const { svc } = makeSvc(booking, tx);

    const result = await svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
      action: 'CLAIM',
    } as any);

    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'booking-1', depositStatus: 'HELD' },
      data: { depositStatus: 'CLAIMED' },
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
    expect(result.depositStatus).toBe('CLAIMED');
  });

  it('claimAmount > 0 -> books a VERIFIED INCOME payment as a real Decimal, tied to the invoice', async () => {
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const tx = makeTx(1000, 0, 0);
    const { svc } = makeSvc(booking, tx);

    await svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
      action: 'CLAIM',
      claimAmount: 300,
      note: 'bumper scratch',
    } as any);

    const paymentData = tx.payment.create.mock.calls[0][0].data;
    expect(paymentData.amount).toBeInstanceOf(Prisma.Decimal);
    expect(paymentData.amount.equals(money(300))).toBe(true);
    expect(paymentData.type).toBe('INCOME');
    expect(paymentData.status).toBe('VERIFIED');
    expect(paymentData.invoiceId).toBe('invoice-1');
    expect(paymentData.reference).toContain('bumper scratch');
  });

  it('reconciles the invoice to PARTIAL when the claim does not cover the full invoice', async () => {
    // invoice 1000 MAD, no prior payments, claim 300 -> paid 300 < 1000 -> PARTIAL
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const tx = makeTx(1000, 30000 /* the claim itself, post-create, in cents */, 0);
    const { svc } = makeSvc(booking, tx);

    await svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
      action: 'CLAIM',
      claimAmount: 300,
    } as any);

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: { status: 'PARTIAL' },
    });
  });

  it('reconciles the invoice to PAID when the claim brings paid >= invoice total', async () => {
    // invoice 300 MAD, claim 300 covers it in full -> PAID
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const tx = makeTx(300, 30000, 0);
    const { svc } = makeSvc(booking, tx);

    await svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
      action: 'CLAIM',
      claimAmount: 300,
    } as any);

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: { status: 'PAID' },
    });
  });

  it('rejects a negative claimAmount', async () => {
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const tx = makeTx(1000, 0, 0);
    const { svc } = makeSvc(booking, tx);

    await expect(
      svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
        action: 'CLAIM',
        claimAmount: -50,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('rejects CLAIM when depositStatus is not HELD', async () => {
    const booking = makeBooking({ depositStatus: 'RETURNED' });
    const tx = makeTx(1000, 0, 0);
    const { svc } = makeSvc(booking, tx);

    await expect(
      svc.updateDeposit('agency-a', 'booking-1', 'actor-1', { action: 'CLAIM' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });

  it('CLAIM race: a loser whose compound-where updateMany matches zero rows aborts before creating a damage payment', async () => {
    // Both racers' outer `booking.depositStatus !== 'HELD'` check reads the
    // SAME pre-transaction snapshot (HELD) and passes — the real guard is
    // the updateMany's own `where: { depositStatus: 'HELD' }` inside the
    // transaction, which only the winner's write actually matches. Simulate
    // the loser: a rival transaction already flipped the row, so this
    // transaction's updateMany matches 0 rows.
    const booking = makeBooking({ depositStatus: 'HELD', depositAmount: money(500) });
    const tx = makeTx(1000, 0, 0, /* updateManyCount */ 0);
    const { svc } = makeSvc(booking, tx);

    await expect(
      svc.updateDeposit('agency-a', 'booking-1', 'actor-1', {
        action: 'CLAIM',
        claimAmount: 300,
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);

    // The whole point: the loser must never book its own damage charge.
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });
});
