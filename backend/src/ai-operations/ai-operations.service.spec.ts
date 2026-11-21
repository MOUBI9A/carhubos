import { ForbiddenException } from '@nestjs/common';
import { AiOperationsController } from './ai-operations.controller';
import { AiOperationsService } from './ai-operations.service';

const AT = new Date('2026-11-12T12:00:00.000Z');
const AGENCY = 'agency-a';
const OTHER = 'agency-b';

function setup(values = [7, 3, 2, 4, 2, 1, 1, 3, 2, 1, 1]) {
  let call = 0;
  const count = jest.fn((_query: { where: { agencyId?: string; car?: { agencyId: string } } }) => Promise.resolve(values[call++] ?? 0));
  const prisma = {
    car: { count, update: jest.fn() },
    booking: { count, update: jest.fn() },
    invoice: { count, update: jest.fn() },
    carDocument: { count },
    task: { count, create: jest.fn(), update: jest.fn() },
    payment: { update: jest.fn() },
  };
  const svc = new AiOperationsService(prisma as never);
  return { svc, prisma, count };
}

describe('read-only AI Operations intelligence', () => {
  it('returns only observed agency aggregates, with explicit limitations and no model claims', async () => {
    const { svc, prisma } = setup();
    const summary = await svc.getAgencyBriefing(AGENCY, AT);
    expect(summary.mode).toBe('MONITOR');
    expect(summary.analysisType).toBe('DETERMINISTIC_AGENCY_RECORDS');
    expect(summary.externalAiUsed).toBe(false);
    expect(summary.automatedActionsEnabled).toBe(false);
    expect(summary.metrics).toEqual({
      vehiclesTotal: 7,
      vehiclesAvailable: 3,
      vehiclesMaintenance: 2,
      activeRentals: 4,
      returnsNext24h: 2,
      overdueReturns: 2,
      openInvoices: 3,
      documentsExpiring7d: 2,
      documentsExpired: 1,
      urgentTasks: 1,
    });
    expect(summary.signals).toHaveLength(7);
    expect(summary.signals.every((signal) => signal.actionMode === 'REVIEW_ONLY')).toBe(true);
    expect(summary.signals.find((signal) => signal.code === 'OPEN_INVOICES')?.definition).toContain('no verified overdue date');
    expect(summary.limitations).toContain(
      'An invoice marked DUE/PARTIAL is not necessarily overdue; no invoice due date is inferred.',
    );
    for (const delegate of [prisma.car, prisma.booking, prisma.invoice, prisma.task, prisma.payment]) {
      expect(delegate.update).not.toHaveBeenCalled();
    }
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('scopes every database query to agency A without reading records from agency B', async () => {
    const { svc, count } = setup();
    await svc.getAgencyBriefing(AGENCY, AT);
    expect(count).toHaveBeenCalledTimes(11);
    for (const [args] of count.mock.calls) {
      if ('agencyId' in args.where) {
        expect(args.where.agencyId).toBe(AGENCY);
      } else {
        expect(args.where.car?.agencyId).toBe(AGENCY);
      }
      expect(JSON.stringify(args)).not.toContain(OTHER);
    }
  });

  it('never reads data without an authenticated agency context, including platform root', async () => {
    const { svc, count } = setup();
    await expect(svc.getAgencyBriefing('')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.getAgencyBriefing(undefined as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(count).not.toHaveBeenCalled();
  });

  it('does not fabricate insight cards when all inspected signals are zero', async () => {
    const { svc } = setup(Array(11).fill(0));
    const summary = await svc.getAgencyBriefing(AGENCY, AT);
    expect(summary.signals).toEqual([]);
    expect(summary.metrics.openInvoices).toBe(0);
  });

  it('only uses trusted caller agencyId in controller, never a request-supplied tenant', async () => {
    const { svc } = setup();
    const spy = jest.spyOn(svc, 'getAgencyBriefing').mockResolvedValue({ ok: true } as never);
    const controller = new AiOperationsController(svc);
    await controller.getBriefing({ agencyId: AGENCY });
    expect(spy).toHaveBeenCalledWith(AGENCY);
    await controller.getBriefing({});
    expect(spy).toHaveBeenCalledWith('');
  });
});
