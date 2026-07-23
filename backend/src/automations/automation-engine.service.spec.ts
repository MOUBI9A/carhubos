import { AutomationEngine } from './automation-engine.service';

/**
 * Coverage for the automation execution engine (N4 rule-execution increment).
 *
 * The load-bearing guarantees: rules are loaded tenant-scoped
 * ({ agencyId, trigger, isActive }); only the safe CREATE_MAINTENANCE_TASK is
 * auto-dispatched while risky external/financial actions are deferred with no
 * side effect; the task write is de-duplicated; and a failing rule is swallowed
 * so it can never break the flow that fired the trigger. Mocked Prisma is enough.
 */
describe('AutomationEngine.runTrigger', () => {
  const AGENCY_A = 'agency-aaaa';

  function makePrisma(rules: any[], opts: { existingTask?: boolean } = {}) {
    const findMany = jest.fn().mockResolvedValue(rules);
    const taskFindFirst = jest
      .fn()
      .mockResolvedValue(opts.existingTask ? { id: 'existing' } : null);
    const taskCreate = jest.fn().mockResolvedValue({ id: 'new-task' });
    const prisma = {
      automationRule: { findMany },
      task: { findFirst: taskFindFirst, create: taskCreate },
    };
    return { prisma, findMany, taskFindFirst, taskCreate };
  }

  it('loads rules scoped by { agencyId, trigger, isActive: true }', async () => {
    const { prisma, findMany } = makePrisma([]);
    const engine = new AutomationEngine(prisma as any);

    const result = await engine.runTrigger(AGENCY_A, 'BOOKING_CREATED');

    expect(findMany.mock.calls[0][0].where).toEqual({
      agencyId: AGENCY_A,
      trigger: 'BOOKING_CREATED',
      isActive: true,
    });
    expect(result).toEqual({ matched: 0, dispatched: 0, deferred: 0 });
  });

  it('dispatches CREATE_MAINTENANCE_TASK as a real, agency-scoped task', async () => {
    const { prisma, taskCreate } = makePrisma([
      { name: 'Post-booking checklist', action: 'CREATE_MAINTENANCE_TASK' },
    ]);
    const engine = new AutomationEngine(prisma as any);

    const result = await engine.runTrigger(AGENCY_A, 'BOOKING_CREATED', {
      subject: '1234-A-56',
    });

    expect(result).toEqual({ matched: 1, dispatched: 1, deferred: 0 });
    const data = taskCreate.mock.calls[0][0].data;
    expect(data.agencyId).toBe(AGENCY_A);
    expect(data.title).toBe('Automation: Post-booking checklist — 1234-A-56');
    expect(data.status).toBe('PENDING');
  });

  it('de-duplicates: skips creating a task when an open one with the same title exists', async () => {
    const { prisma, taskCreate } = makePrisma(
      [{ name: 'Post-booking checklist', action: 'CREATE_MAINTENANCE_TASK' }],
      { existingTask: true },
    );
    const engine = new AutomationEngine(prisma as any);

    const result = await engine.runTrigger(AGENCY_A, 'BOOKING_CREATED');

    // Counted as dispatched (the rule ran) but no duplicate row written.
    expect(result.dispatched).toBe(1);
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it('defers risky actions (no external send, no state mutation)', async () => {
    const { prisma, taskCreate } = makePrisma([
      { name: 'Nudge renter', action: 'SEND_WHATSAPP_NUDGE' },
      { name: 'Lock the car', action: 'HARD_LOCK_ASSET' },
    ]);
    const engine = new AutomationEngine(prisma as any);

    const result = await engine.runTrigger(AGENCY_A, 'RETURN_OVERDUE_2H');

    expect(result).toEqual({ matched: 2, dispatched: 0, deferred: 2 });
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it('swallows a failing rule and keeps going (never breaks the caller flow)', async () => {
    const { prisma, taskCreate } = makePrisma([
      { name: 'Boom', action: 'CREATE_MAINTENANCE_TASK' },
      { name: 'Fine', action: 'CREATE_MAINTENANCE_TASK' },
    ]);
    // First create throws, second succeeds.
    taskCreate
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce({ id: 'ok' });
    const engine = new AutomationEngine(prisma as any);

    // Must resolve, not reject.
    const result = await engine.runTrigger(AGENCY_A, 'BOOKING_CREATED');

    // Both counted as dispatched attempts; the throw was caught, second ran.
    expect(result.matched).toBe(2);
    expect(taskCreate).toHaveBeenCalledTimes(2);
  });
});
