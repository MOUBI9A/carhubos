import { Prisma } from '@prisma/client';
import { PricingService, type RateRuleRow } from './pricing.service';

/**
 * Money tests. The engine decides what a customer is charged, so the bar is
 * "prove the arithmetic and the tie-breaks", not "it runs".
 *
 * Particular attention to:
 *  - the season-boundary case, which is the whole reason pricing is per-day;
 *  - non-stacking, because compounding two +20% rules into +44% is the kind
 *    of bug that only surfaces in a customer dispute;
 *  - Decimal exactness on values that are famously wrong in binary float.
 */

const D = (v: string | number) => new Prisma.Decimal(v);

function rule(over: Partial<RateRuleRow> = {}): RateRuleRow {
  return {
    id: 'r1',
    name: 'rule',
    kind: 'SEASONAL',
    active: true,
    priority: 0,
    vehicleClass: null,
    carId: null,
    startDate: null,
    endDate: null,
    minDays: null,
    maxDays: null,
    adjustmentType: 'PERCENT',
    adjustmentValue: D(0),
    ...over,
  };
}

const CAR = { id: 'car-1', vehicleClass: 'SUV', pricePerDay: D('400.00') };
const svc = new PricingService(null as any);

/** UTC midnight, so a season edge can't be shifted by the host timezone. */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('PricingService — no rules (must equal the previous behaviour)', () => {
  it('prices exactly pricePerDay × days', () => {
    const q = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-04'), []);
    expect(q.days).toBe(3);
    expect(q.total.toFixed(2)).toBe('1200.00');
    expect(q.durationRuleId).toBeNull();
    expect(q.breakdown.every((d) => d.appliedRuleId === null)).toBe(true);
  });

  it('never prices a zero-length rental at zero days', () => {
    // Same-day pickup/return is one billable day, not free.
    const q = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-01'), []);
    expect(q.days).toBe(1);
    expect(q.total.toFixed(2)).toBe('400.00');
  });
});

describe('PricingService — seasonal (per-day)', () => {
  const peak = rule({
    id: 'peak',
    name: 'August peak',
    kind: 'SEASONAL',
    startDate: day('2026-08-01'),
    endDate: day('2026-08-31'),
    adjustmentType: 'PERCENT',
    adjustmentValue: D(25),
  });

  it('applies the uplift inside the window', () => {
    const q = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-12'), [peak]);
    expect(q.days).toBe(2);
    // 400 × 1.25 = 500/day
    expect(q.total.toFixed(2)).toBe('1000.00');
    expect(q.breakdown[0].appliedRuleName).toBe('August peak');
  });

  it('leaves days outside the window at the base rate', () => {
    const q = svc.quoteWithRules(CAR, day('2026-09-10'), day('2026-09-12'), [peak]);
    expect(q.total.toFixed(2)).toBe('800.00');
  });

  it('SPLITS a rental that straddles the season boundary, day by day', () => {
    // 30 Jul, 31 Jul (base 400) + 1 Aug, 2 Aug (peak 500) = 1800
    const q = svc.quoteWithRules(CAR, day('2026-07-30'), day('2026-08-03'), [peak]);
    expect(q.days).toBe(4);
    expect(q.breakdown.map((d) => d.rate.toFixed(2))).toEqual([
      '400.00',
      '400.00',
      '500.00',
      '500.00',
    ]);
    expect(q.total.toFixed(2)).toBe('1800.00');
  });

  it('treats the window as inclusive on both edges', () => {
    const firstDay = svc.quoteWithRules(CAR, day('2026-08-01'), day('2026-08-02'), [peak]);
    expect(firstDay.total.toFixed(2)).toBe('500.00');
    const lastDay = svc.quoteWithRules(CAR, day('2026-08-31'), day('2026-09-01'), [peak]);
    expect(lastDay.total.toFixed(2)).toBe('500.00');
  });

  it('supports FIXED_DAILY as an outright override, not a multiplier', () => {
    const flat = rule({
      id: 'flat',
      adjustmentType: 'FIXED_DAILY',
      adjustmentValue: D('333.33'),
      startDate: day('2026-08-01'),
      endDate: day('2026-08-31'),
    });
    const q = svc.quoteWithRules(CAR, day('2026-08-01'), day('2026-08-04'), [flat]);
    // The float trap: 333.33 × 3 is 999.99, not 999.98999...
    expect(q.total.toFixed(2)).toBe('999.99');
  });

  it('clamps a nonsense negative adjustment to zero rather than paying the renter', () => {
    const broken = rule({ adjustmentType: 'PERCENT', adjustmentValue: D(-150) });
    const q = svc.quoteWithRules(CAR, day('2026-05-01'), day('2026-05-02'), [broken]);
    expect(q.total.toFixed(2)).toBe('0.00');
  });

  it('ignores inactive rules', () => {
    const q = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [
      { ...peak, active: false },
    ]);
    expect(q.total.toFixed(2)).toBe('400.00');
  });
});

describe('PricingService — rule selection (never stacks)', () => {
  const base = { startDate: day('2026-08-01'), endDate: day('2026-08-31') };

  it('applies ONE rule per day, not the compound of both', () => {
    const a = rule({ id: 'a', name: 'A', adjustmentValue: D(20), ...base });
    const b = rule({ id: 'b', name: 'B', adjustmentValue: D(20), priority: 1, ...base });
    const q = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [a, b]);
    // 400 × 1.20 = 480. Stacking would give 400 × 1.2 × 1.2 = 576.
    expect(q.total.toFixed(2)).toBe('480.00');
    expect(q.breakdown[0].appliedRuleName).toBe('B');
  });

  it('higher priority wins', () => {
    const low = rule({ id: 'low', name: 'low', adjustmentValue: D(10), priority: 1, ...base });
    const high = rule({ id: 'high', name: 'high', adjustmentValue: D(50), priority: 9, ...base });
    const q = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [low, high]);
    expect(q.breakdown[0].appliedRuleName).toBe('high');
    expect(q.total.toFixed(2)).toBe('600.00');
  });

  it('on equal priority, a car-specific rule beats a class rule, which beats agency-wide', () => {
    const wide = rule({ id: 'w', name: 'wide', adjustmentValue: D(10), ...base });
    const cls = rule({ id: 'c', name: 'class', adjustmentValue: D(20), vehicleClass: 'SUV', ...base });
    const one = rule({ id: 'o', name: 'car', adjustmentValue: D(30), carId: 'car-1', ...base });

    expect(
      svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [wide, cls])
        .breakdown[0].appliedRuleName,
    ).toBe('class');

    expect(
      svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [wide, cls, one])
        .breakdown[0].appliedRuleName,
    ).toBe('car');
  });

  it('is deterministic when priority AND specificity tie', () => {
    const x = rule({ id: 'bbb', name: 'X', adjustmentValue: D(10), ...base });
    const y = rule({ id: 'aaa', name: 'Y', adjustmentValue: D(90), ...base });
    const first = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [x, y]);
    const reversed = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [y, x]);
    expect(first.breakdown[0].appliedRuleName).toBe('Y'); // lowest id
    expect(reversed.total.toFixed(2)).toBe(first.total.toFixed(2));
  });
});

describe('PricingService — scope matching', () => {
  const seasonal = { startDate: day('2026-08-01'), endDate: day('2026-08-31') };

  it('skips a rule aimed at a different vehicle class', () => {
    const luxuryOnly = rule({ vehicleClass: 'LUXURY', adjustmentValue: D(50), ...seasonal });
    const q = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [luxuryOnly]);
    expect(q.total.toFixed(2)).toBe('400.00');
  });

  it('skips a rule pinned to a different car', () => {
    const otherCar = rule({ carId: 'car-999', adjustmentValue: D(50), ...seasonal });
    const q = svc.quoteWithRules(CAR, day('2026-08-10'), day('2026-08-11'), [otherCar]);
    expect(q.total.toFixed(2)).toBe('400.00');
  });

  it('an unclassified car only matches rules that target any class', () => {
    const unclassified = { ...CAR, vehicleClass: null };
    const classRule = rule({ vehicleClass: 'SUV', adjustmentValue: D(50), ...seasonal });
    const wide = rule({ id: 'w', name: 'wide', adjustmentValue: D(10), ...seasonal });

    expect(
      svc.quoteWithRules(unclassified, day('2026-08-10'), day('2026-08-11'), [classRule])
        .total.toFixed(2),
    ).toBe('400.00');
    expect(
      svc.quoteWithRules(unclassified, day('2026-08-10'), day('2026-08-11'), [wide])
        .total.toFixed(2),
    ).toBe('440.00');
  });
});

describe('PricingService — duration (applied once, to the subtotal)', () => {
  const weekly = rule({
    id: 'wk',
    name: 'Weekly deal',
    kind: 'DURATION',
    minDays: 7,
    adjustmentType: 'PERCENT',
    adjustmentValue: D(-10),
  });

  it('does not apply below the threshold', () => {
    const q = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-04'), [weekly]);
    expect(q.total.toFixed(2)).toBe('1200.00');
    expect(q.durationRuleId).toBeNull();
    expect(q.durationAdjustment.toFixed(2)).toBe('0.00');
  });

  it('applies at and above the threshold', () => {
    const q = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-08'), [weekly]);
    expect(q.days).toBe(7);
    expect(q.subtotal.toFixed(2)).toBe('2800.00');
    expect(q.total.toFixed(2)).toBe('2520.00'); // -10%
    expect(q.durationAdjustment.toFixed(2)).toBe('-280.00');
    expect(q.durationRuleName).toBe('Weekly deal');
  });

  it('respects maxDays so a tier can be bounded', () => {
    const shortOnly = rule({
      kind: 'DURATION',
      minDays: 1,
      maxDays: 2,
      adjustmentValue: D(15),
    });
    const overLimit = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-05'), [shortOnly]);
    expect(overLimit.durationRuleId).toBeNull();
    const within = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-03'), [shortOnly]);
    expect(within.total.toFixed(2)).toBe('920.00'); // 800 × 1.15
  });

  it('FIXED_DAILY duration rule sets a flat effective rate for the whole rental', () => {
    const flatWeek = rule({
      kind: 'DURATION',
      minDays: 7,
      adjustmentType: 'FIXED_DAILY',
      adjustmentValue: D('350.00'),
    });
    const q = svc.quoteWithRules(CAR, day('2026-03-01'), day('2026-03-08'), [flatWeek]);
    expect(q.total.toFixed(2)).toBe('2450.00'); // 350 × 7
  });

  it('COMBINES seasonal (per-day) with duration (on the subtotal)', () => {
    const peak = rule({
      id: 'peak',
      name: 'peak',
      kind: 'SEASONAL',
      startDate: day('2026-08-01'),
      endDate: day('2026-08-31'),
      adjustmentValue: D(25),
    });
    // 7 days all in August: 500/day → 3500 subtotal, then -10% → 3150
    const q = svc.quoteWithRules(CAR, day('2026-08-01'), day('2026-08-08'), [peak, weekly]);
    expect(q.subtotal.toFixed(2)).toBe('3500.00');
    expect(q.total.toFixed(2)).toBe('3150.00');
  });
});

describe('PricingService — Decimal exactness', () => {
  it('keeps a repeating-decimal discount exact to the cent', () => {
    const car = { id: 'c', vehicleClass: null, pricePerDay: D('333.33') };
    const third = rule({ kind: 'DURATION', minDays: 1, adjustmentValue: D('-33.33') });
    const q = svc.quoteWithRules(car, day('2026-03-01'), day('2026-03-04'), [third]);
    // subtotal 999.99 (the classic float trap: 333.33 × 3 must not be
    // 999.98999…). Then ×0.6667 = 666.693333… → 666.69 to the cent.
    expect(q.subtotal.toFixed(2)).toBe('999.99');
    expect(q.total.toFixed(2)).toBe('666.69');
    // and the parts must reconcile
    expect(q.subtotal.plus(q.durationAdjustment).toFixed(2)).toBe(q.total.toFixed(2));
  });

  it('breakdown always sums exactly to the subtotal', () => {
    const peak = rule({
      kind: 'SEASONAL',
      startDate: day('2026-08-01'),
      adjustmentType: 'PERCENT',
      adjustmentValue: D('7.5'),
    });
    const q = svc.quoteWithRules(CAR, day('2026-08-01'), day('2026-08-14'), [peak]);
    const summed = q.breakdown.reduce((a, d) => a.plus(d.rate), D(0));
    expect(summed.toFixed(2)).toBe(q.subtotal.toFixed(2));
  });
});
