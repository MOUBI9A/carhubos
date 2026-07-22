import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expenses.dto';

/**
 * Coverage for finding F3 (MASTER_BACKLOG P1): create/update took an inline TS
 * type (erased at runtime, so the global ValidationPipe never validated it) —
 * money `amount` had no `@IsNumber`/`@IsPositive`, and any extra body property
 * rode along unchecked. Module previously had 0 specs.
 *
 * `category` is deliberately NOT enum-constrained (see dto/expenses.dto.ts) —
 * the schema's comment and the live "Record an expense" form disagree on the
 * taxonomy entirely, which is a product decision flagged in COORDINATION.md,
 * not resolved here. These tests only cover what the DTO does constrain.
 */
describe('CreateExpenseDto — validation (F3)', () => {
  const validBody = {
    category: 'Real Estate / Rent',
    description: 'July office rent',
    amount: 4500,
  };

  it('accepts a well-formed body', async () => {
    const dto = plainToInstance(CreateExpenseDto, validBody);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts every real category label the live form actually sends', async () => {
    const realLabels = [
      'Maintenance & Spare Parts',
      'Staff Salary Payout',
      'Real Estate / Rent',
      'Marketing & Acquisition',
      'Utility Infrastructure',
    ];
    for (const category of realLabels) {
      const dto = plainToInstance(CreateExpenseDto, { ...validBody, category });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejects a zero or negative amount', async () => {
    for (const amount of [0, -100]) {
      const dto = plainToInstance(CreateExpenseDto, { ...validBody, amount });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    }
  });

  it('rejects an amount with more than 2 decimal places', async () => {
    const dto = plainToInstance(CreateExpenseDto, { ...validBody, amount: 99.999 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('rejects an empty category or description', async () => {
    const dto = plainToInstance(CreateExpenseDto, { ...validBody, category: '', description: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'category')).toBe(true);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });
});

describe('UpdateExpenseDto — validation', () => {
  it('accepts PENDING and PAID', async () => {
    for (const status of ['PENDING', 'PAID']) {
      const dto = plainToInstance(UpdateExpenseDto, { status });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejects an arbitrary status', async () => {
    const dto = plainToInstance(UpdateExpenseDto, { status: 'WRITTEN_OFF' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('allows a partial body (all fields optional)', async () => {
    const dto = plainToInstance(UpdateExpenseDto, { amount: 200 });
    expect(await validate(dto)).toHaveLength(0);
  });
});

describe('ExpensesService', () => {
  const AGENCY_A = 'agency-aaaa';
  const AGENCY_B = 'agency-bbbb';

  it('create() always persists status PENDING regardless of caller input (DTO has no status field)', async () => {
    const create = jest.fn((args: any) => Promise.resolve(args.data));
    const svc = new ExpensesService({ expense: { create } } as any);

    await svc.create(AGENCY_A, {
      category: 'Utility Infrastructure',
      description: 'Electricity',
      amount: 300,
    });

    const data = create.mock.calls[0][0].data;
    expect(data.status).toBe('PENDING');
    expect(data.agencyId).toBe(AGENCY_A);
  });

  it('update() 404s a cross-tenant expense before any write', async () => {
    const findFirst = jest.fn().mockResolvedValue(null); // no expense for {id, agencyId: B}
    const update = jest.fn();
    const svc = new ExpensesService({ expense: { findFirst, update } } as any);

    await expect(
      svc.update(AGENCY_B, 'someone-elses-expense', { amount: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('remove() 404s a cross-tenant expense before any delete', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const del = jest.fn();
    const svc = new ExpensesService({ expense: { findFirst, delete: del } } as any);

    await expect(svc.remove(AGENCY_B, 'someone-elses-expense')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(del).not.toHaveBeenCalled();
  });
});
