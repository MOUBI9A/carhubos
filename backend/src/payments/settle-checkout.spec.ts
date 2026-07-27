import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

/**
 * Money-critical regression guard for PaymentsService.settleCheckout — the
 * gateway-webhook settlement path. The load-bearing property is IDEMPOTENCY: a
 * webhook the gateway delivers more than once must create exactly ONE verified
 * payment and reconcile the invoice ONCE (never double-credit). Proven end-to-end
 * against real Postgres in the payments live smoke; this locks it into CI.
 */
describe('PaymentsService.settleCheckout — idempotent gateway settlement', () => {
  const REF = 'mock_sess-1';
  const D = (n: number | string) => new Prisma.Decimal(n);

  // Mocks a $transaction whose tx client behaves like the DB for one settlement.
  // checkoutSession.updateMany (the flip) returns count 1 ONLY when the session
  // is currently PENDING — exactly the atomic PENDING→PAID guard the real query
  // relies on for idempotency.
  function makeService(sessionStatus: string, opts: { session?: null } = {}) {
    const session =
      opts.session === null
        ? null
        : {
            id: 'sess-1',
            providerRef: REF,
            status: sessionStatus,
            amount: D(2700),
            invoiceId: 'inv-1',
            invoice: { id: 'inv-1', amount: D(2700) },
          };
    const tx = {
      checkoutSession: {
        findUnique: jest.fn().mockResolvedValue(session),
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: sessionStatus === 'PENDING' ? 1 : 0 }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: D(2700) } }) // VERIFIED INCOME
          .mockResolvedValueOnce({ _sum: { amount: null } }), // VERIFIED REFUND
      },
      invoice: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: (cb: any) => cb(tx) };
    const svc = new PaymentsService(
      prisma as any,
      {} as any,
      { log: jest.fn() } as any,
    );
    return { svc, tx };
  }

  it('first delivery: flips PENDING→PAID, creates ONE VERIFIED CARD payment (money = Decimal), reconciles to PAID', async () => {
    const { svc, tx } = makeService('PENDING');

    const res = await svc.settleCheckout(REF);

    expect(res).toEqual({ settled: true });
    expect(tx.checkoutSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'sess-1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'PAID' }),
    });
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    const data = tx.payment.create.mock.calls[0][0].data;
    expect(data.status).toBe('VERIFIED');
    expect(data.type).toBe('INCOME');
    expect(data.method).toBe('CARD');
    expect(data.reference).toBe(REF);
    // Money invariant (§5.3): amount is a Prisma.Decimal (the session's), never a number.
    expect(data.amount).toBeInstanceOf(Prisma.Decimal);
    expect(data.amount.equals(new Prisma.Decimal(2700))).toBe(true);
    // Reconcile ran and settled the invoice.
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'PAID' },
    });
  });

  it('replayed webhook is idempotent: session already PAID → no new payment, no reconcile', async () => {
    const { svc, tx } = makeService('PAID');

    const res = await svc.settleCheckout(REF);

    expect(res).toEqual({ settled: false, alreadySettled: true });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });

  it('unknown providerRef → NotFoundException (never settles a phantom)', async () => {
    const { svc } = makeService('PENDING', { session: null });
    await expect(svc.settleCheckout('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
