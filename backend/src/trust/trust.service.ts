import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, CreateBlacklistDto } from './dto/trust.dto';

const POSITIVE_TAGS = new Set([
  'PERFECT_RENTER',
  'EARLY_RETURN',
  'POLITE',
  'REPEAT_CLIENT',
  'CLEAN_RETURN',
]);

// The four booking-flow states the Risk Assessment panel renders.
export type RiskStatus = 'TRUSTED' | 'CAUTION' | 'BLACKLISTED' | 'NEW';

@Injectable()
export class TrustService {
  constructor(private prisma: PrismaService) {}

  // ── Identity hashing ────────────────────────────────────────────────
  // The keyed pepper is the HMAC secret: it keeps the derived hash
  // unguessable and un-rainbow-tableable even though a CIN is low-entropy.
  // The raw ID number never leaves its owning tenant; only this hash is
  // matched across agencies. FAIL FAST — never silently fall back to a
  // hardcoded/default pepper, which would make every hash forgeable.
  private get pepper(): string {
    const p = process.env.IDENTITY_PEPPER;
    if (!p || p.trim() === '') {
      throw new Error(
        'IDENTITY_PEPPER is not set. Refusing to derive renter identity hashes ' +
          'without a keyed pepper — set IDENTITY_PEPPER before starting the service.',
      );
    }
    return p;
  }

  private normalize(type: string, number: string): string {
    const t = (type || 'CIN').toUpperCase().trim();
    const n = (number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${t}:${n}`;
  }

  private hashIdentity(type: string, number: string): string {
    // Keyed derivation: HMAC-SHA256(pepper, normalizedIdentity). Deterministic
    // (required for cross-agency equality matching) but not brute-forceable
    // without the secret pepper, unlike the previous bare SHA-256(CIN).
    return createHmac('sha256', this.pepper)
      .update(this.normalize(type, number))
      .digest('hex');
  }

  private mask(number: string): string {
    const n = (number || '').replace(/\s/g, '');
    if (n.length <= 2) return '••';
    return `${n[0]}••••${n.slice(-2)}`;
  }

  // ── Identity resolution ─────────────────────────────────────────────
  /** Find-or-create the global identity for a tenant customer and link it. */
  async resolveIdentityForCustomer(customer: {
    id: string;
    identityType: string;
    identityNumber: string;
    renterIdentityId?: string | null;
  }) {
    if (customer.renterIdentityId) {
      const existing = await this.prisma.renterIdentity.findUnique({
        where: { id: customer.renterIdentityId },
      });
      if (existing) return existing;
    }

    const identityHash = this.hashIdentity(
      customer.identityType,
      customer.identityNumber,
    );
    let identity = await this.prisma.renterIdentity.findUnique({
      where: { identityHash },
    });
    if (!identity) {
      identity = await this.prisma.renterIdentity.create({
        data: {
          identityHash,
          identityType: (customer.identityType || 'CIN').toUpperCase(),
          identityMasked: this.mask(customer.identityNumber),
        },
      });
    }
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { renterIdentityId: identity.id },
    });
    return identity;
  }

  // ── Aggregate recomputation ─────────────────────────────────────────
  /** Recency-weighted score + risk level, cached on the identity row. */
  async recompute(identityId: string) {
    const [reviews, activeFlags] = await Promise.all([
      this.prisma.renterReview.findMany({
        where: { identityId, status: 'PUBLISHED' },
      }),
      this.prisma.blacklistEntry.findMany({
        where: { identityId, status: 'ACTIVE' },
      }),
    ]);

    const now = Date.now();
    const HALF_LIFE_MS = 365 * 24 * 3600 * 1000; // ~12 months
    let wsum = 0;
    let wtot = 0;
    for (const r of reviews) {
      const ageMs = now - new Date(r.createdAt).getTime();
      const w = Math.pow(0.5, Math.max(0, ageMs) / HALF_LIFE_MS);
      wsum += r.rating * w;
      wtot += w;
    }
    const globalScore = wtot > 0 ? +(wsum / wtot).toFixed(2) : 0;

    const riskLevel = this.deriveRiskLevel(
      reviews.length,
      globalScore,
      activeFlags,
    );

    await this.prisma.renterIdentity.update({
      where: { id: identityId },
      data: {
        globalScore,
        reviewCount: reviews.length,
        activeFlagCount: activeFlags.length,
        riskLevel,
        lastReviewAt: reviews.length
          ? reviews.reduce(
              (max, r) =>
                new Date(r.createdAt) > max ? new Date(r.createdAt) : max,
              new Date(0),
            )
          : undefined,
      },
    });
    return riskLevel;
  }

  private deriveRiskLevel(
    reviewCount: number,
    score: number,
    activeFlags: { severity: string }[],
  ): string {
    if (activeFlags.length > 0) return 'CRITICAL';
    if (reviewCount === 0) return 'UNKNOWN';
    if (score >= 4.2) return 'TRUSTED';
    if (score >= 3.5) return 'LOW';
    if (score >= 2.5) return 'MEDIUM';
    return 'HIGH';
  }

  private statusFromRisk(riskLevel: string, reviewCount: number): RiskStatus {
    if (riskLevel === 'CRITICAL') return 'BLACKLISTED';
    if (riskLevel === 'UNKNOWN' || reviewCount === 0) return 'NEW';
    if (riskLevel === 'TRUSTED') return 'TRUSTED';
    return 'CAUTION';
  }

  // A CRITICAL/HIGH active flag hard-blocks booking; MEDIUM is caution-only.
  private isHardBlock(activeFlags: { severity: string }[]): boolean {
    return activeFlags.some(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
    );
  }

  // ── The booking-flow assessment ─────────────────────────────────────
  async assess(agencyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, agencyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const identity = await this.resolveIdentityForCustomer(customer);

    const [reviews, activeFlags] = await Promise.all([
      this.prisma.renterReview.findMany({
        where: { identityId: identity.id, status: 'PUBLISHED' },
        include: { agency: { select: { name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blacklistEntry.findMany({
        where: { identityId: identity.id, status: 'ACTIVE' },
        include: { agency: { select: { name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Keep the cached aggregates honest on every assessment.
    await this.recompute(identity.id);
    const fresh = await this.prisma.renterIdentity.findUnique({
      where: { id: identity.id },
    });

    const status = this.statusFromRisk(
      fresh!.riskLevel,
      fresh!.reviewCount,
    );
    const hardBlock = this.isHardBlock(activeFlags);

    // Tag histogram across all reviews.
    const tagCounts: Record<string, number> = {};
    for (const r of reviews) {
      let parsed: string[] = [];
      try {
        parsed = JSON.parse(r.tags || '[]');
      } catch {
        parsed = [];
      }
      for (const t of parsed) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    const tags = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        sentiment: POSITIVE_TAGS.has(tag) ? 'pos' : 'neg',
      }))
      .sort((a, b) => b.count - a.count);

    // Last 12 rentals as a good/warn/bad strip (most recent last).
    const history = reviews
      .slice(0, 12)
      .reverse()
      .map((r) => (r.rating >= 4 ? 'good' : r.rating === 3 ? 'warn' : 'bad'));

    const agencyCount = new Set(reviews.map((r) => r.agencyId)).size;
    const depositMultiplier =
      status === 'BLACKLISTED'
        ? null
        : status === 'CAUTION'
        ? 1.5
        : 1.0;

    return {
      identity: {
        masked: `${identity.identityType} ${identity.identityMasked}`,
        type: identity.identityType,
      },
      status,
      riskLevel: fresh!.riskLevel,
      blocked: hardBlock,
      globalScore: fresh!.globalScore,
      reviewCount: fresh!.reviewCount,
      agencyCount,
      activeFlagCount: activeFlags.length,
      depositMultiplier,
      recommendation: this.recommendation(status),
      tags,
      history,
      flags: activeFlags.map((f) => ({
        id: f.id,
        reason: f.reason,
        severity: f.severity,
        details: f.details,
        agencyName: f.agency?.name ?? 'Unknown agency',
        agencyCity: f.agency?.city ?? '',
        createdAt: f.createdAt,
        evidenceCount: this.safeLen(f.evidenceUrls),
      })),
      latestReview: reviews[0]
        ? {
            rating: reviews[0].rating,
            comment: reviews[0].comment,
            agencyName: reviews[0].agency?.name ?? 'Agency',
            agencyCity: reviews[0].agency?.city ?? '',
            createdAt: reviews[0].createdAt,
          }
        : null,
    };
  }

  private safeLen(json: string): number {
    try {
      return JSON.parse(json || '[]').length;
    } catch {
      return 0;
    }
  }

  private recommendation(status: RiskStatus): string {
    switch (status) {
      case 'TRUSTED':
        return 'Standard deposit. Verified across the network.';
      case 'CAUTION':
        return 'Proceed with a 1.5× security deposit and a documented pre-rental inspection.';
      case 'BLACKLISTED':
        return 'Booking hard-locked by an active network flag. Manager override required.';
      case 'NEW':
      default:
        return 'No network history. Full deposit, scan ID into the Trust Vault, photo inspection.';
    }
  }

  // ── Enforcement hook (called from BookingsService.create) ───────────
  /** Returns the blocking flag if this customer must not be booked. */
  async blockingFlagForCustomer(agencyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, agencyId },
    });
    if (!customer) return null;
    const identity = await this.resolveIdentityForCustomer(customer);
    const flags = await this.prisma.blacklistEntry.findMany({
      where: { identityId: identity.id, status: 'ACTIVE' },
      include: { agency: { select: { name: true, city: true } } },
    });
    if (!this.isHardBlock(flags)) return null;
    return (
      flags.find((f) => f.severity === 'CRITICAL') ??
      flags.find((f) => f.severity === 'HIGH') ??
      null
    );
  }

  // ── Reviews ─────────────────────────────────────────────────────────
  async createReview(agencyId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, agencyId },
      include: { customer: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'A renter can only be reviewed after the booking is completed.',
      );
    }
    const existing = await this.prisma.renterReview.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {
      throw new ConflictException('This booking has already been reviewed.');
    }

    const identity = await this.resolveIdentityForCustomer(booking.customer);
    const review = await this.prisma.renterReview.create({
      data: {
        rating: dto.rating,
        tags: JSON.stringify(dto.tags ?? []),
        comment: dto.comment,
        identityId: identity.id,
        bookingId: dto.bookingId,
        agencyId,
      },
    });
    await this.recompute(identity.id);
    return review;
  }

  // ── Blacklist ───────────────────────────────────────────────────────
  async createBlacklistEntry(agencyId: string, dto: CreateBlacklistDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, agencyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const identity = await this.resolveIdentityForCustomer(customer);

    const entry = await this.prisma.blacklistEntry.create({
      data: {
        reason: dto.reason,
        severity: dto.severity,
        details: dto.details,
        evidenceUrls: JSON.stringify(dto.evidenceUrls ?? []),
        identityId: identity.id,
        agencyId,
        bookingId: dto.bookingId,
      },
    });
    // Mirror onto the tenant customer for the local CRM view.
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { status: 'BLACKLISTED' },
    });
    await this.recompute(identity.id);
    return entry;
  }

  async liftBlacklistEntry(agencyId: string, entryId: string, note?: string) {
    const entry = await this.prisma.blacklistEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Blacklist entry not found');
    if (entry.agencyId !== agencyId) {
      throw new ForbiddenException(
        'Only the agency that filed this entry can lift it.',
      );
    }
    const updated = await this.prisma.blacklistEntry.update({
      where: { id: entryId },
      data: { status: 'LIFTED', liftedAt: new Date(), liftNote: note },
    });
    await this.recompute(entry.identityId);
    return updated;
  }

  /** Cross-tenant network feed of active flags (masked identity, agency name only). */
  async listBlacklist(_agencyId: string) {
    const entries = await this.prisma.blacklistEntry.findMany({
      where: { status: 'ACTIVE' },
      include: {
        agency: { select: { name: true, city: true } },
        identity: {
          select: { identityMasked: true, identityType: true, globalScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return entries.map((e) => ({
      id: e.id,
      reason: e.reason,
      severity: e.severity,
      details: e.details,
      status: e.status,
      identity: `${e.identity.identityType} ${e.identity.identityMasked}`,
      reportedBy: e.agency?.name ?? 'Agency',
      reportedCity: e.agency?.city ?? '',
      createdAt: e.createdAt,
    }));
  }

  // ── Backfill (one-off) ──────────────────────────────────────────────
  async backfillIdentities() {
    const customers = await this.prisma.customer.findMany({
      where: { renterIdentityId: null },
    });
    let linked = 0;
    for (const c of customers) {
      await this.resolveIdentityForCustomer(c);
      linked++;
    }
    return { linked, total: customers.length };
  }
}
