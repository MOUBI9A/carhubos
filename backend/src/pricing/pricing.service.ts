import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Rate-tier pricing engine.
 *
 * Moves price on the three axes the founder asked for — WHEN (season),
 * HOW LONG (duration), WHAT (vehicle class) — on top of `Car.pricePerDay`,
 * which remains the base. An agency with no rules gets exactly the previous
 * behaviour (`pricePerDay × days`), so this is safe to ship dark.
 *
 * TWO DESIGN DECISIONS THAT MATTER, both about correctness rather than taste:
 *
 * 1. **Seasonal rules are applied PER DAY, not once per booking.** A rental
 *    that runs 28 Jul → 4 Aug straddles a season boundary. Picking a single
 *    rule for the whole booking would have to pick by start date (so a renter
 *    books one day early and gets the whole peak week at low-season rates) or
 *    by end date (equally arbitrary). Pricing each day on its own date is the
 *    only version that can't be gamed and that an operator can explain to a
 *    customer line by line.
 *
 * 2. **Overlapping seasonal rules do NOT stack.** Exactly one wins per day
 *    (priority, then specificity car > class > agency-wide, then id for
 *    determinism). Stacking is a footgun: two innocent-looking +20% rules
 *    silently become +44%, and nobody notices until a customer disputes an
 *    invoice. One rule per day is explainable; compounded percentages are not.
 *
 * Duration is different in kind — it is a property of the whole rental, not
 * of any one day — so it is applied ONCE to the subtotal, after the per-day
 * pass.
 *
 * MONEY DISCIPLINE (CLAUDE.md §5.3): every arithmetic step below stays in
 * Prisma.Decimal. Daily rates are rounded to 2dp individually because a daily
 * rate is itself a price the customer is quoted and the invoice shows — so
 * "3 × 450.00 = 1350.00" is literally true rather than a rounded-at-the-end
 * approximation that doesn't reconcile against the line items.
 */

export type RateRuleRow = {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  priority: number;
  vehicleClass: string | null;
  carId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  minDays: number | null;
  maxDays: number | null;
  adjustmentType: string;
  adjustmentValue: Prisma.Decimal;
};

/** One priced day of the rental, kept so the UI/invoice can show its work. */
export interface QuoteDay {
  date: string; // YYYY-MM-DD
  rate: Prisma.Decimal;
  appliedRuleId: string | null;
  appliedRuleName: string | null;
}

export interface Quote {
  days: number;
  baseDailyRate: Prisma.Decimal;
  /** Sum of the per-day rates, before any duration adjustment. */
  subtotal: Prisma.Decimal;
  durationRuleId: string | null;
  durationRuleName: string | null;
  /** Signed: negative for a discount. subtotal + durationAdjustment = total. */
  durationAdjustment: Prisma.Decimal;
  total: Prisma.Decimal;
  breakdown: QuoteDay[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** UTC calendar day key — avoids the host timezone shifting a season edge. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Midnight UTC for the calendar day `d` falls on. */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Whole rental length in days, matching the existing booking maths
   * (`ceil` of the span) so this engine can't silently change day counts.
   */
  static rentalDays(start: Date, end: Date): number {
    return Math.max(
      1,
      Math.ceil(Math.abs(end.getTime() - start.getTime()) / MS_PER_DAY),
    );
  }

  /**
   * Does a rule's scope cover this car? A null field means "any", so an
   * agency-wide rule (all nulls) matches everything.
   */
  private scopeMatches(
    rule: RateRuleRow,
    car: { id: string; vehicleClass: string | null },
  ): boolean {
    if (rule.carId && rule.carId !== car.id) return false;
    if (rule.vehicleClass && rule.vehicleClass !== car.vehicleClass) {
      return false;
    }
    return true;
  }

  /** More specific = wins a priority tie. car (2) > class (1) > agency (0). */
  private specificity(rule: RateRuleRow): number {
    if (rule.carId) return 2;
    if (rule.vehicleClass) return 1;
    return 0;
  }

  /**
   * Picks at most one winner from the candidates. Deterministic all the way
   * down — falling back to `id` means the same inputs always price the same,
   * which matters when a customer re-opens a quote.
   */
  private pickWinner(candidates: RateRuleRow[]): RateRuleRow | null {
    if (candidates.length === 0) return null;
    return candidates.reduce((best, r) => {
      if (r.priority !== best.priority) return r.priority > best.priority ? r : best;
      const rs = this.specificity(r);
      const bs = this.specificity(best);
      if (rs !== bs) return rs > bs ? r : best;
      return r.id < best.id ? r : best;
    });
  }

  /** Applies one rule to a daily rate. FIXED_DAILY replaces; PERCENT scales. */
  private applyToDailyRate(
    base: Prisma.Decimal,
    rule: RateRuleRow,
  ): Prisma.Decimal {
    const next =
      rule.adjustmentType === 'FIXED_DAILY'
        ? rule.adjustmentValue
        : base.times(new Prisma.Decimal(100).plus(rule.adjustmentValue)).dividedBy(100);
    // A rule must never produce a negative price — a -150% typo would
    // otherwise hand the customer money.
    const clamped = next.lessThan(0) ? new Prisma.Decimal(0) : next;
    return clamped.toDecimalPlaces(2);
  }

  /**
   * Price a rental. Pure given its inputs — the rules are passed in rather
   * than fetched, so this is directly unit-testable and callable inside a
   * transaction without a nested query.
   */
  quoteWithRules(
    car: { id: string; vehicleClass: string | null; pricePerDay: Prisma.Decimal },
    start: Date,
    end: Date,
    rules: RateRuleRow[],
  ): Quote {
    const days = PricingService.rentalDays(start, end);
    const active = rules.filter((r) => r.active && this.scopeMatches(r, car));

    const seasonal = active.filter((r) => r.kind === 'SEASONAL');
    const duration = active.filter((r) => r.kind === 'DURATION');

    // ── Per-day pass ────────────────────────────────────────────────
    const breakdown: QuoteDay[] = [];
    let subtotal = new Prisma.Decimal(0);
    const firstDay = startOfUtcDay(start);

    for (let i = 0; i < days; i++) {
      const day = new Date(firstDay.getTime() + i * MS_PER_DAY);
      const matches = seasonal.filter((r) => {
        // Inclusive window; a null bound means open-ended on that side.
        if (r.startDate && day < startOfUtcDay(r.startDate)) return false;
        if (r.endDate && day > startOfUtcDay(r.endDate)) return false;
        return true;
      });
      const winner = this.pickWinner(matches);
      const rate = winner
        ? this.applyToDailyRate(car.pricePerDay, winner)
        : car.pricePerDay.toDecimalPlaces(2);

      breakdown.push({
        date: dayKey(day),
        rate,
        appliedRuleId: winner?.id ?? null,
        appliedRuleName: winner?.name ?? null,
      });
      subtotal = subtotal.plus(rate);
    }

    // ── Duration pass (once, on the subtotal) ───────────────────────
    const durationMatches = duration.filter((r) => {
      if (r.minDays !== null && days < r.minDays) return false;
      if (r.maxDays !== null && days > r.maxDays) return false;
      return true;
    });
    const durationRule = this.pickWinner(durationMatches);

    let total = subtotal;
    if (durationRule) {
      total =
        durationRule.adjustmentType === 'FIXED_DAILY'
          ? // A FIXED_DAILY duration rule sets the effective daily rate for
            // the whole rental — "7+ days: 400/day flat" — which is how
            // agencies actually quote weekly deals.
            durationRule.adjustmentValue.toDecimalPlaces(2).times(days)
          : subtotal
              .times(new Prisma.Decimal(100).plus(durationRule.adjustmentValue))
              .dividedBy(100);
      if (total.lessThan(0)) total = new Prisma.Decimal(0);
    }
    total = total.toDecimalPlaces(2);

    return {
      days,
      baseDailyRate: car.pricePerDay.toDecimalPlaces(2),
      subtotal: subtotal.toDecimalPlaces(2),
      durationRuleId: durationRule?.id ?? null,
      durationRuleName: durationRule?.name ?? null,
      durationAdjustment: total.minus(subtotal).toDecimalPlaces(2),
      total,
      breakdown,
    };
  }

  /** Fetch this agency's active rules and price the rental. */
  async quote(
    agencyId: string,
    car: { id: string; vehicleClass: string | null; pricePerDay: Prisma.Decimal },
    start: Date,
    end: Date,
  ): Promise<Quote> {
    const rules = await this.prisma.rateRule.findMany({
      where: { agencyId, active: true },
    });
    return this.quoteWithRules(car, start, end, rules);
  }
}
