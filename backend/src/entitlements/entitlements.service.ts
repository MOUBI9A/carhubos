import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PLAN_KEY,
  OPERATING_STATUSES,
  planHasFeature,
  type SubscriptionStatus,
} from '../common/plans';

export interface Entitlements {
  agencyId: string;
  planKey: string;
  planName: string;
  priceMonthly: number;
  status: SubscriptionStatus;
  operating: boolean; // may the tenant keep using the product?
  trialEndsAt: Date | null;
  limits: {
    maxCars: number | null; // null = unlimited
    maxStaff: number | null;
    maxBookingsPerMonth: number | null;
  };
  features: string[]; // includes '*' on BETA
}

/**
 * The entitlements engine (Phase 11) — the single place the app asks "what is
 * this agency allowed to do?". Reads the agency's Subscription + Plan.
 *
 * Fail-open by design during the beta: an agency with no subscription row (seeded
 * before Phase 11, or a fresh DB with plans not yet seeded) is treated as BETA —
 * unlimited, all features, operating — so missing billing data never bricks a
 * tenant. The gating/metering machinery is real and enforces the moment a paid,
 * limited plan is assigned.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private betaFallback(agencyId: string): Entitlements {
    return {
      agencyId,
      planKey: DEFAULT_PLAN_KEY,
      planName: 'Beta Access',
      priceMonthly: 0,
      status: 'ACTIVE',
      operating: true,
      trialEndsAt: null,
      limits: { maxCars: null, maxStaff: null, maxBookingsPerMonth: null },
      features: ['*'],
    };
  }

  async getEntitlements(agencyId: string): Promise<Entitlements> {
    if (!agencyId) return this.betaFallback(agencyId);

    const sub = await this.prisma.subscription.findUnique({
      where: { agencyId },
      include: { plan: true },
    });
    if (!sub || !sub.plan) return this.betaFallback(agencyId);

    const status = sub.status as SubscriptionStatus;
    return {
      agencyId,
      planKey: sub.plan.key,
      planName: sub.plan.name,
      priceMonthly: Number(sub.plan.priceMonthly),
      status,
      operating: OPERATING_STATUSES.includes(status),
      trialEndsAt: sub.trialEndsAt,
      limits: {
        maxCars: sub.plan.maxCars,
        maxStaff: sub.plan.maxStaff,
        maxBookingsPerMonth: sub.plan.maxBookingsPerMonth,
      },
      features: sub.plan.features,
    };
  }

  async hasFeature(agencyId: string, feature: string): Promise<boolean> {
    const ent = await this.getEntitlements(agencyId);
    return planHasFeature(ent.features, feature);
  }

  /** Current usage counts (bookings scoped to the current calendar month). */
  async getUsage(agencyId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [cars, staff, bookingsThisMonth] = await Promise.all([
      this.prisma.car.count({ where: { agencyId } }),
      this.prisma.agencyMembership.count({ where: { agencyId } }),
      this.prisma.booking.count({
        where: { agencyId, createdAt: { gte: startOfMonth } },
      }),
    ]);
    return { cars, staff, bookingsThisMonth };
  }

  /** Everything the agency billing page needs: plan + status + usage + invoices. */
  async getBillingSnapshot(agencyId: string) {
    const [ent, usage, invoices] = await Promise.all([
      this.getEntitlements(agencyId),
      this.getUsage(agencyId),
      agencyId
        ? this.prisma.platformInvoice.findMany({
            where: { agencyId },
            orderBy: { issuedAt: 'desc' },
            take: 24,
          })
        : Promise.resolve([]),
    ]);
    return { ...ent, usage, invoices };
  }

  /**
   * Enforce a create-limit before adding a resource. Unlimited (null) never
   * blocks. Throws 403 with an upgrade-prompt payload when at/over the limit.
   * `additional` = how many the caller is about to add (default 1).
   */
  async assertWithinLimit(
    agencyId: string,
    resource: 'cars' | 'staff' | 'bookings',
    additional = 1,
  ): Promise<void> {
    const ent = await this.getEntitlements(agencyId);
    const limit =
      resource === 'cars'
        ? ent.limits.maxCars
        : resource === 'staff'
          ? ent.limits.maxStaff
          : ent.limits.maxBookingsPerMonth;
    if (limit === null || limit === undefined) return; // unlimited plan

    const usage = await this.getUsage(agencyId);
    const current =
      resource === 'cars'
        ? usage.cars
        : resource === 'staff'
          ? usage.staff
          : usage.bookingsThisMonth;

    if (current + additional > limit) {
      throw new ForbiddenException({
        message: `Your ${ent.planName} plan allows ${limit} ${resource}. Upgrade your plan to add more.`,
        code: 'PLAN_LIMIT_REACHED',
        resource,
        limit,
        current,
        planKey: ent.planKey,
      });
    }
  }

  /**
   * Dunning gate: block business actions when the subscription is SUSPENDED or
   * CANCELED (TRIAL/ACTIVE/PAST_DUE keep operating — PAST_DUE is a grace window).
   */
  async assertOperating(agencyId: string): Promise<void> {
    const ent = await this.getEntitlements(agencyId);
    if (!ent.operating) {
      throw new ForbiddenException({
        message:
          'Your subscription is suspended. Please settle your account to continue.',
        code: 'SUBSCRIPTION_SUSPENDED',
        status: ent.status,
      });
    }
  }
}
