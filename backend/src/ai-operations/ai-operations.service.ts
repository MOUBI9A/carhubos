import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A safe Phase-1 intelligence signal. These are deterministic checks of
 * persisted agency records, NOT an LLM diagnosis or a verified payment event.
 * No customer identifiers, exact positions, or financial amounts leave this API.
 */
export type OperationsSignalCode =
  | 'OVERDUE_RETURNS'
  | 'RETURNS_NEXT_24H'
  | 'OPEN_INVOICES'
  | 'MAINTENANCE_VEHICLES'
  | 'DOCUMENTS_EXPIRING_7D'
  | 'DOCUMENTS_EXPIRED'
  | 'URGENT_TASKS';

export type OperationsSignal = {
  code: OperationsSignalCode;
  severity: 'INFO' | 'WARNING' | 'HIGH';
  count: number;
  source: 'Booking' | 'Invoice' | 'Car' | 'CarDocument' | 'Task';
  /** A fixed, human-readable predicate; never the result of an AI guess. */
  definition: string;
  reviewPath: string;
  actionMode: 'REVIEW_ONLY';
};

@Injectable()
export class AiOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgencyBriefing(agencyId: string, now = new Date()) {
    if (!agencyId || !agencyId.trim()) {
      // Even ROOT_ADMIN must establish a separately authorized agency
      // context: the platform bypass in CapabilitiesGuard is insufficient.
      throw new ForbiddenException('An agency membership is required.');
    }
    if (!Number.isFinite(now.getTime())) {
      throw new Error('Invalid snapshot timestamp');
    }

    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Every query uses the agencyId from the authenticated session.
    // No raw Customer/Payment/identity data is selected and no DB writes occur.
    const [
      vehiclesTotal,
      vehiclesAvailable,
      vehiclesMaintenance,
      activeRentals,
      returnsNext24h,
      lateActiveRentals,
      overdueMarkedRentals,
      openInvoices,
      documentsExpiring7d,
      documentsExpired,
      urgentTasks,
    ] = await Promise.all([
      this.prisma.car.count({ where: { agencyId } }),
      this.prisma.car.count({ where: { agencyId, status: 'AVAILABLE' } }),
      this.prisma.car.count({ where: { agencyId, status: 'MAINTENANCE' } }),
      this.prisma.booking.count({ where: { agencyId, status: 'ACTIVE' } }),
      this.prisma.booking.count({
        where: {
          agencyId,
          status: 'ACTIVE',
          endDate: { gte: now, lte: nextDay },
        },
      }),
      this.prisma.booking.count({
        where: { agencyId, status: 'ACTIVE', endDate: { lt: now } },
      }),
      this.prisma.booking.count({
        where: { agencyId, status: 'OVERDUE' },
      }),
      this.prisma.invoice.count({
        where: { agencyId, status: { in: ['DUE', 'PARTIAL'] } },
      }),
      this.prisma.carDocument.count({
        where: {
          car: { agencyId },
          status: { in: ['VALID', 'EXPIRING_SOON'] },
          expiryDate: { gte: now, lte: nextWeek },
        },
      }),
      this.prisma.carDocument.count({
        where: {
          car: { agencyId },
          OR: [
            { expiryDate: { lt: now } },
            { status: 'EXPIRED' },
          ],
        },
      }),
      this.prisma.task.count({
        where: {
          agencyId,
          priority: 'URGENT',
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
    ]);

    // ACTIVE-with-past-endDate and status OVERDUE are disjoint states.
    const overdueReturns = lateActiveRentals + overdueMarkedRentals;
    const metrics = {
      vehiclesTotal,
      vehiclesAvailable,
      vehiclesMaintenance,
      activeRentals,
      returnsNext24h,
      overdueReturns,
      openInvoices,
      documentsExpiring7d,
      documentsExpired,
      urgentTasks,
    };

    const signals: OperationsSignal[] = [];
    const add = (
      code: OperationsSignalCode,
      severity: OperationsSignal['severity'],
      count: number,
      source: OperationsSignal['source'],
      definition: string,
      reviewPath: string,
    ) => {
      if (count > 0) {
        signals.push({
          code, severity, count, source, definition, reviewPath,
          actionMode: 'REVIEW_ONLY',
        });
      }
    };

    add('OVERDUE_RETURNS', 'HIGH', overdueReturns, 'Booking',
      'status OVERDUE, or ACTIVE with endDate earlier than sampledAt',
      '/dashboard/bookings');
    add('DOCUMENTS_EXPIRED', 'HIGH', documentsExpired, 'CarDocument',
      'Vehicle documents with expiryDate earlier than sampledAt or status EXPIRED',
      '/dashboard/fleet');
    add('DOCUMENTS_EXPIRING_7D', 'HIGH', documentsExpiring7d, 'CarDocument',
      'VALID/EXPIRING_SOON documents expiring in the following seven days',
      '/dashboard/fleet');
    add('URGENT_TASKS', 'WARNING', urgentTasks, 'Task',
      'PENDING/IN_PROGRESS tasks with URGENT priority',
      '/dashboard');
    add('OPEN_INVOICES', 'WARNING', openInvoices, 'Invoice',
      'Invoices marked DUE or PARTIAL; no verified overdue date is inferred',
      '/dashboard/finance');
    add('MAINTENANCE_VEHICLES', 'WARNING', vehiclesMaintenance, 'Car',
      'Cars whose fleet status is MAINTENANCE',
      '/dashboard/fleet');
    add('RETURNS_NEXT_24H', 'INFO', returnsNext24h, 'Booking',
      'ACTIVE bookings ending within the next 24 hours',
      '/dashboard/bookings');

    return {
      sampledAt: now.toISOString(),
      mode: 'MONITOR' as const,
      analysisType: 'DETERMINISTIC_AGENCY_RECORDS' as const,
      externalAiUsed: false,
      automatedActionsEnabled: false,
      hasLiveGpsData: false,
      verifiedPaymentStatusUsed: false,
      metrics,
      signals,
      limitations: [
        'These counts are independently queried; they are not an atomic transaction snapshot.',
        'An invoice marked DUE/PARTIAL is not necessarily overdue; no invoice due date is inferred.',
        'No GPS, AI model, external communication, payment settlement, or vehicle-control actions are performed.',
        'Staff must verify underlying records before acting on a signal.',
      ],
    };
  }
}
