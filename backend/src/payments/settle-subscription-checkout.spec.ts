import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

/**
 * V1 SaaS plan-upgrade settlement (founder-locked 2026-07-27) — the webhook
 * path that actually flips an agency's plan. Shares settle-checkout.spec's
 * load-bearing IDEMPOTENCY contract (a replayed webhook settles exactly
 * once), plus two properties specific to this purpose:
 *   - the PlatformInvoice is created already PAID, here, never earlier — a
 *     failed/expired checkout must never leave a phantom ISSUED invoice;
 *   - the field writes (Subscription.planId+status, Agency.subscriptionTier
 *     mirror, AuditLog shape) mirror SaasAdminService.updateSubscription
 *     exactly, so the founder console and this webhook stay consistent.
 */
describe('PaymentsService.settleCheckout — SAAS_SUBSCRIPTION purpose', () => {
  const REF = 'stripe_cs_test_1';
  const D = (n: number) => new Prisma.Decimal(n);

  const defaultSession = {
    id: 'sess-1',
    providerRef: REF,
    status: 'PENDING',
    purpose: 'SAAS_SUBSCRIPTION',
    amount: D(799),
    agencyId: 'ag-1',
    provider: 'STRIPE',
    invoiceId: null,
    invoice: null,
    targetPlanId: 'plan-pro',
    targetPlan: { id: 'plan-pro', key: 'PRO', name: 'Pro', sortOrder: 2 },
  };

  function makeService(
    opts: {
      sessionStatus?: string;
      session?: Record<string, unknown> | null;
    } = {},
  ) {
    const sessionStatus = opts.sessionStatus ?? 'PENDING';
    const session =
      opts.session === null
        ? null
        : (opts.session ?? { ...defaultSession, status: sessionStatus });

    const currentSub = {
      id: 'sub-1',
      agencyId: 'ag-1',
      status: 'ACTIVE',
      trialEndsAt: null,
      plan: { key: 'STARTER', name: 'Starter' },
    };
    const updatedSub = {
      ...currentSub,
      status: 'ACTIVE',
      plan: { key: 'PRO', name: 'Pro' },
    };

    const tx = {
      checkoutSession: {
        findUnique: jest.fn().mockResolvedValue(session),
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: sessionStatus === 'PENDING' ? 1 : 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
      subscription: {
        findUnique: jest.fn().mockResolvedValue(currentSub),
        update: jest.fn().mockResolvedValue(updatedSub),
      },
      agency: { update: jest.fn().mockResolvedValue({}) },
      platformInvoice: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'pinv-1' }),
      },
    };
    const prisma = { $transaction: (cb: any) => cb(tx) };
    const auditLogs = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new PaymentsService(prisma as any, {} as any, auditLogs as any);
    return { svc, tx, auditLogs };
  }

  it('first delivery: flips PENDING→PAID, creates a PAID PlatformInvoice, upgrades Subscription+Agency, audits the change', async () => {
    const { svc, tx, auditLogs } = makeService();

    const res = await svc.settleCheckout(REF);

    expect(res).toEqual({ settled: true });
    expect(tx.checkoutSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'sess-1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'PAID' }),
    });

    // Invoice is born PAID — no ISSUED phantom ever exists for this purpose.
    expect(tx.platformInvoice.create).toHaveBeenCalledTimes(1);
    const invoiceData = tx.platformInvoice.create.mock.calls[0][0].data;
    expect(invoiceData.status).toBe('PAID');
    expect(invoiceData.agencyId).toBe('ag-1');
    expect(invoiceData.amount).toBeInstanceOf(Prisma.Decimal);
    expect(invoiceData.amount.equals(D(799))).toBe(true);

    expect(tx.checkoutSession.update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { platformInvoiceId: 'pinv-1' },
    });

    // Full target price, no proration, applied immediately — only here.
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { agencyId: 'ag-1' },
      data: { planId: 'plan-pro', status: 'ACTIVE' },
      include: { plan: { select: { key: true, name: true } } },
    });
    expect(tx.agency.update).toHaveBeenCalledWith({
      where: { id: 'ag-1' },
      data: { subscriptionTier: 'PRO' },
    });

    expect(auditLogs.log).toHaveBeenCalledWith(
      'ag-1',
      'webhook:STRIPE',
      'SUBSCRIPTION_UPDATE',
      'SUBSCRIPTION',
      'sub-1',
      expect.objectContaining({ plan: 'STARTER' }),
      expect.objectContaining({ plan: 'PRO' }),
    );
  });

  it('replayed webhook is idempotent: already-PAID session → no new invoice, no subscription/agency writes, no audit', async () => {
    const { svc, tx, auditLogs } = makeService({ sessionStatus: 'PAID' });

    const res = await svc.settleCheckout(REF);

    expect(res).toEqual({ settled: false, alreadySettled: true });
    expect(tx.platformInvoice.create).not.toHaveBeenCalled();
    expect(tx.subscription.update).not.toHaveBeenCalled();
    expect(tx.agency.update).not.toHaveBeenCalled();
    expect(auditLogs.log).not.toHaveBeenCalled();
  });

  it('a SAAS_SUBSCRIPTION session with no targetPlan is a data-integrity error, not a silent success', async () => {
    const { svc, tx } = makeService({
      session: {
        ...defaultSession,
        status: 'PENDING',
        targetPlanId: null,
        targetPlan: null,
      },
    });

    await expect(svc.settleCheckout(REF)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.platformInvoice.create).not.toHaveBeenCalled();
  });

  it('unknown providerRef → NotFoundException (never settles a phantom)', async () => {
    const { svc } = makeService({ session: null });
    await expect(svc.settleCheckout(REF)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
