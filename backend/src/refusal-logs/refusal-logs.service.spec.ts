import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RefusalLogsService } from './refusal-logs.service';
import { CreateRefusalLogDto, UpdateRefusalStatusDto } from './dto/refusal-logs.dto';

/**
 * Coverage for finding F2/F5 (MASTER_BACKLOG P1): `create()` used to take
 * `@Body() data: any` — no DTO at all, so the global ValidationPipe's
 * whitelist/forbidNonWhitelisted never ran, and `requestedCarType`/`status`
 * (enum-likes) and `potentialRevenue` (money) were unconstrained. Same gap on
 * `PATCH :id/status` (`@Body('status') status: string`, a raw unvalidated
 * string). Module previously had 0 specs.
 */
describe('CreateRefusalLogDto — validation (F2)', () => {
  const validBody = {
    customerName: 'Yassine A.',
    customerPhone: '+212600000000',
    requestedCarType: 'SUV',
    requestedStartDate: '2026-08-01T00:00:00.000Z',
    requestedEndDate: '2026-08-05T00:00:00.000Z',
    potentialRevenue: 1500,
  };

  it('accepts a well-formed body', async () => {
    const dto = plainToInstance(CreateRefusalLogDto, validBody);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts every real waitlist-form car type, including COMPACT (schema comment is stale)', async () => {
    for (const requestedCarType of ['ECONOMY', 'COMPACT', 'SUV', 'LUXURY']) {
      const dto = plainToInstance(CreateRefusalLogDto, { ...validBody, requestedCarType });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejects a fabricated requestedCarType', async () => {
    const dto = plainToInstance(CreateRefusalLogDto, {
      ...validBody,
      requestedCarType: 'SPACESHIP',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'requestedCarType')).toBe(true);
  });

  it('rejects a negative potentialRevenue', async () => {
    const dto = plainToInstance(CreateRefusalLogDto, {
      ...validBody,
      potentialRevenue: -50,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'potentialRevenue')).toBe(true);
  });

  it('rejects potentialRevenue with more than 2 decimal places', async () => {
    const dto = plainToInstance(CreateRefusalLogDto, {
      ...validBody,
      potentialRevenue: 10.999,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'potentialRevenue')).toBe(true);
  });

  it('rejects a non-ISO requestedStartDate', async () => {
    const dto = plainToInstance(CreateRefusalLogDto, {
      ...validBody,
      requestedStartDate: 'next tuesday',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'requestedStartDate')).toBe(true);
  });
});

describe('UpdateRefusalStatusDto — validation (F5)', () => {
  it('accepts RECOVERED and LOST', async () => {
    for (const status of ['RECOVERED', 'LOST']) {
      const dto = plainToInstance(UpdateRefusalStatusDto, { status });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejects an arbitrary status string', async () => {
    const dto = plainToInstance(UpdateRefusalStatusDto, { status: 'IGNORED_FOREVER' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});

describe('RefusalLogsService', () => {
  const AGENCY_A = 'agency-aaaa';
  const AGENCY_B = 'agency-bbbb';

  it('create() always sets agencyId from the caller, last in the spread — a client cannot override it', async () => {
    const create = jest.fn((args: any) => Promise.resolve(args.data));
    const svc = new RefusalLogsService({ refusalLog: { create } } as any);

    const dto: CreateRefusalLogDto = {
      customerName: 'Sara B.',
      customerPhone: '+212600000001',
      requestedCarType: 'ECONOMY',
      requestedStartDate: '2026-08-01T00:00:00.000Z',
      requestedEndDate: '2026-08-03T00:00:00.000Z',
      potentialRevenue: 400,
    };

    await svc.create(AGENCY_A, dto);

    const data = create.mock.calls[0][0].data;
    expect(data.agencyId).toBe(AGENCY_A);
    expect(data.requestedStartDate).toBeInstanceOf(Date);
    expect(data.requestedEndDate).toBeInstanceOf(Date);
  });

  it('updateStatus() 404s a cross-tenant log before any write', async () => {
    const findFirst = jest.fn().mockResolvedValue(null); // no log for {id, agencyId: B}
    const update = jest.fn();
    const svc = new RefusalLogsService({ refusalLog: { findFirst, update } } as any);

    await expect(
      svc.updateStatus(AGENCY_B, 'someone-elses-log', 'RECOVERED'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('markAsRecovered() 404s a cross-tenant log before any write', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const update = jest.fn();
    const svc = new RefusalLogsService({ refusalLog: { findFirst, update } } as any);

    await expect(
      svc.markAsRecovered(AGENCY_B, 'someone-elses-log'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
