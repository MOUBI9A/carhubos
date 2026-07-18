import { ForbiddenException } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

/**
 * Unit tests for the SaaS entitlements gates. A mocked Prisma is sufficient —
 * every assertion is about the plan-limit / dunning / fail-open logic, not the
 * DB. The live lifecycle (limit → 403, suspended → 403, restore) is proven
 * separately by a throwaway harness during verification.
 */
function makePrisma(overrides: any = {}) {
  return {
    subscription: { findUnique: jest.fn() },
    car: { count: jest.fn().mockResolvedValue(0) },
    agencyMembership: { count: jest.fn().mockResolvedValue(0) },
    booking: { count: jest.fn().mockResolvedValue(0) },
    platformInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function sub(plan: Partial<any>, status = 'ACTIVE') {
  return {
    status,
    trialEndsAt: null,
    plan: {
      key: plan.key ?? 'STARTER',
      name: plan.name ?? 'Starter',
      priceMonthly: plan.priceMonthly ?? 299,
      maxCars: plan.maxCars ?? null,
      maxStaff: plan.maxStaff ?? null,
      maxBookingsPerMonth: plan.maxBookingsPerMonth ?? null,
      features: plan.features ?? ['trust_network'],
    },
  };
}

describe('EntitlementsService', () => {
  describe('getEntitlements — fail-open default', () => {
    it('returns BETA (unlimited, all features, operating) when no subscription exists', async () => {
      const prisma = makePrisma();
      prisma.subscription.findUnique.mockResolvedValue(null);
      const svc = new EntitlementsService(prisma);

      const ent = await svc.getEntitlements('agency-1');
      expect(ent.planKey).toBe('BETA');
      expect(ent.operating).toBe(true);
      expect(ent.limits).toEqual({
        maxCars: null,
        maxStaff: null,
        maxBookingsPerMonth: null,
      });
      expect(ent.features).toContain('*');
    });

    it('never hits the DB for an empty agencyId', async () => {
      const prisma = makePrisma();
      const svc = new EntitlementsService(prisma);
      const ent = await svc.getEntitlements('');
      expect(ent.planKey).toBe('BETA');
      expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('hasFeature', () => {
    it('grants everything on the BETA wildcard', async () => {
      const prisma = makePrisma();
      prisma.subscription.findUnique.mockResolvedValue(sub({ key: 'BETA', features: ['*'] }));
      const svc = new EntitlementsService(prisma);
      expect(await svc.hasFeature('a', 'hub')).toBe(true);
    });

    it('denies a feature the plan does not list', async () => {
      const prisma = makePrisma();
      prisma.subscription.findUnique.mockResolvedValue(sub({ features: ['trust_network'] }));
      const svc = new EntitlementsService(prisma);
      expect(await svc.hasFeature('a', 'hub')).toBe(false);
      expect(await svc.hasFeature('a', 'trust_network')).toBe(true);
    });
  });

  describe('assertWithinLimit', () => {
    it('does not throw on an unlimited (null) limit', async () => {
      const prisma = makePrisma({ car: { count: jest.fn().mockResolvedValue(9999) } });
      prisma.subscription.findUnique.mockResolvedValue(sub({ maxCars: null }));
      const svc = new EntitlementsService(prisma);
      await expect(svc.assertWithinLimit('a', 'cars')).resolves.toBeUndefined();
    });

    it('throws PLAN_LIMIT_REACHED when adding would exceed the limit', async () => {
      const prisma = makePrisma({ car: { count: jest.fn().mockResolvedValue(15) } });
      prisma.subscription.findUnique.mockResolvedValue(sub({ maxCars: 15 }));
      const svc = new EntitlementsService(prisma);
      await expect(svc.assertWithinLimit('a', 'cars')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      try {
        await svc.assertWithinLimit('a', 'cars');
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          code: 'PLAN_LIMIT_REACHED',
          resource: 'cars',
          limit: 15,
          current: 15,
        });
      }
    });

    it('allows creating up to exactly the limit', async () => {
      const prisma = makePrisma({ car: { count: jest.fn().mockResolvedValue(14) } });
      prisma.subscription.findUnique.mockResolvedValue(sub({ maxCars: 15 }));
      const svc = new EntitlementsService(prisma);
      await expect(svc.assertWithinLimit('a', 'cars')).resolves.toBeUndefined();
    });
  });

  describe('assertOperating — dunning gate', () => {
    it.each(['TRIAL', 'ACTIVE', 'PAST_DUE'])(
      'permits operating status %s',
      async (status) => {
        const prisma = makePrisma();
        prisma.subscription.findUnique.mockResolvedValue(sub({ maxCars: null }, status));
        const svc = new EntitlementsService(prisma);
        await expect(svc.assertOperating('a')).resolves.toBeUndefined();
      },
    );

    it.each(['SUSPENDED', 'CANCELED'])(
      'blocks non-operating status %s with SUBSCRIPTION_SUSPENDED',
      async (status) => {
        const prisma = makePrisma();
        prisma.subscription.findUnique.mockResolvedValue(sub({ maxCars: null }, status));
        const svc = new EntitlementsService(prisma);
        await expect(svc.assertOperating('a')).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      },
    );
  });
});
