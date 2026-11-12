import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, type AgencyAiSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAiGovernanceDto } from './ai-governance.dto';

type AgencyAiLanguage = 'EN' | 'FR' | 'AR';

const DEFAULTS = {
  requestedEnabled: false,
  platformApproved: false,
  preferredLanguage: 'EN' as AgencyAiLanguage,
  monthlyBudgetUsdCents: 0,
  monthlyRequestLimit: 0,
  revision: 0,
};

/**
 * Phase 1B is a *configuration and metering foundation*, not inference.
 * Platform approval has no public setter, the provider adapter does not yet
 * exist, and human-reviewed actions remain the only acceptable future mode.
 */
@Injectable()
export class AiGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAgency(agencyId?: string): asserts agencyId is string {
    if (!agencyId?.trim()) {
      throw new ForbiddenException('A signed-in agency is required.');
    }
  }

  async getSettings(
    agencyId: string,
    actor?: { id: string; role: string },
  ) {
    this.requireAgency(agencyId);
    const stored = await this.prisma.agencyAiSettings.findUnique({
      where: { agencyId },
    });
    // The backend remains the authority: a role label alone does not convey
    // permission to edit if membership capability settings.manage was removed.
    let canEdit = false;
    if (actor?.role === 'OWNER' && actor.id) {
      const membership = await this.prisma.agencyMembership.findUnique({
        where: { userId_agencyId: { userId: actor.id, agencyId } },
        select: { capabilities: true },
      });
      canEdit = membership?.capabilities.includes('settings.manage') ?? false;
    }
    return this.presentSettings(stored, canEdit);
  }

  private presentSettings(
    stored: Pick<
      AgencyAiSettings,
      'requestedEnabled' | 'platformApproved' | 'preferredLanguage' |
      'monthlyBudgetUsdCents' | 'monthlyRequestLimit' | 'revision'
    > | null,
    canEdit = false,
  ) {
    const settings = stored ?? DEFAULTS;

    // A future provider integration must explicitly replace this separate
    // readiness gate after threat-model, spend-caps and tenant review.
    const providerIntegrationReady = false;
    const platformEnabled = process.env.CARHUB_AI_PLATFORM_ENABLED === 'true';
    const effectiveEnabled = Boolean(
      settings.requestedEnabled &&
      settings.platformApproved &&
      platformEnabled &&
      providerIntegrationReady &&
      settings.monthlyBudgetUsdCents > 0 &&
      settings.monthlyRequestLimit > 0,
    );

    return {
      requestedEnabled: settings.requestedEnabled,
      canEdit,
      preferredLanguage: settings.preferredLanguage,
      monthlyBudgetUsdCents: settings.monthlyBudgetUsdCents,
      monthlyRequestLimit: settings.monthlyRequestLimit,
      revision: settings.revision,
      platformApproved: settings.platformApproved,
      platformEnabled,
      providerIntegrationReady,
      effectiveEnabled,
      actionMode: 'MONITOR' as const,
      humanApprovalRequired: true,
      autonomousActionsAllowed: false,
      provider: null,
      model: null,
      status: settings.requestedEnabled ? 'AWAITING_PLATFORM_REVIEW' as const : 'OFF' as const,
      explanation: 'No model is configured and no inference or autonomous actions are enabled.',
    };
  }

  /**
   * A tenant owner may REQUEST AI access and specify upper bounds.
   * It never flips platformApproved or activates a model provider.
   * All writes and audit events are a single transaction with CAS revision.
   */
  async updateSettings(
    agencyId: string,
    actorId: string,
    dto: UpdateAiGovernanceDto,
  ) {
    this.requireAgency(agencyId);
    if (!actorId?.trim()) {
      throw new ForbiddenException('An authenticated actor is required.');
    }

    const changed = {
      requestedEnabled: dto.requestedEnabled,
      preferredLanguage: dto.preferredLanguage,
      monthlyBudgetUsdCents: dto.monthlyBudgetUsdCents,
      monthlyRequestLimit: dto.monthlyRequestLimit,
    };
    if (
      !Number.isSafeInteger(dto.expectedRevision) ||
      dto.expectedRevision < 0 ||
      !['EN', 'FR', 'AR'].includes(dto.preferredLanguage) ||
      typeof dto.requestedEnabled !== 'boolean' ||
      !Number.isSafeInteger(dto.monthlyBudgetUsdCents) ||
      dto.monthlyBudgetUsdCents < 0 || dto.monthlyBudgetUsdCents > 100000 ||
      !Number.isSafeInteger(dto.monthlyRequestLimit) ||
      dto.monthlyRequestLimit < 0 || dto.monthlyRequestLimit > 10000
    ) throw new ForbiddenException('Invalid AI governance settings.');

    try {
      const persisted = await this.prisma.$transaction(async (tx) => {
        const activeAgency = await tx.agency.findFirst({
          where: { id: agencyId, status: 'ACTIVE', deletedAt: null },
          select: { id: true },
        });
        if (!activeAgency) {
          throw new ForbiddenException('The agency is not active.');
        }

        const current = await tx.agencyAiSettings.findUnique({
          where: { agencyId },
          select: { revision: true },
        });
        const previous = current?.revision ?? 0;
        if (dto.expectedRevision !== previous) {
          throw new ConflictException('Settings changed; reload and try again.');
        }

        const revision = previous + 1;
        let persisted: AgencyAiSettings;
        if (!current) {
          persisted = await tx.agencyAiSettings.create({
            data: { agencyId, ...changed, revision },
          });
        } else {
          const updated = await tx.agencyAiSettings.updateMany({
            where: { agencyId, revision: previous },
            data: { ...changed, revision },
          });
          if (updated.count !== 1) {
            throw new ConflictException('Settings changed; reload and try again.');
          }
          const afterUpdate = await tx.agencyAiSettings.findUnique({
            where: { agencyId },
          });
          if (!afterUpdate) {
            throw new ConflictException('Settings changed; reload and try again.');
          }
          persisted = afterUpdate;
        }

        // Append-only via agency-facing API: no edit/delete/approval routes.
        await tx.aiSettingsChange.create({
          data: {
            agencyId,
            actorId,
            revision,
            snapshot: {
              ...changed,
              revision,
            },
          },
        });
        // Return the exact written state while the row is locked. Reading
        // again after commit could return a *different* owner's revision.
        return persisted;
      });
      return this.presentSettings(persisted, true);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) throw new ConflictException('Settings changed; reload and try again.');
      throw error;
    }
  }

  async getUsage(agencyId: string, now = new Date()) {
    this.requireAgency(agencyId);
    if (!Number.isFinite(now.getTime())) throw new Error('Invalid timestamp');

    // Billing-period definition deliberately fixed to UTC until an approved
    // per-agency billing convention exists.
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const aggregate = await this.prisma.aiUsageRecord.aggregate({
      where: { agencyId, createdAt: { gte: monthStart, lt: nextMonth } },
      _count: { _all: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costUsdMicros: true,
      },
    });

    return {
      periodStart: monthStart.toISOString(),
      periodEndExclusive: nextMonth.toISOString(),
      recordedRequests: aggregate._count._all,
      inputTokens: aggregate._sum.inputTokens ?? 0,
      outputTokens: aggregate._sum.outputTokens ?? 0,
      recordedCostUsdMicros: aggregate._sum.costUsdMicros ?? 0,
      meterType: 'VERIFIED_RECORDS_ONLY' as const,
      providerCallsAvailable: false,
      note: 'No AI model is currently connected. This ledger is for future verified calls, not an invoice.',
    };
  }
}
