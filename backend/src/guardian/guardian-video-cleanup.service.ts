import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';

// The original signed token and a 24-hour TUS session can both outlive an
// application's canceled/expired intent. Wait a full 48 hours from creation.
const ORPHAN_WAIT_MS = 48 * 60 * 60 * 1000;
const RETRY_GAP_MS = 20 * 60 * 60 * 1000;
const MAX_BATCH = 100;

export type GuardianCleanupSummary = {
  candidates: number;
  claimed: number;
  deleted: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
};

@Injectable()
export class GuardianVideoCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: VaultStorageService,
  ) {}

  /**
   * Privileged, bounded orphan cleanup. Never accepts tenant/paths from HTTP.
   * A report row lock serializes the cancellation claim with finalization.
   * Only exact database-issued paths without immutable evidence are removed.
   * A repeated sweep catches storage objects created *after* an earlier delete.
   */
  async sweep(options: { now?: Date; limit?: number; dryRun?: boolean } = {}):
    Promise<GuardianCleanupSummary> {
    const now = options.now ?? new Date();
    const limit = options.limit ?? 50;
    const dryRun = options.dryRun ?? true;
    if (
      Number.isNaN(now.getTime()) ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_BATCH
    ) throw new Error('Invalid Guardian orphan cleanup arguments.');

    const readyBefore = new Date(now.getTime() - ORPHAN_WAIT_MS);
    const retryBefore = new Date(now.getTime() - RETRY_GAP_MS);
    const candidates = await this.prisma.guardianUploadIntent.findMany({
      where: {
        status: { in: ['PENDING', 'CANCELED'] },
        createdAt: { lt: readyBefore },
        expiresAt: { lt: now },
        OR: [{ lastSweptAt: null }, { lastSweptAt: { lt: retryBefore } }],
      },
      orderBy: [
        { lastSweptAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      take: limit,
    });

    const summary: GuardianCleanupSummary = {
      candidates: candidates.length,
      claimed: 0,
      deleted: 0,
      failed: 0,
      skipped: 0,
      dryRun,
    };

    for (const candidate of candidates) {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const locked = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM "GuardianReport"
            WHERE id = ${candidate.reportId}
              AND "agencyId" = ${candidate.agencyId}
            FOR UPDATE
          `;
          if (!locked.length) return null;

          const intent = await tx.guardianUploadIntent.findUnique({
            where: { id: candidate.id },
          });
          if (
            !intent ||
            !['PENDING', 'CANCELED'].includes(intent.status) ||
            intent.createdAt.getTime() >= readyBefore.getTime() ||
            intent.expiresAt.getTime() >= now.getTime() ||
            (intent.lastSweptAt &&
              intent.lastSweptAt.getTime() >= retryBefore.getTime())
          ) return null;

          const evidence = await tx.guardianEvidence.findUnique({
            where: { storagePath: intent.storagePath },
            select: { id: true },
          });
          if (evidence) return null;
          if (dryRun) return { path: intent.storagePath };

          await tx.guardianUploadIntent.update({
            where: { id: intent.id },
            data: { status: 'CANCELED', lastSweptAt: now },
          });
          if (intent.status === 'PENDING') {
            await tx.guardianEvent.create({
              data: {
                reportId: intent.reportId,
                revision: intent.revisionAtInit,
                actorId: 'SYSTEM_ORPHAN_SWEEPER',
                actorRole: 'SYSTEM',
                action: 'VIDEO_UPLOAD_EXPIRED',
                details: { intentId: intent.id },
              },
            });
          }
          return { path: intent.storagePath };
        },
        { timeout: 15000 },
      );

      if (!result) {
        summary.skipped++;
        continue;
      }
      summary.claimed++;
      if (dryRun) continue;
      try {
        await this.storage.removeGuardianAbandonedVideo(result.path);
        summary.deleted++;
      } catch {
        // Never log provider errors, path tokens or file names. The intent
        // remains CANCELED and retries after the bounded interval.
        summary.failed++;
      }
    }
    return summary;
  }
}
