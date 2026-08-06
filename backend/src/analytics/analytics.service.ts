import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Recalculates the ROI score for a specific car.
   * Logic: (Total Revenue - Total Maintenance Costs - Depreciation Estimate) / Age in Fleet
   */
  async calculateCarRoi(agencyId: string, carId: string) {
    // Tenant-scoped: a carId from another agency resolves to null → ROI 0 and no
    // write. agencyId comes from the caller (JWT / an already-scoped internal
    // record), never from client input (CLAUDE.md §5.1).
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
    });

    if (!car) return 0;

    // 1. Calculate Total Revenue — DB-side sum instead of loading every
    // booking → invoice → payment row for this car.
    const revenueAgg = await this.prisma.payment.aggregate({
      where: {
        invoice: { booking: { carId, status: 'COMPLETED' } },
        type: 'INCOME',
        status: 'VERIFIED',
      },
      _sum: { amount: true },
    });
    // amount is Prisma.Decimal — coerce (ROI is a Float score).
    const totalRevenue = revenueAgg._sum.amount?.toNumber() ?? 0;

    // 2. Calculate Total Maintenance Costs
    const maintenanceAgg = await this.prisma.maintenanceRecord.aggregate({
      where: { carId, status: 'COMPLETED' },
      _sum: { cost: true },
    });
    const totalMaintenance = maintenanceAgg._sum.cost?.toNumber() ?? 0;

    // 3. Simple ROI Calculation (Percentage)
    // Formula: ((Revenue - Costs) / Costs) * 100
    // If costs are 0, we use a base cost logic or just show revenue performance
    const totalCosts = totalMaintenance > 0 ? totalMaintenance : 1;
    const roiScore = ((totalRevenue - totalMaintenance) / totalCosts) * 100;

    // Update car with new ROI. updateMany (not update) so the write carries the
    // agencyId in its WHERE — a cross-tenant carId can never be written to
    // (defence-in-depth: the findFirst above already returned for this agency).
    await this.prisma.car.updateMany({
      where: { id: carId, agencyId },
      data: { currentRoi: roiScore },
    });

    return roiScore;
  }

  /**
   * Generates a demand report based on Refusal Logs
   */
  async getDemandIntelligence(agencyId: string) {
    const [agg, byTypeGroups] = await Promise.all([
      this.prisma.refusalLog.aggregate({
        where: { agencyId, status: 'WAITING' },
        _sum: { potentialRevenue: true },
        _count: { _all: true },
      }),
      // Group-by-car-type counts computed in the DB instead of loading every
      // waiting refusal row and bucketing in JS.
      this.prisma.refusalLog.groupBy({
        by: ['requestedCarType'],
        where: { agencyId, status: 'WAITING' },
        _count: { requestedCarType: true },
      }),
    ]);

    const potentialRevenue = agg._sum.potentialRevenue?.toNumber() ?? 0;

    const highDemandType =
      byTypeGroups.length > 0
        ? byTypeGroups.reduce((best, g) =>
            g._count.requestedCarType > best._count.requestedCarType
              ? g
              : best,
          ).requestedCarType
        : 'NONE';

    return {
      potentialRevenue,
      refusalCount: agg._count._all,
      highDemandType,
    };
  }

  async getAgencyInsights(agencyId: string) {
    const demand = await this.getDemandIntelligence(agencyId);
    const carAgg = await this.prisma.car.aggregate({
      where: { agencyId },
      _count: { _all: true },
      _avg: { currentRoi: true },
    });

    return {
      demand,
      fleetSize: carAgg._count._all,
      avgRoi: carAgg._count._all > 0 ? (carAgg._avg.currentRoi ?? 0) : 0,
    };
  }

  async getCarPerformance(agencyId: string, carId: string) {
    // Scope the recompute + read to the caller's agency. calculateCarRoi is
    // agency-scoped, so a cross-tenant carId reads/writes nothing; the scoped
    // findFirst then yields null → 404 (no existence leak, CLAUDE.md §5.1)
    // rather than returning another tenant's car, bookings and maintenance.
    const roi = await this.calculateCarRoi(agencyId, carId);
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
      include: { maintenance: true, bookings: true },
    });
    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return {
      car,
      roiScore: roi,
    };
  }

  /**
   * Generates a monthly revenue pulse for the agency.
   */
  async getFinancialPulse(agencyId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          agencyId,
        },
        type: 'INCOME',
        status: 'VERIFIED',
        date: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: { date: 'asc' },
      // A true month-bucket groupBy isn't practical without raw SQL — keep
      // this findMany, but tightly scoped (6 months) and column-limited.
      select: { amount: true, date: true },
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyData = payments.reduce((acc, payment) => {
      const month = months[new Date(payment.date).getMonth()];
      acc[month] = (acc[month] || 0) + payment.amount.toNumber();
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData).map(([name, revenue]) => ({
      name,
      revenue,
    }));
  }

  /**
   * Calculates the utilization rate of the fleet over the last 30 days.
   */
  async getUtilizationMetrics(agencyId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cars = await this.prisma.car.count({ where: { agencyId } });
    // Day-diff math needs per-row start/end dates and can't be expressed as
    // a single SQL aggregate — keep the findMany, but tightly scoped
    // (30-day window) and column-limited instead of loading full rows.
    // Overlap semantics (startDate <= now AND endDate >= thirtyDaysAgo), not a
    // plain startDate >= thirtyDaysAgo filter — a booking that started earlier
    // than the window but is still ACTIVE today must still count, otherwise
    // long-running rentals silently drop out of the utilization figure.
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        agencyId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        startDate: { lte: now },
        endDate: { gte: thirtyDaysAgo },
      },
      select: { startDate: true, endDate: true },
    });

    const totalFleetDays = cars * 30;
    let totalRentedDays = 0;

    activeBookings.forEach((booking) => {
      const start = new Date(Math.max(booking.startDate.getTime(), thirtyDaysAgo.getTime()));
      // Clamp the end to "now" too — an ACTIVE booking's endDate is its planned
      // return, which can be in the future, and those not-yet-elapsed days
      // aren't rented days yet.
      const end = new Date(Math.min(booking.endDate.getTime(), now.getTime()));
      const diffTime = Math.max(end.getTime() - start.getTime(), 0);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalRentedDays += diffDays;
    });

    const utilizationRate = totalFleetDays > 0 ? (totalRentedDays / totalFleetDays) * 100 : 0;

    return {
      totalFleetDays,
      totalRentedDays,
      utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
    };
  }

  /**
   * Consolidated ERP Dashboard — aggregates all key business metrics.
   */
  async getErpDashboard(agencyId: string) {
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // ── 1. GMV (Total Verified Revenue) ────────────────────────────
    // Previously loaded every verified INCOME payment ever made for the
    // agency (unbounded) just to sum it in JS — now two DB-side sums.
    const [gmvAgg, lastYearGmvAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          invoice: { agencyId },
          type: 'INCOME',
          status: 'VERIFIED',
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { agencyId },
          type: 'INCOME',
          status: 'VERIFIED',
          date: { lt: twelveMonthsAgo },
        },
        _sum: { amount: true },
      }),
    ]);
    // Money fields are Prisma.Decimal — coerce the aggregate sum to a number.
    const gmvTotal = gmvAgg._sum.amount?.toNumber() ?? 0;
    const lastYearGmv = lastYearGmvAgg._sum.amount?.toNumber() ?? 0;
    const gmvChange = lastYearGmv > 0
      ? ((gmvTotal - lastYearGmv) / lastYearGmv) * 100
      : gmvTotal > 0 ? 100 : 0;

    // ── 2. Fleet Health ────────────────────────────────────────────
    const allCars = await this.prisma.car.findMany({
      where: { agencyId },
      include: { documents: true, maintenance: true },
    });
    const totalCars = allCars.length;
    const healthyCars = allCars.filter(
      (car) =>
        car.status !== 'OUT_OF_SERVICE' &&
        car.documents.every((doc) => doc.status !== 'EXPIRED'),
    ).length;
    const fleetHealthPercent = totalCars > 0
      ? Math.round((healthyCars / totalCars) * 100)
      : 0;

    // Cars with expiring docs
    const expiringDocCars = allCars.filter((car) =>
      car.documents.some((doc) => doc.status === 'EXPIRING_SOON'),
    );
    const healthChange = expiringDocCars.length > 0
      ? -(expiringDocCars.length / Math.max(totalCars, 1)) * 100
      : 0;

    // ── 3. Utilization ─────────────────────────────────────────────
    const utilMetrics = await this.getUtilizationMetrics(agencyId);

    // ── 4. Efficiency Score ────────────────────────────────────────
    const efficiencyScore = Math.round(
      (utilMetrics.utilizationRate * 0.4) +
      (fleetHealthPercent * 0.4) +
      (gmvTotal > 0 ? 20 : 0),
    );

    // ── 5. Monthly Revenue & Expenses (12 months) ──────────────────
    // No clean SQL month-trunc groupBy without raw SQL — keep these
    // findManys, but tightly scoped (12 months) and column-limited.
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { agencyId },
        type: 'INCOME',
        status: 'VERIFIED',
        date: { gte: twelveMonthsAgo },
      },
      select: { amount: true, date: true },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        agencyId,
        date: { gte: twelveMonthsAgo },
      },
      select: { amount: true, date: true },
    });

    const maintenanceCosts = await this.prisma.maintenanceRecord.findMany({
      where: {
        car: { agencyId },
        status: 'COMPLETED',
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { cost: true, createdAt: true },
    });

    const monthlyRevenue: Record<string, number> = {};
    const monthlyExpenses: Record<string, number> = {};
    months.forEach((m) => {
      monthlyRevenue[m] = 0;
      monthlyExpenses[m] = 0;
    });

    recentPayments.forEach((p) => {
      const m = months[new Date(p.date).getMonth()];
      monthlyRevenue[m] += p.amount.toNumber();
    });

    expenses.forEach((e) => {
      const m = months[new Date(e.date).getMonth()];
      monthlyExpenses[m] += e.amount.toNumber();
    });

    maintenanceCosts.forEach((mc) => {
      const m = months[new Date(mc.createdAt).getMonth()];
      monthlyExpenses[m] += mc.cost.toNumber();
    });

    const monthlyData = months.map((m) => ({
      month: m,
      revenue: monthlyRevenue[m],
      expenses: monthlyExpenses[m],
    }));

    // ── 6. Real Exceptions ─────────────────────────────────────────
    const exceptions: Array<{ id: string; msg: string; severity: string; link: string }> = [];

    // Expiring/Expired documents
    for (const car of allCars) {
      for (const doc of car.documents) {
        if (doc.status === 'EXPIRED') {
          exceptions.push({
            id: doc.id,
            msg: `${doc.type.replace('_', ' ')} expired on ${car.brand} ${car.model} (${car.licensePlate})`,
            severity: 'danger',
            link: `/dashboard/fleet`,
          });
        } else if (doc.status === 'EXPIRING_SOON') {
          exceptions.push({
            id: doc.id,
            msg: `${doc.type.replace('_', ' ')} expiring soon on ${car.brand} ${car.model}`,
            severity: 'warning',
            link: `/dashboard/fleet`,
          });
        }
      }
    }

    // Overdue maintenance (vidange)
    for (const car of allCars) {
      if (car.nextServiceKm != null && car.nextServiceKm > 0 && car.mileage >= car.nextServiceKm) {
        exceptions.push({
          id: car.id,
          msg: `${car.brand} ${car.model} overdue for service at ${car.mileage.toLocaleString()} km`,
          severity: 'warning',
          link: `/dashboard/fleet`,
        });
      }
    }

    // Unpaid invoices
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { agencyId, status: 'DUE' },
      include: { booking: { include: { customer: true } } },
      take: 5,
    });
    for (const inv of unpaidInvoices) {
      const customerName = inv.booking?.customer
        ? `${inv.booking.customer.firstName} ${inv.booking.customer.lastName}`
        : 'Unknown';
      exceptions.push({
        id: inv.id,
        msg: `Unpaid invoice ${Number(inv.amount).toLocaleString()} MAD from ${customerName}`,
        severity: 'primary',
        link: `/dashboard/bookings`,
      });
    }

    // Limit to top 5 most critical
    const sortedExceptions = exceptions
      .sort((a, b) => {
        const priority = { danger: 0, warning: 1, primary: 2 };
        return (priority[a.severity] ?? 3) - (priority[b.severity] ?? 3);
      })
      .slice(0, 5);

    // ── 7. Strategic Advisor ───────────────────────────────────────
    const highUtilCars = allCars.filter(
      (c) => c.status === 'RENTED',
    ).length;
    const utilizationPercent = totalCars > 0
      ? Math.round((highUtilCars / totalCars) * 100)
      : 0;

    let advisorMessage: string;
    let advisorAction: string;

    if (utilizationPercent > 85) {
      advisorMessage = `Fleet utilization is at ${utilizationPercent}%. Your fleet is near maximum capacity. Consider acquiring additional vehicles to capture unserved demand and increase revenue.`;
      advisorAction = 'EXPAND_FLEET';
    } else if (utilizationPercent < 40) {
      advisorMessage = `Fleet utilization is low at ${utilizationPercent}%. Consider reducing fleet size or launching promotional campaigns to boost bookings.`;
      advisorAction = 'BOOST_MARKETING';
    } else {
      advisorMessage = `Fleet utilization is healthy at ${utilizationPercent}%. Operations are running efficiently. Focus on maintaining service quality and optimizing pricing for peak periods.`;
      advisorAction = 'OPTIMIZE_PRICING';
    }

    // ── 8. Forecast ────────────────────────────────────────────────
    // None of these rows are ever displayed individually — only the sum
    // (and, for a couple, the count) — so aggregate in the DB.
    const futureBookingsAgg = await this.prisma.booking.aggregate({
      where: {
        agencyId,
        status: { in: ['APPROVED', 'ACTIVE'] },
        endDate: { gte: now },
      },
      _sum: { totalPrice: true },
    });

    const inflows = [
      {
        source: 'Active & Confirmed Bookings',
        amount: futureBookingsAgg._sum.totalPrice?.toNumber() ?? 0,
        date: 'Ongoing',
      },
    ];

    // Add pending payments as inflow
    const pendingPaymentsAgg = await this.prisma.payment.aggregate({
      where: {
        invoice: { agencyId },
        status: 'PENDING',
        type: 'INCOME',
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
    if (pendingPaymentsAgg._count._all > 0) {
      inflows.push({
        source: 'Pending Payment Verifications',
        amount: pendingPaymentsAgg._sum.amount?.toNumber() ?? 0,
        date: 'Awaiting Verification',
      });
    }

    // Refusal logs as potential
    const refusalPotentialAgg = await this.prisma.refusalLog.aggregate({
      where: { agencyId, status: 'WAITING' },
      _sum: { potentialRevenue: true },
      _count: { _all: true },
    });
    if (refusalPotentialAgg._count._all > 0) {
      inflows.push({
        source: `Recoverable Demand (${refusalPotentialAgg._count._all} leads)`,
        amount: refusalPotentialAgg._sum.potentialRevenue?.toNumber() ?? 0,
        date: 'If Recovered',
      });
    }

    const pendingExpensesAgg = await this.prisma.expense.aggregate({
      where: { agencyId, status: 'PENDING' },
      _sum: { amount: true },
    });

    const outflows = [
      {
        source: 'Pending Expenses',
        amount: pendingExpensesAgg._sum.amount?.toNumber() ?? 0,
        date: 'Scheduled',
      },
    ];

    // Estimate maintenance from upcoming service
    const carsNeedingService = allCars.filter(
      (c) => c.nextServiceKm != null && c.nextServiceKm > 0 && c.mileage >= c.nextServiceKm * 0.9,
    );
    if (carsNeedingService.length > 0) {
      // Estimate average maintenance cost
      const avgMaintCost = maintenanceCosts.length > 0
        ? maintenanceCosts.reduce((sum, mc) => sum + mc.cost.toNumber(), 0) / maintenanceCosts.length
        : 500;
      outflows.push({
        source: `Estimated Maintenance (${carsNeedingService.length} vehicles)`,
        amount: Math.round(carsNeedingService.length * avgMaintCost),
        date: 'Forecasted',
      });
    }

    const totalInflows = inflows.reduce((sum, i) => sum + i.amount, 0);
    const totalOutflows = outflows.reduce((sum, o) => sum + o.amount, 0);

    // ── 9. Branch Data (single-agency = 1 branch) ──────────────────
    const agencyInfo = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });
    const activeBookings = await this.prisma.booking.count({
      where: { agencyId, status: { in: ['ACTIVE', 'APPROVED'] } },
    });
    const completedBookings = await this.prisma.booking.count({
      where: { agencyId, status: 'COMPLETED' },
    });

    const branches = [
      {
        name: agencyInfo?.name || 'Main Office',
        city: agencyInfo?.city || 'N/A',
        revenue: gmvTotal,
        bookings: activeBookings + completedBookings,
        activeBookings,
        utilization: utilMetrics.utilizationRate,
        fleetSize: totalCars,
        healthScore: fleetHealthPercent,
      },
    ];

    return {
      gmv: {
        value: gmvTotal,
        changePercent: Math.round(gmvChange * 10) / 10,
      },
      efficiency: {
        score: efficiencyScore,
      },
      fleetHealth: {
        percent: fleetHealthPercent,
        changePercent: Math.round(healthChange * 10) / 10,
      },
      utilization: {
        percent: Math.round(utilMetrics.utilizationRate * 10) / 10,
      },
      monthlyData,
      exceptions: sortedExceptions,
      advisor: {
        message: advisorMessage,
        action: advisorAction,
      },
      forecast: {
        projected30Day: totalInflows - totalOutflows,
        inflows,
        outflows,
      },
      branches,
    };
  }

  /**
   * Command Centre Dashboard — the main operational overview.
   */
  async getCommandCentre(agencyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // ── 1. Revenue MTD ──────────────────────────────────────────────
    // Previously two unbounded-shaped findManys just to sum in JS — this is
    // the endpoint behind the owner dashboard's skeleton-hang, so both are
    // now DB-side sums.
    const [mtdPaymentsAgg, prevPaymentsAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          invoice: { agencyId },
          type: 'INCOME',
          status: 'VERIFIED',
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { agencyId },
          type: 'INCOME',
          status: 'VERIFIED',
          date: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);
    const revenueMtd = mtdPaymentsAgg._sum.amount?.toNumber() ?? 0;
    const prevRevenue = prevPaymentsAgg._sum.amount?.toNumber() ?? 0;
    const revenueGrowth = prevRevenue > 0
      ? Math.round(((revenueMtd - prevRevenue) / prevRevenue) * 100)
      : revenueMtd > 0 ? 100 : 0;

    // ── 2. Fleet Utilization ────────────────────────────────────────
    const utilMetrics = await this.getUtilizationMetrics(agencyId);

    // ── 3. Guardian Blocks (expired/expiring docs) ──────────────────
    const allCars = await this.prisma.car.findMany({
      where: { agencyId },
      include: { documents: true, maintenance: true, bookings: { take: 1, orderBy: { createdAt: 'desc' } } },
    });

    const guardianBlocks: Array<{
      id: string; car: string; plate: string; risk: string;
      type: string; severity: string; carId: string;
    }> = [];

    for (const car of allCars) {
      for (const doc of car.documents) {
        if (doc.status === 'EXPIRED') {
          guardianBlocks.push({
            id: doc.id,
            car: `${car.brand} ${car.model}`,
            plate: car.licensePlate,
            risk: 'EXPIRED',
            type: doc.type.replace(/_/g, ' '),
            severity: 'danger',
            carId: car.id,
          });
        } else if (doc.status === 'EXPIRING_SOON') {
          const daysLeft = doc.expiryDate
            ? Math.max(0, Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          guardianBlocks.push({
            id: doc.id,
            car: `${car.brand} ${car.model}`,
            plate: car.licensePlate,
            risk: `${daysLeft} DAYS LEFT`,
            type: doc.type.replace(/_/g, ' '),
            severity: 'warning',
            carId: car.id,
          });
        }
      }
    }

    // Sort: danger first, then warning
    guardianBlocks.sort((a, b) => {
      if (a.severity === 'danger' && b.severity !== 'danger') return -1;
      if (a.severity !== 'danger' && b.severity === 'danger') return 1;
      return 0;
    });

    // ── 4. Refusal / Demand Intelligence ────────────────────────────
    const waitingRefusalsAgg = await this.prisma.refusalLog.aggregate({
      where: { agencyId, status: 'WAITING' },
      _sum: { potentialRevenue: true },
      _count: { _all: true },
    });
    const refusalRecoverable = waitingRefusalsAgg._sum.potentialRevenue?.toNumber() ?? 0;
    const refusalCount = waitingRefusalsAgg._count._all;

    // ── 5. Daily Intensity (bookings + verified cash flow, last 14 days) ─────────
    // Revenue = actual VERIFIED income payments (cash flow), NOT quoted booking
    // prices. Bookings are still counted by creation date for demand tracking.
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [recentBookings, recentPayments] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          agencyId,
          createdAt: { gte: fourteenDaysAgo },
        },
        select: { createdAt: true },
      }),
      this.prisma.payment.findMany({
        where: {
          invoice: { agencyId },
          type: 'INCOME',
          status: 'VERIFIED',
          date: { gte: fourteenDaysAgo },
        },
        select: { date: true, amount: true },
      }),
    ]);

    // Group by day
    const dailyMap: Record<string, { bookings: number; revenue: number }> = {};
    for (let d = 13; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const key = date.toISOString().slice(0, 10);
      dailyMap[key] = { bookings: 0, revenue: 0 };
    }

    recentBookings.forEach((b) => {
      const key = new Date(b.createdAt).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].bookings++;
      }
    });

    recentPayments.forEach((p) => {
      const key = new Date(p.date).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].revenue += p.amount.toNumber();
      }
    });

    const dailyIntensity = Object.entries(dailyMap).map(([date, val]) => ({
      date,
      label: new Date(date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
      bookings: val.bookings,
      revenue: val.revenue,
    }));

    // ── 6. Star Asset (highest ROI car) ─────────────────────────────
    let starAsset: {
      id: string; brand: string; model: string; plate: string;
      roi: number; status: string; totalRevenue: number;
    } | null = null;

    if (allCars.length > 0) {
      const bestCar = allCars.reduce((best, car) =>
        car.currentRoi > (best?.currentRoi ?? -Infinity) ? car : best,
      allCars[0]);

      // Calculate total revenue for this car
      const carRevenueAgg = await this.prisma.payment.aggregate({
        where: {
          invoice: { booking: { carId: bestCar.id } },
          type: 'INCOME',
          status: 'VERIFIED',
        },
        _sum: { amount: true },
      });
      const carRevenue = carRevenueAgg._sum.amount?.toNumber() ?? 0;

      starAsset = {
        id: bestCar.id,
        brand: bestCar.brand,
        model: bestCar.model,
        plate: bestCar.licensePlate,
        roi: bestCar.currentRoi,
        status: bestCar.status,
        totalRevenue: carRevenue,
      };
    }

    // ── 7. Live Activity (recent audit logs) ────────────────────────
    const recentLogs = await this.prisma.auditLog.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    // Batch-fetch actor names
    const actorIds = [...new Set(recentLogs.map((l) => l.actorId).filter(Boolean))];
    const actors = actorIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const liveActivity = recentLogs.map((log) => {
      const minutesAgo = Math.round(
        (now.getTime() - new Date(log.createdAt).getTime()) / 60000,
      );
      let timeLabel: string;
      if (minutesAgo < 1) timeLabel = 'Just now';
      else if (minutesAgo < 60) timeLabel = `${minutesAgo}m`;
      else if (minutesAgo < 1440) timeLabel = `${Math.round(minutesAgo / 60)}h`;
      else timeLabel = `${Math.round(minutesAgo / 1440)}d`;

      const actionLabels: Record<string, string> = {
        CREATE_BOOKING: 'New Booking',
        DELETE_CAR: 'Car Removed',
        CHANGE_PRICE: 'Price Updated',
        UPDATE_BOOKING_STATUS: 'Booking Status Changed',
        CREATE_CAR: 'Car Added',
        UPDATE_CAR: 'Car Updated',
      };

      const actor = actorMap.get(log.actorId);

      return {
        id: log.id,
        user: actor?.name || 'System',
        role: actor?.role || 'SYSTEM',
        action: actionLabels[log.action] || log.action.replace(/_/g, ' '),
        entityType: log.entityType,
        entityId: log.entityId,
        time: timeLabel,
      };
    });

    // ── 8. Available Cars for Booking ────────────────────────────────
    const availableCars = allCars
      .filter((c) => c.status === 'AVAILABLE')
      .map((c) => ({
        id: c.id,
        label: `${c.brand} ${c.model} (${c.licensePlate})`,
        pricePerDay: c.pricePerDay,
      }));

    // ── 9. Active Rentals Count ─────────────────────────────────────
    const activeRentals = await this.prisma.booking.count({
      where: { agencyId, status: 'ACTIVE' },
    });

    // ── 10. Customer directory (count + bookable options for modal) ──
    // Bounded to the 200 most-recent customers so this hot dashboard endpoint
    // never loads an unbounded directory. `totalCustomers` stays the true
    // count; the booking modal's picker uses these for the common case and can
    // fall back to the paginated/searchable `GET /customers?search=` typeahead
    // for agencies with a larger book. (Perf fix — Phase 6.)
    const CUSTOMER_OPTION_CAP = 200;
    const [totalCustomers, allCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { agencyId } }),
      this.prisma.customer.findMany({
        where: { agencyId },
        orderBy: { createdAt: 'desc' },
        take: CUSTOMER_OPTION_CAP,
        select: { id: true, firstName: true, lastName: true, phone: true, status: true },
      }),
    ]);
    const customerOptions = allCustomers.map((c) => ({
      id: c.id,
      label: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
    }));

    // ── 11. Fleet summary ───────────────────────────────────────────
    const totalFleet = allCars.length;
    const availableCount = allCars.filter((c) => c.status === 'AVAILABLE').length;
    const rentedCount = allCars.filter((c) => c.status === 'RENTED').length;
    const maintenanceCount = allCars.filter((c) => c.status === 'MAINTENANCE').length;
    const oosCount = allCars.filter((c) => c.status === 'OUT_OF_SERVICE').length;

    return {
      revenue: {
        mtd: revenueMtd,
        growth: revenueGrowth,
      },
      utilization: {
        percent: Math.round(utilMetrics.utilizationRate * 10) / 10,
      },
      guardianBlocks,
      refusal: {
        recoverable: refusalRecoverable,
        count: refusalCount,
      },
      dailyIntensity,
      starAsset,
      liveActivity,
      availableCars,
      customers: customerOptions,
      activeRentals,
      totalCustomers,
      fleet: {
        total: totalFleet,
        available: availableCount,
        rented: rentedCount,
        maintenance: maintenanceCount,
        outOfService: oosCount,
      },
    };
  }
}
