import { Prisma } from '@prisma/client';

export type DurationTier = 'STANDARD' | 'WEEKLY' | 'MONTHLY';

export interface PricingOptions {
  city?: string;
  enableSeasonality?: boolean;
  enableDurationTiers?: boolean;
  enableWeekendSurge?: boolean;
}

export interface CalculatedRentalPrice {
  days: number;
  dailyBaseRate: Prisma.Decimal;
  effectiveDailyRate: Prisma.Decimal;
  durationTier: DurationTier;
  durationDiscountPercent: number;
  seasonalMultiplier: number;
  subtotalHt: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalPriceMad: Prisma.Decimal;
}

/**
 * High Season in Morocco: Peak Summer Tourism & Diaspora Return (July 1 - August 31).
 */
export function isMoroccanHighSeason(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed: 6 = July, 7 = August
  return month === 6 || month === 7;
}

/**
 * Checks if a date falls on a weekend day (Saturday = 6, Sunday = 0).
 */
export function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Production-grade Moroccan Automotive Rental Pricing Engine.
 *
 * Invariants:
 * 1. Strict Decimal arithmetic (never raw float operators).
 * 2. Moroccan 20% VAT is INCLUSIVE in the quoted customer price.
 * 3. All outputs rounded to exactly 2 decimal places.
 */
export class RentalPricingEngine {
  /**
   * Calculates rental price based on base price, duration, and optional seasonal parameters.
   */
  static calculate(
    pricePerDay: Prisma.Decimal | number | string,
    startDate: Date,
    endDate: Date,
    options: PricingOptions = {},
  ): CalculatedRentalPrice {
    const baseDailyRate = new Prisma.Decimal(pricePerDay).toDecimalPlaces(2);
    if (baseDailyRate.lt(0)) {
      throw new Error('Base daily rate cannot be negative');
    }

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    if (startMs >= endMs) {
      throw new Error('End date must be strictly after start date');
    }

    const diffMs = Math.abs(endMs - startMs);
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // 1. Duration Tier Discount
    let durationTier: DurationTier = 'STANDARD';
    let durationDiscountPercent = 0;
    let durationMultiplier = new Prisma.Decimal(1);

    if (options.enableDurationTiers !== false) {
      if (days >= 30) {
        durationTier = 'MONTHLY';
        durationDiscountPercent = 20; // 20% discount on long-term monthly rentals
        durationMultiplier = new Prisma.Decimal('0.80');
      } else if (days >= 7) {
        durationTier = 'WEEKLY';
        durationDiscountPercent = 10; // 10% discount on weekly rentals
        durationMultiplier = new Prisma.Decimal('0.90');
      }
    }

    // 2. Moroccan Seasonality Multiplier (July - August Summer Surge)
    let seasonalFactor = 1.0;
    if (options.enableSeasonality) {
      // Check if majority of rental spans high season
      const midPoint = new Date(startMs + diffMs / 2);
      if (isMoroccanHighSeason(midPoint)) {
        seasonalFactor = 1.20; // +20% peak summer surge
      }
    }
    const seasonalMultiplierDec = new Prisma.Decimal(seasonalFactor);

    // 3. Effective Daily Rate
    const effectiveDailyRate = baseDailyRate
      .times(durationMultiplier)
      .times(seasonalMultiplierDec)
      .toDecimalPlaces(2);

    // 4. Total Gross Price in MAD (Inclusive of 20% VAT)
    const totalPriceMad = effectiveDailyRate.times(days).toDecimalPlaces(2);

    // 5. Embedded 20% Moroccan VAT: gross × 20 / 120
    const taxAmount = totalPriceMad.times(20).dividedBy(120).toDecimalPlaces(2);
    const subtotalHt = totalPriceMad.minus(taxAmount).toDecimalPlaces(2);

    return {
      days,
      dailyBaseRate: baseDailyRate,
      effectiveDailyRate,
      durationTier,
      durationDiscountPercent,
      seasonalMultiplier: seasonalFactor,
      subtotalHt,
      taxAmount,
      totalPriceMad,
    };
  }
}
