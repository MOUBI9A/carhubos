import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomersService } from './customers.service';

/**
 * Unit coverage for CustomersService (finding #7 — the module had zero specs).
 * Focus is the module-specific business logic, NOT the plain cross-tenant 404
 * (that is already regression-guarded in common/multi-tenant-boundary.spec.ts):
 *   - the agency-scoped duplicate-identity guard on create (409, backing the
 *     @@unique([agencyId, identityNumber]) DB constraint);
 *   - the delete FK-restrict (P2003) -> 409 "blacklist instead" mapping that
 *     protects rental/financial history;
 *   - blacklist / unblacklist status transitions AND their forensic audit
 *     entries (before/after status, reason);
 *   - getBlacklisted's status filter;
 *   - findOne's lifetimeSpend aggregation.
 * Mocked Prisma + AuditLogsService — this is about WHERE clauses, thrown
 * exceptions, and audit calls, not the DB.
 */

const AGENCY = 'agency-1';
const ACTOR = 'actor-1';

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

const VALID_CUSTOMER = {
  firstName: 'Amina',
  lastName: 'El Idrissi',
  phone: '0600000000',
  identityType: 'CIN',
  identityNumber: 'AB12345',
};

describe('CustomersService.create — agency-scoped duplicate identity guard', () => {
  it('409s when the identityNumber already exists in the SAME agency', async () => {
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'dup' }),
        create: jest.fn(),
      },
    };
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    await expect(
      svc.create(AGENCY, VALID_CUSTOMER as any),
    ).rejects.toBeInstanceOf(ConflictException);
    // Must not create when a duplicate was found.
    expect(prisma.customer.create).not.toHaveBeenCalled();
    // The duplicate check is scoped by agencyId — same id number in another
    // agency is a different person and must be allowed.
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { agencyId: AGENCY, identityNumber: VALID_CUSTOMER.identityNumber },
    });
  });

  it('creates with agencyId taken from the caller, not the body', async () => {
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new' }),
      },
    };
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    // A hostile body carrying its own agencyId must not override the JWT one.
    await svc.create(AGENCY, { ...VALID_CUSTOMER, agencyId: 'attacker' } as any);

    const arg = prisma.customer.create.mock.calls[0][0];
    expect(arg.data.agencyId).toBe(AGENCY);
  });
});

describe('CustomersService.remove — protects rental history', () => {
  it('404s (without deleting) a customer the agency does not own', async () => {
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    };
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    await expect(svc.remove(AGENCY, 'c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.customer.delete).not.toHaveBeenCalled();
  });

  it('maps a Prisma P2003 FK-restrict to a 409 that points at blacklisting', async () => {
    const p2003 = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', clientVersion: 'test' },
    );
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
        delete: jest.fn().mockRejectedValue(p2003),
      },
    };
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    await expect(svc.remove(AGENCY, 'c1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(svc.remove(AGENCY, 'c1')).rejects.toThrow(/[Bb]lacklist/);
  });

  it('deletes when owned and unconstrained', async () => {
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
        delete: jest.fn().mockResolvedValue({ id: 'c1' }),
      },
    };
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    await expect(svc.remove(AGENCY, 'c1')).resolves.toEqual({ id: 'c1' });
  });
});

describe('CustomersService.blacklist / unblacklist — transitions + audit', () => {
  it('sets BLACKLISTED and writes an audit entry with before/after + reason', async () => {
    const audit = makeAudit();
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1', status: 'ACTIVE' }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'c1', status: 'BLACKLISTED' }),
      },
    };
    const svc = new CustomersService(prisma as any, audit as any);

    await svc.blacklist(AGENCY, 'c1', 'fraudulent documents', ACTOR);

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'BLACKLISTED' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      AGENCY,
      ACTOR,
      'BLACKLIST_CUSTOMER',
      'CUSTOMER',
      'c1',
      { status: 'ACTIVE' },
      { status: 'BLACKLISTED', reason: 'fraudulent documents' },
    );
  });

  it('404s (and neither updates nor audits) an unknown/cross-tenant customer', async () => {
    const audit = makeAudit();
    const prisma = {
      customer: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    const svc = new CustomersService(prisma as any, audit as any);

    await expect(
      svc.blacklist(AGENCY, 'nope', 'x', ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('reinstates to ACTIVE and audits UNBLACKLIST_CUSTOMER', async () => {
    const audit = makeAudit();
    const prisma = {
      customer: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'c1', status: 'BLACKLISTED' }),
        update: jest.fn().mockResolvedValue({ id: 'c1', status: 'ACTIVE' }),
      },
    };
    const svc = new CustomersService(prisma as any, audit as any);

    await svc.unblacklist(AGENCY, 'c1', ACTOR);

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'ACTIVE' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      AGENCY,
      ACTOR,
      'UNBLACKLIST_CUSTOMER',
      'CUSTOMER',
      'c1',
      { status: 'BLACKLISTED' },
      { status: 'ACTIVE' },
    );
  });
});

describe('CustomersService.getBlacklisted', () => {
  it('queries only this agency, only BLACKLISTED rows', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new CustomersService(
      { customer: { findMany } } as any,
      makeAudit() as any,
    );

    await svc.getBlacklisted(AGENCY);

    expect(findMany).toHaveBeenCalledWith({
      where: { agencyId: AGENCY, status: 'BLACKLISTED' },
      orderBy: { updatedAt: 'desc' },
    });
  });
});

describe('CustomersService.findOne — tenant scope + lifetimeSpend', () => {
  function prismaWith(customer: any, spendSum: number | null) {
    return {
      customer: { findFirst: jest.fn().mockResolvedValue(customer) },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: spendSum } }),
      },
    };
  }

  it('404s a customer outside the agency', async () => {
    const svc = new CustomersService(prismaWith(null, null) as any, makeAudit() as any);
    await expect(svc.findOne(AGENCY, 'c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes the lookup by { id, agencyId } and defaults lifetimeSpend to 0 when no verified income', async () => {
    const prisma = prismaWith(
      { id: 'c1', agencyId: AGENCY, bookings: [], documents: [] },
      null,
    );
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    const result = await svc.findOne(AGENCY, 'c1');

    expect(prisma.customer.findFirst.mock.calls[0][0].where).toEqual({
      id: 'c1',
      agencyId: AGENCY,
    });
    expect(result.lifetimeSpend).toBe(0);
  });

  it('returns the summed verified income as lifetimeSpend when present', async () => {
    const prisma = prismaWith(
      { id: 'c1', agencyId: AGENCY, bookings: [], documents: [] },
      4200,
    );
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    const result = await svc.findOne(AGENCY, 'c1');
    expect(result.lifetimeSpend).toBe(4200);
    // Only VERIFIED income counts toward lifetime spend (strict ERP).
    expect(prisma.payment.aggregate.mock.calls[0][0].where).toMatchObject({
      type: 'INCOME',
      status: 'VERIFIED',
    });
  });
});

describe('CustomersService.findAll — legacy bare-array path (P2 backlog)', () => {
  it('caps the legacy (no page/limit) path at 500 rows, scoped by agencyId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new CustomersService({ customer: { findMany } } as any, makeAudit() as any);

    await svc.findAll(AGENCY);

    expect(findMany.mock.calls[0][0].take).toBe(500);
    expect(findMany.mock.calls[0][0].where).toEqual({ agencyId: AGENCY });
  });

  it('search is case-insensitive on name fields (Postgres contains is case-sensitive by default)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new CustomersService({ customer: { findMany } } as any, makeAudit() as any);

    await svc.findAll(AGENCY, { search: 'amina' });

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { firstName: { contains: 'amina', mode: 'insensitive' } },
      { lastName: { contains: 'amina', mode: 'insensitive' } },
      { phone: { contains: 'amina' } },
    ]);
  });

  it('does NOT cap the paginated envelope path — take comes from limit instead', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      customer: { findMany, count },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    const svc = new CustomersService(prisma as any, makeAudit() as any);

    const result = await svc.findAll(AGENCY, { page: 2, limit: 10 });

    expect(findMany.mock.calls[0][0].take).toBe(10);
    expect(findMany.mock.calls[0][0].skip).toBe(10);
    expect(result).toEqual({ items: [], total: 0, page: 2, limit: 10 });
  });
});
