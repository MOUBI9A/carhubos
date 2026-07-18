import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  IssueInvoiceDto,
  UpdateSubscriptionDto,
} from './dto/founder-billing.dto';

@Injectable()
export class SaasAdminService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  /** Platform roster: every live tenant with its real subscription + counts. */
  async getPlatformOverview() {
    const [agenciesCount, activeBookings, totalRevenue] = await Promise.all([
      // Soft-deleted agencies are excluded from the platform roster.
      this.prisma.agency.count({ where: { deletedAt: null } }),
      this.prisma.booking.count({ where: { status: 'ACTIVE' } }),
      this.prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
    ]);

    const agencies = await this.prisma.agency.findMany({
      where: { deletedAt: null },
      include: {
        subscription: {
          include: { plan: { select: { key: true, name: true } } },
        },
        _count: { select: { cars: true, bookings: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      stats: {
        totalAgencies: agenciesCount,
        liveBookings: activeBookings,
        platformGMV: totalRevenue._sum.amount || 0, // rental GMV (not MRR)
      },
      agencies: agencies.map((a) => ({
        id: a.id,
        name: a.name,
        tier: a.subscription?.plan.key ?? a.subscriptionTier,
        planName: a.subscription?.plan.name ?? a.subscriptionTier,
        subscriptionStatus: a.subscription?.status ?? 'NONE',
        trialEndsAt: a.subscription?.trialEndsAt ?? null,
        fleetSize: a._count.cars,
        totalBookings: a._count.bookings,
        seats: a._count.users,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * Founder business metrics — the money side, distinct from rental GMV.
   * MRR = sum of monthly price across ACTIVE subscriptions (BETA is 0, so MRR is
   * ~0 during the beta by design; it reflects real revenue as paid plans are
   * assigned). Conversion/churn are lightweight snapshots over current state.
   */
  async getFounderMetrics() {
    const subs = await this.prisma.subscription.findMany({
      include: { plan: { select: { key: true, priceMonthly: true } } },
    });

    let mrr = 0;
    let activeTenants = 0;
    let trials = 0;
    let paying = 0;
    const planDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};

    for (const s of subs) {
      const price = Number(s.plan.priceMonthly);
      planDistribution[s.plan.key] = (planDistribution[s.plan.key] ?? 0) + 1;
      statusDistribution[s.status] = (statusDistribution[s.status] ?? 0) + 1;
      if (s.status === 'ACTIVE') {
        activeTenants++;
        mrr += price;
        if (price > 0) paying++;
      }
      if (s.status === 'TRIAL') trials++;
    }

    const canceled = statusDistribution['CANCELED'] ?? 0;
    const totalTenants = subs.length;
    // Conversion: of everyone who has left trial (now paying or canceled), what
    // share pay. Churn: canceled share of all tenants. Both 0-safe.
    const convBase = paying + canceled;
    const conversionRate = convBase > 0 ? paying / convBase : 0;
    const churnRate = totalTenants > 0 ? canceled / totalTenants : 0;

    return {
      currency: 'MAD',
      mrr,
      arr: mrr * 12,
      totalTenants,
      activeTenants,
      trials,
      paying,
      conversionRate: Number(conversionRate.toFixed(4)),
      churnRate: Number(churnRate.toFixed(4)),
      planDistribution,
      statusDistribution,
    };
  }

  /** Legacy: set the denormalized tier string. Prefer updateSubscription. */
  async updateAgencyTier(id: string, tier: string) {
    return this.prisma.agency.update({
      where: { id },
      data: { subscriptionTier: tier },
    });
  }

  /**
   * Founder changes an agency's subscription (plan / status / trial extension).
   * Keeps Agency.subscriptionTier mirrored to the plan key and audits the change.
   */
  async updateSubscription(
    agencyId: string,
    dto: UpdateSubscriptionDto,
    actorId: string,
  ) {
    const sub = await this.prisma.subscription.findUnique({
      where: { agencyId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('This agency has no subscription.');
    }

    const data: {
      planId?: string;
      status?: string;
      trialEndsAt?: Date;
      note?: string;
    } = {};
    let newPlanKey: string | undefined;

    if (dto.planKey && dto.planKey !== sub.plan.key) {
      const plan = await this.prisma.plan.findUnique({
        where: { key: dto.planKey },
      });
      if (!plan) throw new BadRequestException('Unknown plan.');
      data.planId = plan.id;
      newPlanKey = plan.key;
    }
    if (dto.status) data.status = dto.status;
    if (dto.extendTrialDays) {
      const base = sub.trialEndsAt ?? new Date();
      data.trialEndsAt = new Date(
        base.getTime() + dto.extendTrialDays * 24 * 60 * 60 * 1000,
      );
    }
    if (dto.note !== undefined) data.note = dto.note;

    const updated = await this.prisma.subscription.update({
      where: { agencyId },
      data,
      include: { plan: { select: { key: true, name: true } } },
    });

    if (newPlanKey) {
      await this.prisma.agency.update({
        where: { id: agencyId },
        data: { subscriptionTier: newPlanKey },
      });
    }

    await this.auditLogs.log(
      agencyId,
      actorId,
      'SUBSCRIPTION_UPDATE',
      'SUBSCRIPTION',
      updated.id,
      { plan: sub.plan.key, status: sub.status, trialEndsAt: sub.trialEndsAt },
      {
        plan: updated.plan.key,
        status: updated.status,
        trialEndsAt: updated.trialEndsAt,
      },
    );

    return updated;
  }

  /** Founder issues a manual platform invoice to an agency. */
  async issueInvoice(agencyId: string, dto: IssueInvoiceDto, actorId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true },
    });
    if (!agency) throw new NotFoundException('Agency not found.');

    const sub = await this.prisma.subscription.findUnique({
      where: { agencyId },
      select: { id: true },
    });

    // Sequential-ish human invoice number: FIDER-<year>-<seq>.
    const year = new Date().getFullYear();
    const count = await this.prisma.platformInvoice.count();
    const number = `FIDER-${year}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await this.prisma.platformInvoice.create({
      data: {
        number,
        agencyId,
        subscriptionId: sub?.id,
        amount: dto.amount,
        status: 'ISSUED',
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        note: dto.note,
      },
    });

    await this.auditLogs.log(
      agencyId,
      actorId,
      'PLATFORM_INVOICE_ISSUE',
      'PLATFORM_INVOICE',
      invoice.id,
      null,
      { number, amount: dto.amount },
    );

    return invoice;
  }

  /** Founder marks a platform invoice paid (manual reconciliation). */
  async markInvoicePaid(invoiceId: string, actorId: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid.');
    }
    if (invoice.status === 'VOID') {
      throw new BadRequestException('A void invoice cannot be paid.');
    }

    const updated = await this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await this.auditLogs.log(
      invoice.agencyId,
      actorId,
      'PLATFORM_INVOICE_PAID',
      'PLATFORM_INVOICE',
      invoice.id,
      { status: invoice.status },
      { status: 'PAID' },
    );

    return updated;
  }
}
