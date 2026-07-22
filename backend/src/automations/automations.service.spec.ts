import { NotFoundException } from '@nestjs/common';
import { AutomationsService } from './automations.service';

/**
 * Tenant-boundary coverage for the AutomationRule CRUD (N4).
 *
 * Every read/write is scoped by the caller's agencyId (from the JWT, never the
 * body), so agency A can never see or mutate agency B's rule — a cross-tenant id
 * makes updateMany/deleteMany affect 0 rows and becomes a 404, never a write onto
 * another tenant's row (CLAUDE.md §5.1). Only prisma is exercised here; the cron
 * dependencies (twilio/notifications/trust) aren't touched by CRUD, so they're
 * stubbed.
 */
describe('AutomationsService — rule CRUD tenant boundary (N4)', () => {
  const AGENCY_A = 'agency-aaaa';
  const AGENCY_B = 'agency-bbbb';

  function makeService(automationRule: any) {
    const prisma = { automationRule };
    return new AutomationsService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('findAll scopes by the caller agencyId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = makeService({ findMany });

    await svc.findAll(AGENCY_A);

    expect(findMany.mock.calls[0][0].where).toEqual({ agencyId: AGENCY_A });
  });

  it('create stamps agencyId from the caller (never the body) and defaults config/isActive', async () => {
    const create = jest.fn((args: any) => Promise.resolve(args.data));
    const svc = makeService({ create });

    await svc.create(AGENCY_A, {
      name: 'Fuel penalty',
      trigger: 'VEHICLE_RETURNED',
      action: 'NOTIFY_OWNER',
    });

    const data = create.mock.calls[0][0].data;
    expect(data.agencyId).toBe(AGENCY_A);
    expect(data.config).toBe('{}');
    expect(data.isActive).toBe(true);
  });

  it('update 404s a cross-tenant rule and never re-reads it (updateMany scoped by { id, agencyId })', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findFirst = jest.fn();
    const svc = makeService({ updateMany, findFirst });

    await expect(
      svc.update(AGENCY_B, 'rule-in-A', { isActive: false } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(updateMany.mock.calls[0][0].where).toEqual({
      id: 'rule-in-A',
      agencyId: AGENCY_B,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('remove 404s a cross-tenant rule (deleteMany scoped by { id, agencyId })', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const svc = makeService({ deleteMany });

    await expect(svc.remove(AGENCY_B, 'rule-in-A')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(deleteMany.mock.calls[0][0].where).toEqual({
      id: 'rule-in-A',
      agencyId: AGENCY_B,
    });
  });
});
