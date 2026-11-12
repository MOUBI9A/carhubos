import {
  BadRequestException, ConflictException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AiPlatformControlsService } from './ai-platform-controls.service';
import {
  ReviewAgencyAiDto, UpdateAiEmergencyDto,
} from './ai-platform-controls.dto';
import { AiPlatformControlsController } from './ai-platform-controls.controller';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

const ROOT = 'verified-platform-admin';
const AGENCY = 'agency-a';
const REASON = 'Reviewed and documented the organization and consent.';

function setup() {
  let policy = { id: 'GLOBAL', emergencyDisabled: true, revision: 1 };
  let settings = {
    agencyId: AGENCY, requestedEnabled: true, platformApproved: false,
    monthlyBudgetUsdCents: 1000, monthlyRequestLimit: 20,
    preferredLanguage: 'EN', revision: 1,
  };
  let actor = { role: 'ROOT_ADMIN', isVerified: true };
  let agencyActive = true;

  const tx = {
    aiPlatformPolicy: {
      findUnique: jest.fn(async () => policy),
      updateMany: jest.fn(async ({ where, data }: {
        where: { id: string; revision: number };
        data: Partial<typeof policy>;
      }) => {
        if (where.id !== 'GLOBAL' || where.revision !== policy.revision) return { count: 0 };
        policy = { ...policy, ...data };
        return { count: 1 };
      }),
    },
    aiPlatformPolicyEvent: { create: jest.fn(async () => ({})) },
    aiPlatformReview: { create: jest.fn(async () => ({})) },
    aiSettingsChange: { create: jest.fn(async () => ({})) },
    agency: { findFirst: jest.fn(async () => agencyActive ? { id: AGENCY } : null) },
    agencyAiSettings: {
      findUnique: jest.fn(async () => settings),
      updateMany: jest.fn(async ({ where, data }: {
        where: { agencyId: string; revision: number };
        data: Partial<typeof settings>;
      }) => {
        if (where.agencyId !== AGENCY || where.revision !== settings.revision) return { count: 0 };
        settings = { ...settings, ...data };
        return { count: 1 };
      }),
      findMany: jest.fn(async () => []),
    },
  };
  const prisma = {
    ...tx,
    user: { findUnique: jest.fn(async () => actor) },
    $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  };
  return {
    service: new AiPlatformControlsService(prisma as never),
    prisma,
    tx,
    setPolicy: (p: Partial<typeof policy> | null) => {
      if (p) policy = { ...policy, ...p };
      else tx.aiPlatformPolicy.findUnique.mockResolvedValue(null as never);
    },
    setSettings: (s: Partial<typeof settings> | null) => {
      if (s) settings = { ...settings, ...s };
      else tx.agencyAiSettings.findUnique.mockResolvedValue(null as never);
    },
    setActor: (a: Partial<typeof actor> | null) => {
      if (a) actor = { ...actor, ...a };
      else prisma.user.findUnique.mockResolvedValue(null as never);
    },
    setAgencyInactive: () => { agencyActive = false; },
  };
}

describe('Phase 1C: platform-only AI controls', () => {
  it('controller routes are ROOT_ADMIN-gated, never inherited agency roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiPlatformControlsController))
      .toEqual(['ROOT_ADMIN']);
  });

  it('starts with global emergency disabled and no provider/inference', async () => {
    const { service } = setup();
    const policy = await service.getPolicy(ROOT);
    expect(policy).toMatchObject({
      emergencyDisabled: true,
      revision: 1,
      providerIntegrationReady: false,
      effectiveInferenceEnabled: false,
    });
  });

  it('refuses platform operations for stale-demoted or unverified admin sessions', async () => {
    const { service, prisma, setActor } = setup();
    setActor({ role: 'AGENT' });
    await expect(service.getPolicy(ROOT)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateEmergency(ROOT, {
      expectedRevision: 1, emergencyDisabled: false, reason: REASON,
    })).rejects.toBeInstanceOf(ForbiddenException);
    setActor({ role: 'ROOT_ADMIN', isVerified: false });
    await expect(service.listRequests(ROOT)).rejects.toBeInstanceOf(ForbiddenException);
    setActor(null);
    await expect(service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 1, approve: true, reason: REASON,
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates emergency state only with a valid revision and immutable audit', async () => {
    const { service, tx } = setup();
    const result = await service.updateEmergency(ROOT, {
      expectedRevision: 1, emergencyDisabled: false, reason: REASON,
    });
    expect(result).toMatchObject({
      emergencyDisabled: false, revision: 2,
      providerIntegrationReady: false, effectiveInferenceEnabled: false,
    });
    expect(tx.aiPlatformPolicy.updateMany).toHaveBeenCalledWith({
      where: { id: 'GLOBAL', revision: 1 },
      data: { emergencyDisabled: false, revision: 2 },
    });
    expect(tx.aiPlatformPolicyEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        policyId: 'GLOBAL', actorId: ROOT, revision: 2,
        emergencyDisabled: false, reason: REASON,
      }),
    });
    expect(await service.getPolicy(ROOT)).toMatchObject({
      emergencyDisabled: false, revision: 2, effectiveInferenceEnabled: false,
    });
  });

  it('fails closed if singleton absent, rejects stale/no-op changes and bad reasons', async () => {
    const { service, prisma, setPolicy } = setup();
    await expect(service.updateEmergency(ROOT, {
      expectedRevision: 0, emergencyDisabled: false, reason: REASON,
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateEmergency(ROOT, {
      expectedRevision: 1, emergencyDisabled: false, reason: 'too short',
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateEmergency(ROOT, {
      expectedRevision: 2, emergencyDisabled: false, reason: REASON,
    })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.updateEmergency(ROOT, {
      expectedRevision: 1, emergencyDisabled: true, reason: REASON,
    })).rejects.toBeInstanceOf(ConflictException);
    setPolicy(null);
    await expect(service.getPolicy(ROOT)).resolves.toMatchObject({
      emergencyDisabled: true, revision: 0, effectiveInferenceEnabled: false,
    });
    await expect(service.updateEmergency(ROOT, {
      expectedRevision: 1, emergencyDisabled: false, reason: REASON,
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.aiPlatformPolicyEvent.create).not.toHaveBeenCalled();
  });

  it('approves a genuinely requested agency only after human review, still no AI', async () => {
    const { service, tx } = setup();
    const result = await service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 1, approve: true, reason: REASON,
    });
    expect(result).toMatchObject({
      agencyId: AGENCY, platformApproved: true, decision: 'APPROVE', revision: 2,
      effectiveInferenceEnabled: false, actionMode: 'MONITOR',
    });
    expect(tx.agencyAiSettings.updateMany).toHaveBeenCalledWith({
      where: { agencyId: AGENCY, revision: 1 },
      data: { platformApproved: true, revision: 2 },
    });
    expect(tx.aiPlatformReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agencyId: AGENCY, actorId: ROOT, approved: true, decision: 'APPROVE', revision: 2,
      }),
    });
    expect(tx.aiSettingsChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: ROOT, agencyId: AGENCY, revision: 2,
        snapshot: expect.objectContaining({
          changeSource: 'PLATFORM_REVIEW', platformApproved: true,
        }),
      }),
    });
  });

  it('records a distinct rejection with reason on a previously pending request', async () => {
    const { service, tx } = setup();
    const result = await service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 1,
      approve: false,
      reason: 'Agency has not yet completed the required privacy review.',
    });
    expect(result).toMatchObject({
      platformApproved: false, decision: 'REJECT', revision: 2,
      effectiveInferenceEnabled: false,
    });
    expect(tx.aiPlatformReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agencyId: AGENCY, actorId: ROOT, approved: false,
        decision: 'REJECT', revision: 2,
      }),
    });
    expect(tx.aiSettingsChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agencyId: AGENCY, revision: 2,
        snapshot: expect.objectContaining({ decision: 'REJECT' }),
      }),
    });
  });

  it('revokes a previous approval with a separate immutable review event', async () => {
    const { service, tx, setSettings } = setup();
    setSettings({ platformApproved: true, revision: 5 });
    await expect(service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 5, approve: false, reason: REASON,
    })).resolves.toMatchObject({ platformApproved: false, decision: 'REVOKE', revision: 6 });
    expect(tx.aiPlatformReview.create).toHaveBeenCalledTimes(1);
  });

  it('refuses unrequested, uncapped, inactive, nonexistent and stale approvals', async () => {
    const { service, tx, setSettings, setAgencyInactive } = setup();
    setSettings({ requestedEnabled: false });
    await expect(service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 1, approve: true, reason: REASON,
    })).rejects.toBeInstanceOf(BadRequestException);
    setSettings({ requestedEnabled: true, monthlyRequestLimit: 0 });
    await expect(service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 1, approve: true, reason: REASON,
    })).rejects.toBeInstanceOf(BadRequestException);
    setSettings({ monthlyRequestLimit: 20 });
    await expect(service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 2, approve: true, reason: REASON,
    })).rejects.toBeInstanceOf(ConflictException);
    setAgencyInactive();
    await expect(service.reviewAgency(ROOT, AGENCY, {
      expectedRevision: 1, approve: true, reason: REASON,
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.aiPlatformReview.create).not.toHaveBeenCalled();
  });

  it('validates DTO reason and boolean fields before execution', async () => {
    const valid = { expectedRevision: 1, emergencyDisabled: true, reason: REASON };
    expect(await validate(plainToInstance(UpdateAiEmergencyDto, valid))).toHaveLength(0);
    expect((await validate(plainToInstance(UpdateAiEmergencyDto,
      { ...valid, reason: 'x' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(ReviewAgencyAiDto,
      { expectedRevision: 1, approve: 'yes', reason: REASON }))).length).toBeGreaterThan(0);
  });
});
