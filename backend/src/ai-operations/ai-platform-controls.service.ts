import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReviewAgencyAiDto, UpdateAiEmergencyDto,
} from './ai-platform-controls.dto';

export const GLOBAL_AI_POLICY_ID = 'GLOBAL';

/**
 * Only the platform founder may record per-agency approval and operate the
 * emergency switch. No provider is connected; recording approval is NEVER
 * sufficient to enable inference or autonomous actions.
 */
@Injectable()
export class AiPlatformControlsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireLiveRoot(actorId: string) {
    if (!actorId?.trim()) {
      throw new ForbiddenException('An authenticated platform actor is required.');
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, isVerified: true },
    });
    if (actor?.role !== 'ROOT_ADMIN' || actor.isVerified !== true) {
      throw new ForbiddenException('Current verified platform administrator required.');
    }
  }

  private validateReason(reason: unknown): asserts reason is string {
    if (
      typeof reason !== 'string' ||
      reason.length > 400 ||
      reason.trim().length < 12
    ) throw new BadRequestException('A justification of 12–400 characters is required.');
  }

  private validateRevision(revision: unknown) {
    if (!Number.isSafeInteger(revision) || (revision as number) < 1) {
      throw new BadRequestException('A valid expected revision is required.');
    }
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) throw new ConflictException('Another review changed this record; reload first.');
    throw error;
  }

  async getPolicy(actorId: string) {
    await this.requireLiveRoot(actorId);
    const row = await this.prisma.aiPlatformPolicy.findUnique({
      where: { id: GLOBAL_AI_POLICY_ID },
    });
    // Migration initializes a singleton. Missing is always fail-closed.
    return {
      emergencyDisabled: row?.emergencyDisabled ?? true,
      revision: row?.revision ?? 0,
      effectiveInferenceEnabled: false as const,
      providerIntegrationReady: false as const,
      explanation: 'The provider adapter is not connected, regardless of platform policy.',
    };
  }

  async listRequests(actorId: string) {
    await this.requireLiveRoot(actorId);
    return this.prisma.agencyAiSettings.findMany({
      where: { requestedEnabled: true },
      select: {
        agencyId: true,
        requestedEnabled: true,
        platformApproved: true,
        revision: true,
        preferredLanguage: true,
        monthlyBudgetUsdCents: true,
        monthlyRequestLimit: true,
        agency: { select: { name: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async updateEmergency(actorId: string, dto: UpdateAiEmergencyDto) {
    await this.requireLiveRoot(actorId);
    this.validateRevision(dto?.expectedRevision);
    if (typeof dto.emergencyDisabled !== 'boolean') {
      throw new BadRequestException('Expected a boolean switch value.');
    }
    this.validateReason(dto.reason);

    try {
      const saved = await this.prisma.$transaction(async (tx) => {
        const current = await tx.aiPlatformPolicy.findUnique({
          where: { id: GLOBAL_AI_POLICY_ID },
        });
        if (!current) {
          throw new ForbiddenException('Global AI policy missing; emergency lock remains on.');
        }
        if (current.revision !== dto.expectedRevision) {
          throw new ConflictException('Policy changed; reload and try again.');
        }
        if (current.emergencyDisabled === dto.emergencyDisabled) {
          throw new ConflictException('Policy already has that switch state.');
        }
        const revision = current.revision + 1;
        const updated = await tx.aiPlatformPolicy.updateMany({
          where: { id: GLOBAL_AI_POLICY_ID, revision: current.revision },
          data: { emergencyDisabled: dto.emergencyDisabled, revision },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Policy changed; reload and try again.');
        }
        await tx.aiPlatformPolicyEvent.create({
          data: {
            policyId: GLOBAL_AI_POLICY_ID,
            actorId,
            revision,
            emergencyDisabled: dto.emergencyDisabled,
            reason: dto.reason.trim(),
          },
        });
        return { emergencyDisabled: dto.emergencyDisabled, revision };
      });
      return {
        ...saved,
        effectiveInferenceEnabled: false as const,
        providerIntegrationReady: false as const,
        explanation: 'Switch changes never start a model or perform actions.',
      };
    } catch (error) {
      return this.rethrowConflict(error);
    }
  }

  async reviewAgency(
    actorId: string,
    agencyId: string,
    dto: ReviewAgencyAiDto,
  ) {
    await this.requireLiveRoot(actorId);
    if (!agencyId?.trim()) throw new BadRequestException('Agency ID is required.');
    this.validateRevision(dto?.expectedRevision);
    if (typeof dto.approve !== 'boolean') {
      throw new BadRequestException('Approve must be a boolean.');
    }
    this.validateReason(dto.reason);

    try {
      const saved = await this.prisma.$transaction(async (tx) => {
        const agency = await tx.agency.findFirst({
          where: { id: agencyId, status: 'ACTIVE', deletedAt: null },
          select: { id: true },
        });
        if (!agency) throw new NotFoundException('Active agency not found.');

        const settings = await tx.agencyAiSettings.findUnique({
          where: { agencyId },
        });
        if (!settings) {
          throw new NotFoundException('Agency has not configured AI settings.');
        }
        if (settings.revision !== dto.expectedRevision) {
          throw new ConflictException('Agency preferences changed; reload before review.');
        }
        if (
          dto.approve &&
          (!settings.requestedEnabled ||
            settings.monthlyBudgetUsdCents <= 0 ||
            settings.monthlyRequestLimit <= 0)
        ) {
          throw new BadRequestException('Agency must request access with positive caps before approval.');
        }
        if (settings.platformApproved === dto.approve) {
          throw new ConflictException('Review is already in the requested state.');
        }

        const revision = settings.revision + 1;
        const updated = await tx.agencyAiSettings.updateMany({
          where: { agencyId, revision: settings.revision },
          data: { platformApproved: dto.approve, revision },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Agency settings changed during review.');
        }
        await tx.aiPlatformReview.create({
          data: {
            agencyId,
            actorId,
            revision,
            approved: dto.approve,
            reason: dto.reason.trim(),
          },
        });
        await tx.aiSettingsChange.create({
          data: {
            agencyId,
            actorId,
            revision,
            snapshot: {
              requestedEnabled: settings.requestedEnabled,
              preferredLanguage: settings.preferredLanguage,
              monthlyBudgetUsdCents: settings.monthlyBudgetUsdCents,
              monthlyRequestLimit: settings.monthlyRequestLimit,
              platformApproved: dto.approve,
              revision,
              changeSource: 'PLATFORM_REVIEW',
            },
          },
        });
        // Committed version derived from the exact transaction, never re-read
        // from an outside request after another owner could have changed it.
        return { agencyId, platformApproved: dto.approve, revision };
      });
      return {
        ...saved,
        effectiveInferenceEnabled: false as const,
        providerIntegrationReady: false as const,
        actionMode: 'MONITOR' as const,
      };
    } catch (error) {
      return this.rethrowConflict(error);
    }
  }
}
