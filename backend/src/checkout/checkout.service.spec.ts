import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CheckoutService } from './checkout.service';

/**
 * Webhook orchestration for online payment settlement. The money-critical
 * idempotency (a replayed webhook settling exactly once) lives in
 * PaymentsService.settleCheckout and is proven end-to-end against the real DB in
 * the live smoke; here we cover the orchestration + the load-bearing security
 * property: an unverified webhook (adapter throws) must NEVER settle.
 */
describe('CheckoutService.handleWebhook', () => {
  function make(paid: boolean, providerRef = 'mock_x') {
    const gateway = {
      parseWebhook: jest.fn().mockResolvedValue({ providerRef, paid, amount: 4500 }),
    };
    const settleCheckout = jest.fn().mockResolvedValue({ settled: true });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { checkoutSession: { updateMany } };
    const svc = new CheckoutService(
      prisma as any,
      gateway as any,
      { settleCheckout } as any,
    );
    return { svc, gateway, settleCheckout, updateMany };
  }

  it('settles on a paid event via PaymentsService.settleCheckout', async () => {
    const { svc, settleCheckout } = make(true, 'mock_abc');
    const res = await svc.handleWebhook('mock', '{}', {});
    expect(settleCheckout).toHaveBeenCalledWith('mock_abc');
    expect(res).toEqual({ received: true, settled: true });
  });

  it('does NOT settle on a non-paid event — marks the pending session FAILED', async () => {
    const { svc, settleCheckout, updateMany } = make(false, 'mock_abc');
    const res = await svc.handleWebhook('mock', '{}', {});
    expect(settleCheckout).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith({
      where: { providerRef: 'mock_abc', status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    expect(res).toEqual({ received: true, settled: false });
  });

  it('an unverified webhook (adapter throws) never settles', async () => {
    const gateway = {
      parseWebhook: jest.fn().mockRejectedValue(new Error('bad signature')),
    };
    const settleCheckout = jest.fn();
    const svc = new CheckoutService(
      {} as any,
      gateway as any,
      { settleCheckout } as any,
    );
    await expect(svc.handleWebhook('mock', '{}', {})).rejects.toThrow(
      'bad signature',
    );
    expect(settleCheckout).not.toHaveBeenCalled();
  });
});

/**
 * V1 SaaS plan-upgrade checkout (founder-locked 2026-07-27): one-shot, full
 * new-plan price, no proration, self-serve UPGRADES ONLY. These tests lock in
 * the strict one-shot/no-downgrade product rules at the service boundary —
 * every rejection must also prove zero side effect (no CheckoutSession row,
 * no gateway call reaching the point of persistence). The actual plan switch
 * only ever happens on webhook settlement (see settle-subscription-checkout.spec.ts).
 */
describe('CheckoutService.createSubscriptionCheckout', () => {
  const D = (n: number) => new Prisma.Decimal(n);
  const STARTER = { key: 'STARTER', sortOrder: 1 };
  const PRO = { key: 'PRO', sortOrder: 2 };
  const BETA = { key: 'BETA', sortOrder: 0 };
  const PRO_ROW = {
    id: 'plan-pro',
    key: 'PRO',
    sortOrder: 2,
    priceMonthly: D(799),
    name: 'Pro',
  };

  function make(opts: {
    currentPlan?: { key: string; sortOrder: number } | null;
    targetPlanRow?: typeof PRO_ROW | null;
  } = {}) {
    const currentPlan = opts.currentPlan === undefined ? STARTER : opts.currentPlan;
    const sub = currentPlan ? { agencyId: 'ag-1', plan: currentPlan } : null;
    const targetPlanRow = opts.targetPlanRow === undefined ? PRO_ROW : opts.targetPlanRow;

    const checkoutSessionCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      subscription: { findUnique: jest.fn().mockResolvedValue(sub) },
      plan: { findUnique: jest.fn().mockResolvedValue(targetPlanRow) },
      checkoutSession: { create: checkoutSessionCreate },
    };
    const createCheckout = jest.fn().mockResolvedValue({
      providerRef: 'mock_sess-1',
      redirectUrl: 'http://localhost:3002/pay/mock?ref=mock_sess-1',
    });
    const gateway = { activeProvider: 'MOCK', createCheckout };
    const svc = new CheckoutService(prisma as any, gateway as any, {} as any);
    return { svc, prisma, gateway, checkoutSessionCreate, createCheckout };
  }

  it('upgrade happy path: STARTER→PRO creates a PENDING SAAS_SUBSCRIPTION session at full target price', async () => {
    const { svc, checkoutSessionCreate, createCheckout } = make();

    const res = await svc.createSubscriptionCheckout('ag-1', { planKey: 'PRO' });

    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 799, currency: 'MAD' }),
    );
    expect(checkoutSessionCreate).toHaveBeenCalledTimes(1);
    const data = checkoutSessionCreate.mock.calls[0][0].data;
    expect(data.purpose).toBe('SAAS_SUBSCRIPTION');
    expect(data.status).toBe('PENDING');
    expect(data.agencyId).toBe('ag-1');
    expect(data.targetPlanId).toBe('plan-pro');
    // Money of record is the plan's own Decimal, never a derived number.
    expect(data.amount).toBeInstanceOf(Prisma.Decimal);
    expect(data.amount.equals(D(799))).toBe(true);
    expect(res).toEqual({
      sessionId: expect.any(String),
      providerRef: 'mock_sess-1',
      provider: 'MOCK',
      redirectUrl: 'http://localhost:3002/pay/mock?ref=mock_sess-1',
    });
  });

  it('rejects a downgrade (target sortOrder < current) — no session created', async () => {
    const { svc, checkoutSessionCreate, createCheckout } = make({
      currentPlan: PRO,
      targetPlanRow: { ...PRO_ROW, id: 'plan-starter', key: 'STARTER', sortOrder: 1 },
    });

    await expect(
      svc.createSubscriptionCheckout('ag-1', { planKey: 'STARTER' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createCheckout).not.toHaveBeenCalled();
    expect(checkoutSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects re-selecting the current plan (target sortOrder == current) — no session created', async () => {
    const { svc, checkoutSessionCreate } = make({
      currentPlan: PRO,
      targetPlanRow: PRO_ROW,
    });

    await expect(
      svc.createSubscriptionCheckout('ag-1', { planKey: 'PRO' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(checkoutSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects any self-serve upgrade from BETA, even though BETA has the lowest sortOrder — avoids the unlimited→capped entitlement cliff', async () => {
    const { svc, checkoutSessionCreate, createCheckout } = make({ currentPlan: BETA });

    await expect(
      svc.createSubscriptionCheckout('ag-1', { planKey: 'PRO' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createCheckout).not.toHaveBeenCalled();
    expect(checkoutSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown plan key defensively (DTO @IsIn should already block this) — no session created', async () => {
    const { svc, checkoutSessionCreate } = make({ targetPlanRow: null });

    await expect(
      svc.createSubscriptionCheckout('ag-1', { planKey: 'PRO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(checkoutSessionCreate).not.toHaveBeenCalled();
  });

  it('404s when the agency has no subscription row', async () => {
    const { svc } = make({ currentPlan: null });

    await expect(
      svc.createSubscriptionCheckout('ag-1', { planKey: 'PRO' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
