import { ConflictException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AiGovernanceService } from './ai-governance.service';
import { UpdateAiGovernanceDto } from './ai-governance.dto';
import { AiGovernanceController } from './ai-governance.controller';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';

const AGENCY = 'agency-test';
const ACTOR = 'owner-test';
const requested = {
  expectedRevision: 0,
  requestedEnabled: true,
  preferredLanguage: 'FR' as const,
  monthlyBudgetUsdCents: 1000,
  monthlyRequestLimit: 15,
};

function setup() {
  let stored: Record<string, unknown> | null = null;
  let active = true;
  const auditCreate = jest.fn(async (_args: unknown) => ({}));
  const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
    stored = { platformApproved: false, ...data };
    return stored;
  });
  const updateMany = jest.fn(async ({ where, data }: {
    where: { agencyId: string; revision: number };
    data: Record<string, unknown>;
  }) => {
    if (!stored || where.revision !== stored.revision || where.agencyId !== stored.agencyId) {
      return { count: 0 };
    }
    stored = { ...stored, ...data };
    return { count: 1 };
  });
  const findUnique = jest.fn(async () => stored);
  const db = {
    agency: { findFirst: jest.fn(async () => active ? { id: AGENCY } : null) },
    agencyAiSettings: { findUnique, create, updateMany },
    aiSettingsChange: { create: auditCreate },
    aiUsageRecord: {
      aggregate: jest.fn(async () => ({
        _count: { _all: 0 },
        _sum: { inputTokens: null, outputTokens: null, costUsdMicros: null },
      })),
      create: jest.fn(),
    },
  };
  const prisma = { ...db, $transaction: jest.fn(async (cb: (tx: typeof db) => Promise<unknown>) => cb(db)) };
  const service = new AiGovernanceService(prisma as never);
  return { service, prisma, db, auditCreate, create, updateMany, setStored: (value: Record<string, unknown> | null) => { stored = value; }, setInactive: () => { active = false; } };
}

describe('Phase 1B: tenant AI governance', () => {

  it('declares owner-only, settings.manage gate for writes and report access for reads', () => {
    const handler = Object.getOwnPropertyDescriptor(AiGovernanceController.prototype, 'updateSettings')?.value as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['OWNER']);
    expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toEqual(['settings.manage']);
    expect(Reflect.getMetadata(ROLES_KEY, AiGovernanceController)).toEqual(['OWNER', 'MANAGER']);
    expect(Reflect.getMetadata(CAPABILITIES_KEY, AiGovernanceController)).toEqual(['reports.view']);
    const readHandler = Object.getOwnPropertyDescriptor(AiGovernanceController.prototype, 'getSettings')?.value as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata(ROLES_KEY, readHandler)).toBeUndefined();
  });

  afterEach(() => { delete process.env.CARHUB_AI_PLATFORM_ENABLED; });

  it('defaults to OFF with zero budget and mandatory human review, without creating rows', async () => {
    const { service, create, auditCreate } = setup();
    expect(await service.getSettings(AGENCY)).toMatchObject({
      requestedEnabled: false,
      platformApproved: false,
      revision: 0,
      monthlyBudgetUsdCents: 0,
      monthlyRequestLimit: 0,
      providerIntegrationReady: false,
      effectiveEnabled: false,
      actionMode: 'MONITOR',
      humanApprovalRequired: true,
      autonomousActionsAllowed: false,
      provider: null,
      model: null,
      status: 'OFF',
    });
    expect(create).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('stays disabled even when opted-in, budget positive, and platform flag true', async () => {
    const { service, setStored } = setup();
    setStored({
      ...requested,
      agencyId: AGENCY,
      revision: 3,
      platformApproved: true,
    });
    process.env.CARHUB_AI_PLATFORM_ENABLED = 'true';
    expect(await service.getSettings(AGENCY)).toMatchObject({
      requestedEnabled: true,
      platformApproved: true,
      platformEnabled: true,
      providerIntegrationReady: false,
      effectiveEnabled: false,
      autonomousActionsAllowed: false,
      status: 'AWAITING_PLATFORM_REVIEW',
    });
  });

  it('never reads, updates or meters anything for a missing agency or actor', async () => {
    const { service, prisma } = setup();
    await expect(service.getSettings('')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getUsage('')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateSettings('', ACTOR, requested)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateSettings(AGENCY, '', requested)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.aiUsageRecord.aggregate).not.toHaveBeenCalled();
  });

  it('saves an agency opt-in request and audit entry together, without platform approval', async () => {
    const { service, prisma, auditCreate, create } = setup();
    const response = await service.updateSettings(AGENCY, ACTOR, requested);
    expect(response).toMatchObject({
      requestedEnabled: true, preferredLanguage: 'FR', revision: 1,
      platformApproved: false, effectiveEnabled: false,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ agencyId: AGENCY, revision: 1, requestedEnabled: true }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agencyId: AGENCY, actorId: ACTOR, revision: 1,
        snapshot: expect.objectContaining({ requestedEnabled: true, monthlyBudgetUsdCents: 1000 }),
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain('apiKey');
    expect(prisma.aiUsageRecord.create).not.toHaveBeenCalled();
  });

  it('uses optimistic revision updates and returns 409 for stale versions', async () => {
    const { service, setStored, updateMany, auditCreate } = setup();
    setStored({ agencyId: AGENCY, revision: 1, ...requested });
    await expect(service.updateSettings(AGENCY, ACTOR, { ...requested, expectedRevision: 0 }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
    await expect(service.updateSettings(AGENCY, ACTOR, { ...requested, expectedRevision: 1 }))
      .resolves.toMatchObject({ revision: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { agencyId: AGENCY, revision: 1 },
      data: expect.objectContaining({ revision: 2 }),
    });
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects suspended agencies before any write', async () => {
    const { service, setInactive, create, auditCreate } = setup();
    setInactive();
    await expect(service.updateSettings(AGENCY, ACTOR, requested))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('rejects noninteger, negative and out-of-range budgets even if DTO is bypassed', async () => {
    const { service, prisma } = setup();
    const invalid = [
      { ...requested, monthlyBudgetUsdCents: -1 },
      { ...requested, monthlyBudgetUsdCents: 100001 },
      { ...requested, monthlyBudgetUsdCents: 1.2 },
      { ...requested, monthlyRequestLimit: 10001 },
      { ...requested, preferredLanguage: 'XX' },
      { ...requested, requestedEnabled: 'true' },
    ];
    for (const value of invalid) {
      await expect(service.updateSettings(AGENCY, ACTOR, value as never))
        .rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns only actual tenant-scoped usage records for the UTC billing month', async () => {
    const { service, prisma } = setup();
    const snapshot = await service.getUsage(AGENCY, new Date('2026-11-12T12:00:00Z'));
    expect(snapshot).toMatchObject({
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEndExclusive: '2026-12-01T00:00:00.000Z',
      recordedRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      recordedCostUsdMicros: 0,
      providerCallsAvailable: false,
    });
    expect(prisma.aiUsageRecord.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { agencyId: AGENCY, createdAt: {
        gte: new Date('2026-11-01T00:00:00.000Z'),
        lt: new Date('2026-12-01T00:00:00.000Z'),
      } },
    }));
    expect(prisma.aiUsageRecord.create).not.toHaveBeenCalled();
  });

  it('DTO validation accepts only safe values within bounds', async () => {
    expect(await validate(plainToInstance(UpdateAiGovernanceDto, requested))).toHaveLength(0);
    expect((await validate(plainToInstance(UpdateAiGovernanceDto,
      { ...requested, preferredLanguage: 'XX' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(UpdateAiGovernanceDto,
      { ...requested, monthlyRequestLimit: 999999 }))).length).toBeGreaterThan(0);
  });
});
