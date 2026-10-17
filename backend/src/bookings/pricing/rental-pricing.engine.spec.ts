import { Prisma } from '@prisma/client';
import { RentalPricingEngine } from './rental-pricing.engine';

describe('RentalPricingEngine — Moroccan Automotive Seasonality & Rate Tiers', () => {
  it('calculates standard short-term rental (1–6 days) without duration discount', () => {
    const start = new Date('2026-03-10T10:00:00Z');
    const end = new Date('2026-03-13T10:00:00Z'); // 3 days
    const baseDailyRate = new Prisma.Decimal('400.00');

    const result = RentalPricingEngine.calculate(baseDailyRate, start, end);

    expect(result.days).toBe(3);
    expect(result.durationTier).toBe('STANDARD');
    expect(result.durationDiscountPercent).toBe(0);
    expect(result.effectiveDailyRate.toString()).toBe('400');
    expect(result.totalPriceMad.toString()).toBe('1200');
    // 20% inclusive VAT: 1200 * 20 / 120 = 200 MAD
    expect(result.taxAmount.toString()).toBe('200');
    // Subtotal HT: 1200 - 200 = 1000 MAD
    expect(result.subtotalHt.toString()).toBe('1000');
  });

  it('applies weekly tier 10% discount for rentals between 7 and 29 days', () => {
    const start = new Date('2026-04-01T10:00:00Z');
    const end = new Date('2026-04-08T10:00:00Z'); // 7 days
    const baseDailyRate = new Prisma.Decimal('500.00');

    const result = RentalPricingEngine.calculate(baseDailyRate, start, end);

    expect(result.days).toBe(7);
    expect(result.durationTier).toBe('WEEKLY');
    expect(result.durationDiscountPercent).toBe(10);
    // 500 * 0.90 = 450 MAD/day
    expect(result.effectiveDailyRate.toString()).toBe('450');
    // 450 * 7 = 3150 MAD
    expect(result.totalPriceMad.toString()).toBe('3150');
    // VAT: 3150 * 20 / 120 = 525 MAD
    expect(result.taxAmount.toString()).toBe('525');
    expect(result.subtotalHt.toString()).toBe('2625');
  });

  it('applies monthly tier 20% discount for rentals >= 30 days', () => {
    const start = new Date('2026-05-01T10:00:00Z');
    const end = new Date('2026-05-31T10:00:00Z'); // 30 days
    const baseDailyRate = new Prisma.Decimal('350.00');

    const result = RentalPricingEngine.calculate(baseDailyRate, start, end);

    expect(result.days).toBe(30);
    expect(result.durationTier).toBe('MONTHLY');
    expect(result.durationDiscountPercent).toBe(20);
    // 350 * 0.80 = 280 MAD/day
    expect(result.effectiveDailyRate.toString()).toBe('280');
    // 280 * 30 = 8400 MAD
    expect(result.totalPriceMad.toString()).toBe('8400');
    // VAT: 8400 * 20 / 120 = 1400 MAD
    expect(result.taxAmount.toString()).toBe('1400');
  });

  it('applies Moroccan Summer High Season (+20% surge) in July/August', () => {
    const start = new Date('2026-07-10T10:00:00Z');
    const end = new Date('2026-07-15T10:00:00Z'); // 5 days in peak July
    const baseDailyRate = new Prisma.Decimal('400.00');

    const result = RentalPricingEngine.calculate(baseDailyRate, start, end, {
      enableSeasonality: true,
    });

    expect(result.days).toBe(5);
    expect(result.seasonalMultiplier).toBe(1.2);
    // 400 * 1.20 = 480 MAD/day
    expect(result.effectiveDailyRate.toString()).toBe('480');
    // 480 * 5 = 2400 MAD
    expect(result.totalPriceMad.toString()).toBe('2400');
    // VAT: 2400 * 20 / 120 = 400 MAD
    expect(result.taxAmount.toString()).toBe('400');
  });

  it('combines duration tier discount with summer seasonality cleanly in Decimal space', () => {
    const start = new Date('2026-07-01T10:00:00Z');
    const end = new Date('2026-07-15T10:00:00Z'); // 14 days (Weekly tier + Peak summer)
    const baseDailyRate = new Prisma.Decimal('600.00');

    const result = RentalPricingEngine.calculate(baseDailyRate, start, end, {
      enableSeasonality: true,
    });

    expect(result.days).toBe(14);
    expect(result.durationTier).toBe('WEEKLY');
    // 600 * 0.90 * 1.20 = 648 MAD/day
    expect(result.effectiveDailyRate.toString()).toBe('648');
    // 648 * 14 = 9072 MAD
    expect(result.totalPriceMad.toString()).toBe('9072');
  });

  it('preserves exact Decimal arithmetic under odd daily rates without float drift', () => {
    const start = new Date('2026-09-01T10:00:00Z');
    const end = new Date('2026-09-04T10:00:00Z'); // 3 days
    const baseDailyRate = new Prisma.Decimal('333.33');

    const result = RentalPricingEngine.calculate(baseDailyRate, start, end);

    // 333.33 * 3 = 999.99 (NEVER 999.9900000000001)
    expect(result.totalPriceMad.toString()).toBe('999.99');
    // VAT: 999.99 * 20 / 120 = 166.665 -> rounds to 166.67 MAD
    expect(result.taxAmount.toString()).toBe('166.67');
  });

  it('rejects invalid inputs with descriptive errors', () => {
    const start = new Date('2026-05-10T10:00:00Z');
    const end = new Date('2026-05-09T10:00:00Z'); // end before start

    expect(() => RentalPricingEngine.calculate('400', start, end)).toThrow(
      'End date must be strictly after start date',
    );

    expect(() =>
      RentalPricingEngine.calculate('-100', start, new Date('2026-05-12T10:00:00Z')),
    ).toThrow('Base daily rate cannot be negative');
  });
});
