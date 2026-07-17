import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Recalculates the ROI score for a specific car.
   * Logic: (Total Revenue - Total Maintenance Costs - Depreciation Estimate) / Age in Fleet
   */
  async calculateCarRoi(carId: string) {
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      include: {
        bookings: {
          where: { status: 'COMPLETED' },
          include: { invoices: { include: { payments: true } } },
        },
        maintenance: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!car) return 0;

    // 1. Calculate Total Revenue
    let totalRevenue = 0;
    for (const booking of car.bookings) {
      for (const invoice of booking.invoices) {
        for (const payment of invoice.payments) {
          if (payment.type === 'INCOME' && payment.status === 'VERIFIED') {
            totalRevenue += payment.amount;
          }
        }
      }
    }

    // 2. Calculate Total Maintenance Costs
    const totalMaintenance = car.maintenance.reduce(
      (sum, record) => sum + record.cost,
      0,
    );

    // 3. Simple ROI Calculation (Percentage)
    // Formula: ((Revenue - Costs) / Costs) * 100
    // If costs are 0, we use a base cost logic or just show revenue performance
    const totalCosts = totalMaintenance > 0 ? totalMaintenance : 1;
    const roiScore = ((totalRevenue - totalMaintenance) / totalCosts) * 100;

    // Update car with new ROI
    await this.prisma.car.update({
      where: { id: carId },
      data: { currentRoi: roiScore },
    });

    return roiScore;
  }

  /**
   * Generates a demand report based on Refusal Logs
   */
  async getDemandIntelligence(agencyId: string) {
    const logs = await this.prisma.refusalLog.findMany({
      where: { agencyId, status: 'WAITING' },
    });

    const potentialRevenue = logs.reduce(
      (sum, log) => sum + log.potentialRevenue,
      0,
    );

    // Group by car type
    const byType = logs.reduce(
      (acc, log) => {
        acc[log.requestedCarType] = (acc[log.requestedCarType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      potentialRevenue,
      refusalCount: logs.length,
      highDemandType:
        Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NONE',
    };
  }

  async getAgencyInsights(agencyId: string) {
    const demand = await this.getDemandIntelligence(agencyId);
    const cars = await this.prisma.car.findMany({ where: { agencyId } });

    return {
      demand,
      fleetSize: cars.length,
      avgRoi:
        cars.reduce((sum, car) => sum + car.currentRoi, 0) / (cars.length || 1),
    };
  }

  async getCarPerformance(agencyId: string, carId: string) {
    const roi = await this.calculateCarRoi(carId);
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      include: { maintenance: true, bookings: true },
    });

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
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthlyData = payments.reduce((acc, payment) => {
      const month = months[new Date(payment.date).getMonth()];
      acc[month] = (acc[month] || 0) + payment.amount;
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cars = await this.prisma.car.count({ where: { agencyId } });
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        agencyId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        startDate: { gte: thirtyDaysAgo },
      },
    });

    const totalFleetDays = cars * 30;
    let totalRentedDays = 0;

    activeBookings.forEach((booking) => {
      const start = new Date(Math.max(booking.startDate.getTime(), thirtyDaysAgo.getTime()));
      const end = new Date(booking.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
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
    const allPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { agencyId },
        type: 'INCOME',
        status: 'VERIFIED',
      },
    });
    const gmvTotal = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate last-year comparison
    const lastYearPayments = allPayments.filter(
      (p) => p.date < twelveMonthsAgo,
    );
    const lastYearGmv = lastYearPayments.reduce((sum, p) => sum + p.amount, 0);
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
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { agencyId },
        type: 'INCOME',
        status: 'VERIFIED',
        date: { gte: twelveMonthsAgo },
      },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        agencyId,
        date: { gte: twelveMonthsAgo },
      },
    });

    const maintenanceCosts = await this.prisma.maintenanceRecord.findMany({
      where: {
        car: { agencyId },
        status: 'COMPLETED',
        createdAt: { gte: twelveMonthsAgo },
      },
    });

    const monthlyRevenue: Record<string, number> = {};
    const monthlyExpenses: Record<string, number> = {};
    months.forEach((m) => {
      monthlyRevenue[m] = 0;
      monthlyExpenses[m] = 0;
    });

    recentPayments.forEach((p) => {
      const m = months[new Date(p.date).getMonth()];
      monthlyRevenue[m] += p.amount;
    });

    expenses.forEach((e) => {
      const m = months[new Date(e.date).getMonth()];
      monthlyExpenses[m] += e.amount;
    });

    maintenanceCosts.forEach((mc) => {
      const m = months[new Date(mc.createdAt).getMonth()];
      monthlyExpenses[m] += mc.cost;
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
        msg: `Unpaid invoice ${inv.amount.toLocaleString()} MAD from ${customerName}`,
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
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        agencyId,
        status: { in: ['APPROVED', 'ACTIVE'] },
        endDate: { gte: now },
      },
      include: { car: true, customer: true },
    });

    const inflows = [
      {
        source: 'Active & Confirmed Bookings',
        amount: futureBookings.reduce((sum, b) => sum + b.totalPrice, 0),
        date: 'Ongoing',
      },
    ];

    // Add pending payments as inflow
    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { agencyId },
        status: 'PENDING',
        type: 'INCOME',
      },
    });
    if (pendingPayments.length > 0) {
      inflows.push({
        source: 'Pending Payment Verifications',
        amount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        date: 'Awaiting Verification',
      });
    }

    // Refusal logs as potential
    const refusalPotential = await this.prisma.refusalLog.findMany({
      where: { agencyId, status: 'WAITING' },
    });
    if (refusalPotential.length > 0) {
      inflows.push({
        source: `Recoverable Demand (${refusalPotential.length} leads)`,
        amount: refusalPotential.reduce((sum, r) => sum + r.potentialRevenue, 0),
        date: 'If Recovered',
      });
    }

    const pendingExpenses = await this.prisma.expense.findMany({
      where: { agencyId, status: 'PENDING' },
    });

    const outflows = [
      {
        source: 'Pending Expenses',
        amount: pendingExpenses.reduce((sum, e) => sum + e.amount, 0),
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
        ? maintenanceCosts.reduce((sum, mc) => sum + mc.cost, 0) / maintenanceCosts.length
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
    const mtdPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { agencyId },
        type: 'INCOME',
        status: 'VERIFIED',
        date: { gte: startOfMonth },
      },
    });
    const revenueMtd = mtdPayments.reduce((sum, p) => sum + p.amount, 0);

    // Previous month for comparison
    const prevPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { agencyId },
        type: 'INCOME',
        status: 'VERIFIED',
        date: { gte: prevMonthStart, lte: prevMonthEnd },
      },
    });
    const prevRevenue = prevPayments.reduce((sum, p) => sum + p.amount, 0);
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
    const waitingRefusals = await this.prisma.refusalLog.findMany({
      where: { agencyId, status: 'WAITING' },
    });
    const refusalRecoverable = waitingRefusals.reduce((sum, r) => sum + r.potentialRevenue, 0);
    const refusalCount = waitingRefusals.length;

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
        dailyMap[key].revenue += p.amount;
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
      const carPayments = await this.prisma.payment.findMany({
        where: {
          invoice: { booking: { carId: bestCar.id } },
          type: 'INCOME',
          status: 'VERIFIED',
        },
      });
      const carRevenue = carPayments.reduce((sum, p) => sum + p.amount, 0);

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
    // All customers are offered in the booking selector — the Pillar 6 Trust
    // Network risk panel surfaces any cross-agency flag and the booking flow
    // hard-locks (with manager override) if the renter is blacklisted.
    const [totalCustomers, allCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { agencyId } }),
      this.prisma.customer.findMany({
        where: { agencyId },
        orderBy: { createdAt: 'desc' },
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
