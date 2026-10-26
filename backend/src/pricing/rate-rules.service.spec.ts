import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RateRulesService } from './rate-rules.service';

/**
 * CRUD-side coverage: tenant boundaries, the coherence guards that
 * class-validator can't express (a "season" with no dates, a max below a
 * min, a percentage that would pay the renter), and the normalisation that
 * stops a rule being half-configured across both kinds.
 */
const AGENCY = 'agency-1';
const ACTOR = 'actor-1';

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function baseDto(over: Record<string, any> = {}) {
  return {
    name: 'August peak',
    kind: 'SEASONAL',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    adjustmentType: 'PERCENT',
    adjustmentValue: 25,
    ...over,
  } as any;
}

describe('RateRulesService — coherence guards', () => {
  function svcWith(prismaOver: Record<string, any> = {}) {
    const prisma = {
      rateRule: { create: jest.fn((a: any) => ({ id: 'r1', ...a.data })) },
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      ...prismaOver,
    };
    return {
      svc: new RateRulesService(prisma as any, makeAudit() as any, {} as any),
      prisma,
    };
  }

  it('rejects a seasonal rule with no dates at all', async () => {
    const { svc } = svcWith();
    await expect(
      svc.create(AGENCY, ACTOR, baseDto({ startDate: null, endDate: null })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a season that ends before it starts', async () => {
    const { svc } = svcWith();
    await expect(
      svc.create(AGENCY, ACTOR, baseDto({ startDate: '2026-08-31', endDate: '2026-08-01' })),
    ).rejects.toThrow(/on or after/i);
  });

  it('rejects a duration rule with neither bound', async () => {
    const { svc } = svcWith();
    await expect(
      svc.create(AGENCY, ACTOR, baseDto({ kind: 'DURATION', startDate: null, endDate: null })),
    ).rejects.toThrow(/minimum or a maximum/i);
  });

  it('rejects maxDays below minDays', async () => {
    const { svc } = svcWith();
    await expect(
      svc.create(
        AGENCY,
        ACTOR,
        baseDto({ kind: 'DURATION', startDate: null, endDate: null, minDays: 10, maxDays: 3 }),
      ),
    ).rejects.toThrow(/greater than or equal/i);
  });

  it('rejects a percentage below -100 (would pay the renter)', async () => {
    const { svc } = svcWith();
    await expect(
      svc.create(AGENCY, ACTOR, baseDto({ adjustmentValue: -150 })),
    ).rejects.toThrow(/between -100 and 1000/i);
  });

  it('rejects a negative fixed daily rate', async () => {
    const { svc } = svcWith();
    await expect(
      svc.create(
        AGENCY,
        ACTOR,
        baseDto({ adjustmentType: 'FIXED_DAILY', adjustmentValue: -5 }),
      ),
    ).rejects.toThrow(/cannot be negative/i);
  });
});

describe('RateRulesService — normalisation', () => {
  it('nulls duration fields on a SEASONAL rule and vice versa', async () => {
    const create = jest.fn((a: any) => ({ id: 'r1', ...a.data }));
    const prisma = {
      rateRule: { create },
      car: { findFirst: jest.fn() },
    };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await svc.create(AGENCY, ACTOR, baseDto({ minDays: 7, maxDays: 30 }));
    const seasonalData = create.mock.calls[0][0].data;
    expect(seasonalData.minDays).toBeNull();
    expect(seasonalData.maxDays).toBeNull();
    expect(seasonalData.startDate).toBeInstanceOf(Date);

    await svc.create(
      AGENCY,
      ACTOR,
      baseDto({ kind: 'DURATION', minDays: 7, startDate: '2026-08-01', endDate: '2026-08-31' }),
    );
    const durationData = create.mock.calls[1][0].data;
    expect(durationData.startDate).toBeNull();
    expect(durationData.endDate).toBeNull();
    expect(durationData.minDays).toBe(7);
  });

  it('stores the adjustment as a 2dp Decimal, never a float', async () => {
    const create = jest.fn((a: any) => ({ id: 'r1', ...a.data }));
    const prisma = { rateRule: { create }, car: { findFirst: jest.fn() } };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await svc.create(AGENCY, ACTOR, baseDto({ adjustmentValue: 12.345 }));
    const value = create.mock.calls[0][0].data.adjustmentValue;
    expect(value.toFixed(2)).toBe('12.35'); // Decimal, rounded — not 12.345
  });
});

describe('RateRulesService — tenant boundaries', () => {
  it('404s when pinning a rule to a car from another agency', async () => {
    const prisma = {
      rateRule: { create: jest.fn() },
      car: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await expect(
      svc.create(AGENCY, ACTOR, baseDto({ carId: 'someone-elses-car' })),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.rateRule.create).not.toHaveBeenCalled();
  });

  it('scopes the car lookup by agencyId', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'car-1' });
    const prisma = {
      rateRule: { create: jest.fn((a: any) => ({ id: 'r', ...a.data })) },
      car: { findFirst },
    };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await svc.create(AGENCY, ACTOR, baseDto({ carId: 'car-1' }));
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: 'car-1',
      agencyId: AGENCY,
    });
  });

  it('404s updating a rule owned by another agency', async () => {
    const prisma = {
      rateRule: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
      car: { findFirst: jest.fn() },
    };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await expect(
      svc.update(AGENCY, 'other-rule', ACTOR, baseDto()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.rateRule.update).not.toHaveBeenCalled();
  });

  it('404s deleting a rule owned by another agency', async () => {
    const prisma = {
      rateRule: { findFirst: jest.fn().mockResolvedValue(null), delete: jest.fn() },
    };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await expect(svc.remove(AGENCY, 'other-rule', ACTOR)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.rateRule.delete).not.toHaveBeenCalled();
  });

  it('audit-logs a pricing change — "who moved the August rate" must be answerable', async () => {
    const audit = makeAudit();
    const prisma = {
      rateRule: { create: jest.fn((a: any) => ({ id: 'r1', ...a.data })) },
      car: { findFirst: jest.fn() },
    };
    const svc = new RateRulesService(prisma as any, audit as any, {} as any);

    await svc.create(AGENCY, ACTOR, baseDto());
    expect(audit.log).toHaveBeenCalledWith(
      AGENCY,
      ACTOR,
      'CREATE_RATE_RULE',
      'RATE_RULE',
      'r1',
      null,
      expect.objectContaining({ name: 'August peak' }),
    );
  });
});

describe('RateRulesService.quote — boundaries', () => {
  it('404s a car from another agency', async () => {
    const prisma = { car: { findFirst: jest.fn().mockResolvedValue(null) } };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await expect(
      svc.quote(AGENCY, 'other-car', '2026-08-01', '2026-08-03'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an end date before the start date', async () => {
    const prisma = {
      car: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'car-1', vehicleClass: null, pricePerDay: 1 }),
      },
    };
    const svc = new RateRulesService(prisma as any, makeAudit() as any, {} as any);

    await expect(
      svc.quote(AGENCY, 'car-1', '2026-08-10', '2026-08-01'),
    ).rejects.toThrow(/on or after/i);
  });
});
