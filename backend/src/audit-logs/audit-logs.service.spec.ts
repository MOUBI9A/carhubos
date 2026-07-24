import { AuditLogsService } from './audit-logs.service';

/**
 * Coverage for the platform-wide audit trail (finding N5). Unlike findAll (one
 * agency), findAllPlatform is deliberately NOT agency-scoped — it's the ROOT_ADMIN
 * SuperAdmin view across every tenant — so the test asserts there's no agency
 * filter, plus the pagination clamp and the agency/actor enrichment.
 */
describe('AuditLogsService.findAllPlatform (N5 — ROOT_ADMIN platform trail)', () => {
  function make(rows: any[], total: number, users: any[] = []) {
    const prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
      user: { findMany: jest.fn().mockResolvedValue(users) },
    };
    return { svc: new AuditLogsService(prisma as any), prisma };
  }

  it('reads across ALL agencies (no agency filter), newest first, enriched with agency + actor', async () => {
    const rows = [
      {
        id: 'a1',
        action: 'CREATE_BOOKING',
        entityType: 'BOOKING',
        entityId: 'b1',
        createdAt: new Date(),
        actorId: 'u1',
        agency: { id: 'ag1', name: 'Alpha' },
      },
      {
        id: 'a2',
        action: 'DELETE_CAR',
        entityType: 'CAR',
        entityId: 'c1',
        createdAt: new Date(),
        actorId: 'u2',
        agency: { id: 'ag2', name: 'Beta' },
      },
    ];
    const { svc, prisma } = make(rows, 2, [
      { id: 'u1', name: 'Amina', role: 'OWNER' },
      { id: 'u2', name: 'Karim', role: 'MANAGER' },
    ]);

    const res = await svc.findAllPlatform(1, 50);

    // Platform-wide: no agency filter in the query.
    expect(prisma.auditLog.findMany.mock.calls[0][0].where).toBeUndefined();
    expect(prisma.auditLog.findMany.mock.calls[0][0].orderBy).toEqual({
      createdAt: 'desc',
    });
    expect(res.total).toBe(2);
    expect(res.page).toBe(1);
    expect(res.items[0].agency).toEqual({ id: 'ag1', name: 'Alpha' });
    expect(res.items[0].actor).toEqual({ id: 'u1', name: 'Amina', role: 'OWNER' });
  });

  it('an unresolved actor falls back to System', async () => {
    const rows = [
      {
        id: 'a1',
        action: 'X',
        entityType: 'Y',
        entityId: 'z',
        createdAt: new Date(),
        actorId: 'ghost',
        agency: { id: 'ag', name: 'A' },
      },
    ];
    const { svc } = make(rows, 1, []); // no users resolve

    const res = await svc.findAllPlatform();

    expect(res.items[0].actor).toEqual({
      id: 'ghost',
      name: 'System',
      role: 'SYSTEM',
    });
  });

  it('clamps pagination: pageSize capped at 100, a bad page → 1 (skip 0)', async () => {
    const { svc, prisma } = make([], 0);

    await svc.findAllPlatform(NaN, 999);

    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(100); // hard cap
    expect(args.skip).toBe(0); // page floored to 1
  });
});
