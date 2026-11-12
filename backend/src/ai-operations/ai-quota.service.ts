import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type AiQuotaBucket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiGovernanceService } from './ai-governance.service';

/**
 * Internal-only future provider usage admission ledger.
 *
 * Do NOT expose reserve/commit/release as HTTP endpoints. There is no model
 * connector or agency-supplied spend endpoint. In the real application the
 * governance service always returns effectiveEnabled=false until an approved
 * provider adapter, atomic budget policy and privacy review are complete.
 */
@Injectable()
export class AiQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governance: AiGovernanceService,
  ) {}

  private validateAgency(agencyId: string) {
    if (typeof agencyId !== 'string' || !agencyId.trim())
      throw new ForbiddenException('A verified agency is required.');
  }

  private validateKey(key: string) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_.:-]{8,128}$/.test(key))
      throw new ConflictException('A stable, opaque request key is required.');
  }

  private validateCost(value: number) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000)
      throw new ConflictException('Invalid USD micro-unit cost.');
  }

  private monthOf(now: Date) {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
      throw new ConflictException('Invalid UTC timestamp.');
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  /**
   * An upsert that always increments lockVersion obtains PostgreSQL's
   * row-exclusive lock, held until the transaction ends. All mutations for
   * one (agency, month) lock the same row before reading/modifying counters.
   */
  private async lockMonth(
    tx: Prisma.TransactionClient,
    agencyId: string,
    periodStart: Date,
  ): Promise<AiQuotaBucket> {
    return tx.aiQuotaBucket.upsert({
      where: { agencyId_periodStart: { agencyId, periodStart } },
      create: { agencyId, periodStart, lockVersion: 1 },
      update: { lockVersion: { increment: 1 } },
    });
  }

  private checkCounters(bucket: AiQuotaBucket) {
    for (const n of [
      bucket.heldRequests,
      bucket.committedRequests,
      bucket.heldCostUsdMicros,
      bucket.committedCostUsdMicros,
    ]) {
      if (!Number.isSafeInteger(n) || n < 0)
        throw new ConflictException('Quota ledger out of balance.');
    }
  }

  /** Sweep expired holds under the same monthly row lock. */
  private async expireLocked(
    tx: Prisma.TransactionClient,
    agencyId: string,
    periodStart: Date,
    now: Date,
    locked: AiQuotaBucket,
  ) {
    const expired = await tx.aiQuotaReservation.findMany({
      where: { agencyId, periodStart, status: 'RESERVED', expiresAt: { lte: now } },
      select: { id: true, estimatedCostUsdMicros: true },
    });
    if (expired.length === 0) return locked;
    const releasedCost = expired.reduce((sum, item) => sum + item.estimatedCostUsdMicros, 0);
    if (expired.length > locked.heldRequests || releasedCost > locked.heldCostUsdMicros)
      throw new ConflictException('Quota counters need operator reconciliation.');
    const changed = await tx.aiQuotaReservation.updateMany({
      where: { id: { in: expired.map((entry) => entry.id) }, agencyId, status: 'RESERVED' },
      data: { status: 'EXPIRED', settledAt: now },
    });
    if (changed.count !== expired.length)
      throw new ConflictException('Concurrent quota hold changes require reconciliation.');
    return tx.aiQuotaBucket.update({
      where: { agencyId_periodStart: { agencyId, periodStart } },
      data: {
        heldRequests: { decrement: expired.length },
        heldCostUsdMicros: { decrement: releasedCost },
      },
    });
  }

  private async transactionWithRetry<T>(
    job: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(job, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 8000,
          timeout: 15000,
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        // Concurrent first-time month inserts or transient deadlocks can be
        // retried safely because all writes are transactional and idempotent.
        if ((code === 'P2002' || code === 'P2034') && attempt < 2) continue;
        throw err;
      }
    }
    throw new ConflictException('Quota ledger unavailable.');
  }

  /** Existing persistent records only. No simulated usage or database writes. */
  async getSummary(agencyId: string, now = new Date()) {
    this.validateAgency(agencyId);
    const periodStart = this.monthOf(now);
    const nextPeriodStart = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth() + 1, 1,
    ));
    const [bucket, settings] = await Promise.all([
      this.prisma.aiQuotaBucket.findUnique({
        where: { agencyId_periodStart: { agencyId, periodStart } },
      }),
      this.prisma.agencyAiSettings.findUnique({
        where: { agencyId },
        select: { monthlyBudgetUsdCents: true, monthlyRequestLimit: true },
      }),
    ]);
    return {
      periodStart: periodStart.toISOString(),
      periodEndExclusive: nextPeriodStart.toISOString(),
      currency: 'USD' as const,
      costUnit: 'USD_MICROS' as const,
      monthlyRequestLimit: settings?.monthlyRequestLimit ?? 0,
      monthlyBudgetUsdMicros: (settings?.monthlyBudgetUsdCents ?? 0) * 10_000,
      heldRequests: bucket?.heldRequests ?? 0,
      committedRequests: bucket?.committedRequests ?? 0,
      heldCostUsdMicros: bucket?.heldCostUsdMicros ?? 0,
      committedCostUsdMicros: bucket?.committedCostUsdMicros ?? 0,
      providerIntegrationReady: false,
      spendEnabled: false,
      note: 'Internal quota accounting only: no provider is connected or permitted to bill.',
    };
  }

  /**
   * Reserve a bounded hypothetical inference cost. The production policy is
   * OFF until separately reviewed provider integration is added. Unit tests
   * can inject a synthetic enabled governance stub to verify quota arithmetic.
   */
  async reserveInternal(
    agencyId: string,
    requestKey: string,
    estimatedCostUsdMicros: number,
    now = new Date(),
  ) {
    this.validateAgency(agencyId);
    this.validateKey(requestKey);
    this.validateCost(estimatedCostUsdMicros);
    if (estimatedCostUsdMicros === 0)
      throw new ConflictException('A positive cost reservation is required.');
    const periodStart = this.monthOf(now);

    // The actual governance service is hard-disabled until a provider review.
    const eligibility = await this.governance.getSettings(agencyId);
    if (!eligibility.effectiveEnabled)
      throw new ForbiddenException('AI provider use is not enabled.');

    return this.transactionWithRetry(async (tx) => {
      let bucket = await this.lockMonth(tx, agencyId, periodStart);
      this.checkCounters(bucket);
      const [settings, policy, agency] = await Promise.all([
        tx.agencyAiSettings.findUnique({ where: { agencyId } }),
        tx.aiPlatformPolicy.findUnique({ where: { id: 'GLOBAL' } }),
        tx.agency.findFirst({
          where: { id: agencyId, status: 'ACTIVE', deletedAt: null },
          select: { id: true },
        }),
      ]);
      if (
        !agency || !settings ||
        settings.revision !== eligibility.revision ||
        !settings.requestedEnabled || !settings.platformApproved ||
        !policy || policy.emergencyDisabled ||
        !Number.isSafeInteger(settings.monthlyBudgetUsdCents) ||
        !Number.isSafeInteger(settings.monthlyRequestLimit) ||
        settings.monthlyRequestLimit <= 0 ||
        settings.monthlyBudgetUsdCents <= 0
      ) throw new ForbiddenException('AI quota policy is not approved.');

      bucket = await this.expireLocked(tx, agencyId, periodStart, now, bucket);
      const existing = await tx.aiQuotaReservation.findUnique({
        where: { agencyId_requestKey: { agencyId, requestKey } },
      });
      if (existing) {
        if (existing.estimatedCostUsdMicros !== estimatedCostUsdMicros)
          throw new ConflictException('Request key was already used with a different estimate.');
        return existing; // Retry is idempotent; terminal keys cannot re-enter.
      }

      const budget = settings.monthlyBudgetUsdCents * 10_000;
      if (
        bucket.heldRequests + bucket.committedRequests >= settings.monthlyRequestLimit ||
        bucket.heldCostUsdMicros + bucket.committedCostUsdMicros + estimatedCostUsdMicros > budget
      ) throw new ForbiddenException('Agency AI request or budget cap reached.');

      const newHold = await tx.aiQuotaReservation.create({
        data: {
          agencyId,
          requestKey,
          periodStart,
          status: 'RESERVED',
          estimatedCostUsdMicros,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        },
      });
      await tx.aiQuotaBucket.update({
        where: { agencyId_periodStart: { agencyId, periodStart } },
        data: {
          heldRequests: { increment: 1 },
          heldCostUsdMicros: { increment: estimatedCostUsdMicros },
        },
      });
      return newHold;
    });
  }

  /**
   * Cancel a hold safely; cannot refund a committed provider charge.
   * No public endpoint uses this method.
   */
  async releaseInternal(agencyId: string, requestKey: string, now = new Date()) {
    this.validateAgency(agencyId);
    this.validateKey(requestKey);
    this.monthOf(now);
    const existing = await this.prisma.aiQuotaReservation.findUnique({
      where: { agencyId_requestKey: { agencyId, requestKey } },
      select: { periodStart: true },
    });
    if (!existing) throw new NotFoundException('Quota reservation not found.');
    return this.transactionWithRetry(async (tx) => {
      const bucket = await this.lockMonth(tx, agencyId, existing.periodStart);
      this.checkCounters(bucket);
      const hold = await tx.aiQuotaReservation.findUnique({
        where: { agencyId_requestKey: { agencyId, requestKey } },
      });
      if (!hold) throw new NotFoundException('Quota reservation not found.');
      if (hold.status === 'COMMITTED')
        throw new ConflictException('Committed provider usage cannot be released.');
      if (hold.status !== 'RESERVED') return hold;
      if (bucket.heldRequests < 1 ||
          bucket.heldCostUsdMicros < hold.estimatedCostUsdMicros)
        throw new ConflictException('Quota ledger out of balance.');

      const released = await tx.aiQuotaReservation.update({
        where: { id: hold.id },
        data: { status: 'RELEASED', settledAt: now },
      });
      await tx.aiQuotaBucket.update({
        where: { agencyId_periodStart: { agencyId, periodStart: hold.periodStart } },
        data: {
          heldRequests: { decrement: 1 },
          heldCostUsdMicros: { decrement: hold.estimatedCostUsdMicros },
        },
      });
      return released;
    });
  }

  /**
   * Internal future provider-settlement API; NOT connected to a provider yet.
   * A provider adapter must verify actual usage and keep actual cost within
   * the reserved maximum output/token envelope before invoking this method.
   */
  async commitVerifiedInternal(
    agencyId: string,
    requestKey: string,
    result: {
      provider: string;
      model: string;
      actualCostUsdMicros: number;
      inputTokens: number;
      outputTokens: number;
    },
    now = new Date(),
  ) {
    this.validateAgency(agencyId);
    this.validateKey(requestKey);
    this.monthOf(now);
    this.validateCost(result?.actualCostUsdMicros);
    if (
      !result || typeof result.provider !== 'string' ||
      !/^[a-zA-Z0-9_.-]{2,100}$/.test(result.provider) ||
      typeof result.model !== 'string' ||
      !/^[a-zA-Z0-9_.:/-]{2,100}$/.test(result.model) ||
      !Number.isSafeInteger(result.inputTokens) ||
      result.inputTokens < 0 || result.inputTokens > 2_147_483_647 ||
      !Number.isSafeInteger(result.outputTokens) ||
      result.outputTokens < 0 || result.outputTokens > 2_147_483_647
    ) throw new ConflictException('Invalid provider usage evidence.');

    const found = await this.prisma.aiQuotaReservation.findUnique({
      where: { agencyId_requestKey: { agencyId, requestKey } },
      select: { periodStart: true },
    });
    if (!found) throw new NotFoundException('Quota reservation not found.');
    return this.transactionWithRetry(async (tx) => {
      const bucket = await this.lockMonth(tx, agencyId, found.periodStart);
      this.checkCounters(bucket);
      const hold = await tx.aiQuotaReservation.findUnique({
        where: { agencyId_requestKey: { agencyId, requestKey } },
      });
      if (!hold) throw new NotFoundException('Quota reservation not found.');
      const prior = await tx.aiUsageRecord.findUnique({
        where: { agencyId_requestKey: { agencyId, requestKey } },
      });
      if (hold.status === 'COMMITTED') {
        if (
          !prior || prior.provider !== result.provider || prior.model !== result.model ||
          prior.costUsdMicros !== result.actualCostUsdMicros ||
          prior.inputTokens !== result.inputTokens ||
          prior.outputTokens !== result.outputTokens
        ) throw new ConflictException('Conflicting usage settlement for an existing request key.');
        return { reservation: hold, usage: prior };
      }
      if (hold.status !== 'RESERVED' || hold.expiresAt <= now)
        throw new ConflictException('Reservation expired or was already released; manual reconciliation required.');
      // The current AiUsageRecord table groups usage by createdAt. Do not
      // misattribute a late receipt to the next UTC month until period-aware
      // reconciliation and provider billing semantics are implemented.
      if (this.monthOf(now).getTime() !== hold.periodStart.getTime())
        throw new ConflictException('Cross-month provider settlement needs manual reconciliation.');
      if (result.actualCostUsdMicros > hold.estimatedCostUsdMicros)
        throw new ConflictException('Provider cost exceeds reserved budget; manual reconciliation required.');
      if (bucket.heldRequests < 1 ||
          bucket.heldCostUsdMicros < hold.estimatedCostUsdMicros)
        throw new ConflictException('Quota ledger out of balance.');

      const reservation = await tx.aiQuotaReservation.update({
        where: { id: hold.id },
        data: {
          status: 'COMMITTED',
          settledAt: now,
          committedCostUsdMicros: result.actualCostUsdMicros,
        },
      });
      const usage = await tx.aiUsageRecord.create({
        data: {
          agencyId, requestKey, provider: result.provider, model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsdMicros: result.actualCostUsdMicros,
          status: 'COMPLETED',
        },
      });
      await tx.aiQuotaBucket.update({
        where: { agencyId_periodStart: { agencyId, periodStart: hold.periodStart } },
        data: {
          heldRequests: { decrement: 1 },
          heldCostUsdMicros: { decrement: hold.estimatedCostUsdMicros },
          committedRequests: { increment: 1 },
          committedCostUsdMicros: { increment: result.actualCostUsdMicros },
        },
      });
      return { reservation, usage };
    });
  }
}
