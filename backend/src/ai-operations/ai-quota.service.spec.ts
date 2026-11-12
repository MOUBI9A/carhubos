import {
  ConflictException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { AiQuotaController } from './ai-quota.controller';
import { AiQuotaService } from './ai-quota.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';

const A = 'tenant-a';
const B = 'tenant-b';
const NOW = new Date('2026-11-12T10:00:00.000Z');
const KEY = 'request-0001';
const input = {
  provider: 'test-provider', model: 'test-model',
  actualCostUsdMicros: 1000, inputTokens: 100, outputTokens: 50,
};

function setup() {
  const buckets = new Map<string, Record<string, any>>();
  const holds = new Map<string, Record<string, any>>();
  const usages = new Map<string, Record<string, any>>();
  let eligible = true;
  let approved = true;
  let emergencyDisabled = false;
  let enabled = true;
  let budget = 1000; // cents = USD 10
  let limit = 2;
  let serial: Promise<unknown> = Promise.resolve();

  const bucketKey = (agencyId: string, periodStart: Date) =>
    `${agencyId}|${periodStart.toISOString()}`;
  const holdKey = (agencyId: string, requestKey: string) =>
    `${agencyId}|${requestKey}`;
  const settings = () => ({
    agencyId: A, requestedEnabled: enabled, platformApproved: approved,
    revision: 1, monthlyBudgetUsdCents: budget, monthlyRequestLimit: limit,
  });
  const patchBucket = (key: string, data: Record<string, any>) => {
    const old = buckets.get(key)!;
    const next = { ...old };
    for (const [field, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'increment' in value)
        next[field] = old[field] + value.increment;
      else if (value && typeof value === 'object' && 'decrement' in value)
        next[field] = old[field] - value.decrement;
      else next[field] = value;
    }
    buckets.set(key, next);
    return next;
  };

  const tx = {
    agencyAiSettings: { findUnique: jest.fn(async () => settings()) },
    aiPlatformPolicy: {
      findUnique: jest.fn(async () => ({ emergencyDisabled })),
    },
    agency: {
      findFirst: jest.fn(async () => ({ id: A })),
    },
    aiQuotaBucket: {
      upsert: jest.fn(async ({ where }: { where: { agencyId_periodStart: {
        agencyId: string; periodStart: Date;
      } } }) => {
        const { agencyId, periodStart } = where.agencyId_periodStart;
        const key = bucketKey(agencyId, periodStart);
        if (!buckets.has(key)) buckets.set(key, {
          agencyId, periodStart,
          heldRequests: 0, committedRequests: 0,
          heldCostUsdMicros: 0, committedCostUsdMicros: 0, lockVersion: 1,
        });
        else patchBucket(key, { lockVersion: { increment: 1 } });
        return { ...buckets.get(key)! };
      }),
      update: jest.fn(async ({ where, data }: {
        where: { agencyId_periodStart: { agencyId: string; periodStart: Date } };
        data: Record<string, any>;
      }) => patchBucket(
        bucketKey(where.agencyId_periodStart.agencyId, where.agencyId_periodStart.periodStart),
        data,
      )),
      findUnique: jest.fn(async ({ where }: { where: { agencyId_periodStart: {
        agencyId: string; periodStart: Date;
      } } }) => buckets.get(bucketKey(
        where.agencyId_periodStart.agencyId, where.agencyId_periodStart.periodStart,
      )) ?? null),
    },
    aiQuotaReservation: {
      findUnique: jest.fn(async ({ where }: { where: { agencyId_requestKey: {
        agencyId: string; requestKey: string;
      } } }) => holds.get(holdKey(
        where.agencyId_requestKey.agencyId, where.agencyId_requestKey.requestKey,
      )) ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
        const key = holdKey(data.agencyId, data.requestKey);
        if (holds.has(key)) throw new ConflictException('Duplicate idempotency key');
        const row = { ...data, id: `hold-${holds.size + 1}` };
        holds.set(key, row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: { where: {
        agencyId: string; periodStart: Date; status: string; expiresAt: { lte: Date };
      } }) => [...holds.values()].filter((h) =>
        h.agencyId === where.agencyId && h.periodStart.toISOString() === where.periodStart.toISOString() &&
        h.status === where.status && h.expiresAt <= where.expiresAt.lte,
      )),
      updateMany: jest.fn(async ({ where, data }: { where: {
        id: { in: string[] }; agencyId: string; status: string;
      }; data: Record<string, any> }) => {
        let count = 0;
        for (const [key, hold] of holds.entries()) {
          if (where.id.in.includes(hold.id) && hold.agencyId === where.agencyId && hold.status === where.status) {
            holds.set(key, { ...hold, ...data });
            count++;
          }
        }
        return { count };
      }),
      update: jest.fn(async ({ where, data }: {
        where: { id: string }; data: Record<string, any>;
      }) => {
        for (const [key, hold] of holds.entries()) {
          if (where.id === hold.id) {
            const next = { ...hold, ...data };
            holds.set(key, next);
            return next;
          }
        }
        throw new NotFoundException('Missing hold');
      }),
    },
    aiUsageRecord: {
      findUnique: jest.fn(async ({ where }: { where: { agencyId_requestKey: {
        agencyId: string; requestKey: string;
      } } }) => usages.get(holdKey(
        where.agencyId_requestKey.agencyId, where.agencyId_requestKey.requestKey,
      )) ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
        const key = holdKey(data.agencyId, data.requestKey);
        const record = { ...data, id: `usage-${usages.size + 1}` };
        usages.set(key, record);
        return record;
      }),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(async (cb: (arg: typeof tx) => Promise<any>) => {
      // Simulates one row-exclusive per-month lock. Actual PostgreSQL lock
      // and cap tests are additionally rehearsed on a disposable database.
      let unlock!: () => void;
      const slot = new Promise<void>((resolve) => { unlock = resolve; });
      const wait = serial;
      serial = slot;
      await wait;
      try { return await cb(tx); } finally { unlock(); }
    }),
  };
  const governance = {
    getSettings: jest.fn(async () => ({
      effectiveEnabled: eligible, revision: 1,
    })),
  };
  const service = new AiQuotaService(prisma as never, governance as never);
  return {
    service, prisma, tx, buckets, holds, usages, governance,
    setEligible: (v: boolean) => { eligible = v; },
    setApproved: (v: boolean) => { approved = v; },
    setEmergency: (v: boolean) => { emergencyDisabled = v; },
    setEnabled: (v: boolean) => { enabled = v; },
    setBudget: (v: number) => { budget = v; },
    setLimit: (v: number) => { limit = v; },
  };
}

describe('Phase 1D private AI quota accounting', () => {
  it('exposes only a scoped read-only controller with permission metadata', async () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiQuotaController)).toEqual(['OWNER', 'MANAGER']);
    expect(Reflect.getMetadata(CAPABILITIES_KEY, AiQuotaController)).toEqual([
      'reports.view', 'finance.view',
    ]);
    const { service } = setup();
    const spy = jest.spyOn(service, 'getSummary');
    const ctrl = new AiQuotaController(service);
    await ctrl.getQuota({ agencyId: A });
    expect(spy).toHaveBeenCalledWith(A);
    await expect(ctrl.getQuota({})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports zero only for genuinely absent quota records, with UTC period boundaries', async () => {
    const { service, prisma } = setup();
    expect(await service.getSummary(A, NOW)).toMatchObject({
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEndExclusive: '2026-12-01T00:00:00.000Z',
      monthlyRequestLimit: 2,
      monthlyBudgetUsdMicros: 10_000_000,
      heldRequests: 0, committedRequests: 0,
      heldCostUsdMicros: 0, committedCostUsdMicros: 0,
      providerIntegrationReady: false,
      spendEnabled: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('denies actual use when governance/provider gate is off, before any database writes', async () => {
    const { service, prisma, setEligible } = setup();
    setEligible(false);
    await expect(service.reserveInternal(A, KEY, 1000, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects missing agency, malformed keys, invalid estimates and dates', async () => {
    const { service, prisma } = setup();
    await expect(service.reserveInternal('', KEY, 1000, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.reserveInternal(A, 'x', 1000, NOW)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.reserveInternal(A, KEY, 0, NOW)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.reserveInternal(A, KEY, 1.5, NOW)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.reserveInternal(A, KEY, 1000, new Date('garbage'))).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reserves once and never double-counts an idempotent request key', async () => {
    const { service } = setup();
    const a = await service.reserveInternal(A, KEY, 1000, NOW);
    const b = await service.reserveInternal(A, KEY, 1000, NOW);
    expect(a.id).toBe(b.id);
    expect(a.status).toBe('RESERVED');
    expect(await service.getSummary(A, NOW)).toMatchObject({
      heldRequests: 1, heldCostUsdMicros: 1000,
    });
    await expect(service.reserveInternal(A, KEY, 1001, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it('limits requests even with concurrent admissions in one tenant', async () => {
    const { service, setLimit } = setup();
    setLimit(1);
    const results = await Promise.allSettled([
      service.reserveInternal(A, 'request-0002', 1000, NOW),
      service.reserveInternal(A, 'request-0003', 1000, NOW),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await service.getSummary(A, NOW)).heldRequests).toBe(1);
  });

  it('prevents spending more than the monthly cost limit', async () => {
    const { service, setBudget } = setup();
    setBudget(1); // USD 0.01 = 10,000 USD micros
    await service.reserveInternal(A, 'request-0004', 7000, NOW);
    await expect(service.reserveInternal(A, 'request-0005', 4000, NOW))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect((await service.getSummary(A, NOW)).heldCostUsdMicros).toBe(7000);
  });

  it('rechecks emergency switch, approval and agency opt-in inside the transaction', async () => {
    const { service, setEmergency, setApproved, setEnabled } = setup();
    setEmergency(true);
    await expect(service.reserveInternal(A, KEY, 1000, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    setEmergency(false);
    setApproved(false);
    await expect(service.reserveInternal(A, KEY, 1000, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    setApproved(true);
    setEnabled(false);
    await expect(service.reserveInternal(A, KEY, 1000, NOW)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('releases an outstanding hold exactly once and never creates usage records', async () => {
    const { service, prisma } = setup();
    await service.reserveInternal(A, KEY, 4000, NOW);
    expect((await service.releaseInternal(A, KEY, NOW)).status).toBe('RELEASED');
    expect((await service.releaseInternal(A, KEY, NOW)).status).toBe('RELEASED');
    expect(await service.getSummary(A, NOW)).toMatchObject({
      heldRequests: 0, heldCostUsdMicros: 0, committedRequests: 0,
    });
    expect(prisma.aiUsageRecord.create).not.toHaveBeenCalled();
    // Request keys cannot be reused, even after release.
    expect((await service.reserveInternal(A, KEY, 4000, NOW)).status).toBe('RELEASED');
  });

  it('expires abandoned reservations under the same monthly bucket lock', async () => {
    const { service } = setup();
    await service.reserveInternal(A, KEY, 1000, NOW);
    const later = new Date(NOW.getTime() + 6 * 60_000);
    await service.reserveInternal(A, 'request-later', 1000, later);
    expect(await service.getSummary(A, later)).toMatchObject({
      heldRequests: 1, heldCostUsdMicros: 1000,
    });
    expect((await service.reserveInternal(A, KEY, 1000, later)).status).toBe('EXPIRED');
  });

  it('commits only bounded internal provider evidence and records exactly one usage event', async () => {
    const { service, prisma } = setup();
    await service.reserveInternal(A, KEY, 2000, NOW);
    const committed = await service.commitVerifiedInternal(A, KEY, input, NOW);
    expect(committed.reservation.status).toBe('COMMITTED');
    expect(committed.usage).toMatchObject({
      costUsdMicros: 1000, inputTokens: 100, outputTokens: 50,
    });
    expect(await service.getSummary(A, NOW)).toMatchObject({
      heldRequests: 0, heldCostUsdMicros: 0,
      committedRequests: 1, committedCostUsdMicros: 1000,
    });
    expect((await service.commitVerifiedInternal(A, KEY, input, NOW)).usage.id)
      .toBe(committed.usage.id);
    expect(prisma.aiUsageRecord.create).toHaveBeenCalledTimes(1);
  });

  it('rejects settlement overages and conflicting retries, never hiding budget overruns', async () => {
    const { service } = setup();
    await service.reserveInternal(A, KEY, 1100, NOW);
    await expect(service.commitVerifiedInternal(A, KEY, {
      ...input, actualCostUsdMicros: 1101,
    }, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect((await service.getSummary(A, NOW)).heldRequests).toBe(1);
    await service.commitVerifiedInternal(A, KEY, input, NOW);
    await expect(service.commitVerifiedInternal(A, KEY, {
      ...input, actualCostUsdMicros: 1001,
    }, NOW)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.releaseInternal(A, KEY, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses late settlement and never pretends an expired hold was verified', async () => {
    const { service, prisma } = setup();
    await service.reserveInternal(A, KEY, 2000, NOW);
    await expect(service.commitVerifiedInternal(A, KEY, input,
      new Date(NOW.getTime() + 6 * 60_000))).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.aiUsageRecord.create).not.toHaveBeenCalled();
  });

  it('never misattributes usage to a different UTC billing month', async () => {
    const { service, prisma } = setup();
    const lastDay = new Date('2026-11-30T23:57:00Z');
    await service.reserveInternal(A, KEY, 2000, lastDay);
    await expect(service.commitVerifiedInternal(A, KEY, input,
      new Date('2026-12-01T00:01:00Z'))).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.aiUsageRecord.create).not.toHaveBeenCalled();
  });

  it('rejects numeric token counts beyond the PostgreSQL integer range', async () => {
    const { service } = setup();
    await service.reserveInternal(A, KEY, 2000, NOW);
    await expect(service.commitVerifiedInternal(A, KEY, {
      ...input, outputTokens: 2_147_483_648,
    }, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it('supports independent agency request keys without leaking tenant records', async () => {
    const { service } = setup();
    await service.reserveInternal(A, KEY, 1000, NOW);
    await service.reserveInternal(B, KEY, 1000, NOW);
    expect((await service.getSummary(A, NOW)).heldRequests).toBe(1);
    expect((await service.getSummary(B, NOW)).heldRequests).toBe(1);
  });

  it('rejects settlement or release of an unknown key', async () => {
    const { service } = setup();
    await expect(service.releaseInternal(A, KEY, NOW)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.commitVerifiedInternal(A, KEY, input, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});
