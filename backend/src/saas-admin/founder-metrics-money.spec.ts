import { Prisma } from '@prisma/client';

import { SaasAdminService } from './saas-admin.service';

/**
 * MRR/ARR are money and must be computed with the Decimal API, never JS floats
 * (`CLAUDE.md` §5.3: "Money math on Float drifts — 333.33×3 ≠ 999.99").
 *
 * `getFounderMetrics` previously did `Number(plan.priceMonthly)` then `mrr +=
 * price` and `arr: mrr * 12`. With whole-MAD seed prices that happens to be
 * exact, so nothing looked wrong — but `Plan.priceMonthly` is documented in the
 * schema as "MAD, VAT-inclusive", and VAT-inclusive prices are exactly the ones
 * that carry centimes. At 299.99 × 7 the float sum is 2099.9300000000003.
 *
 * These tests pin the money path with a price that actually has centimes, so a
 * regression to float arithmetic fails here instead of quietly reporting a
 * wrong revenue number to the founder.
 */
describe('getFounderMetrics — MRR/ARR are Decimal money, not floats', () => {
  const PRICE = '299.99';
  const ACTIVE_SUBS = 7;

  const makeService = (
    subs: Array<{ status: string; key: string; price: string }>,
  ) => {
    const prisma = {
      subscription: {
        findMany: jest.fn().mockResolvedValue(
          subs.map((s) => ({
            status: s.status,
            plan: { key: s.key, priceMonthly: new Prisma.Decimal(s.price) },
          })),
        ),
      },
    };
    return new SaasAdminService(prisma as any, {} as any);
  };

  it('sums MRR exactly, with no float drift', async () => {
    const service = makeService(
      Array.from({ length: ACTIVE_SUBS }, () => ({
        status: 'ACTIVE',
        key: 'STARTER',
        price: PRICE,
      })),
    );

    const { mrr } = await service.getFounderMetrics();

    // The exact value. The old float path produced 2099.9300000000003.
    expect(new Prisma.Decimal(mrr as never).toString()).toBe('2099.93');

    let floatSum = 0;
    for (let i = 0; i < ACTIVE_SUBS; i++) floatSum += Number(PRICE);
    expect(floatSum).not.toBe(2099.93); // proves the drift is real, not theoretical
  });

  it('derives ARR by Decimal multiplication', async () => {
    const service = makeService(
      Array.from({ length: ACTIVE_SUBS }, () => ({
        status: 'ACTIVE',
        key: 'STARTER',
        price: PRICE,
      })),
    );

    const { arr } = await service.getFounderMetrics();
    expect(new Prisma.Decimal(arr as never).toString()).toBe('25199.16');
  });

  it('counts a 0.00 BETA plan as active but not paying', async () => {
    // Guards the `price.greaterThan(0)` comparison — `>` on a Decimal coerces,
    // which is why the invariant bans it. This is the live beta shape today.
    const service = makeService([
      { status: 'ACTIVE', key: 'BETA', price: '0.00' },
      { status: 'ACTIVE', key: 'BETA', price: '0.00' },
      { status: 'ACTIVE', key: 'STARTER', price: PRICE },
    ]);

    const metrics = await service.getFounderMetrics();

    expect(metrics.activeTenants).toBe(3);
    expect(metrics.paying).toBe(1);
    expect(new Prisma.Decimal(metrics.mrr as never).toString()).toBe(PRICE);
  });

  it('reports zero MRR when every tenant is on the free beta plan', async () => {
    const service = makeService([
      { status: 'ACTIVE', key: 'BETA', price: '0.00' },
      { status: 'TRIAL', key: 'BETA', price: '0.00' },
    ]);

    const metrics = await service.getFounderMetrics();
    expect(new Prisma.Decimal(metrics.mrr as never).toString()).toBe('0');
    expect(metrics.paying).toBe(0);
    expect(metrics.trials).toBe(1);
  });
});
