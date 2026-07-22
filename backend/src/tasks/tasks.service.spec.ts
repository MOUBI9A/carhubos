import { TasksService } from './tasks.service';

/**
 * Coverage for the unbounded-list hardening (MASTER_BACKLOG P2): both list
 * reads previously had no `take` at all — fine at demo scale, not at the
 * market-ready "holds at 10k+" bar. Capped, not paginated, so the existing
 * flat-array shape is unchanged. Tenant scoping (`agencyId` in the WHERE) is
 * unrelated to this change and untouched.
 */
describe('TasksService — list caps', () => {
  it('findAll caps the result at 500 rows', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new TasksService({ task: { findMany } } as any);

    await svc.findAll('agency-1');

    expect(findMany.mock.calls[0][0].take).toBe(500);
    expect(findMany.mock.calls[0][0].where).toEqual({ agencyId: 'agency-1' });
  });

  it('findAllByAssignee caps the result at 500 rows', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new TasksService({ task: { findMany } } as any);

    await svc.findAllByAssignee('agency-1', 'user-1');

    expect(findMany.mock.calls[0][0].take).toBe(500);
    expect(findMany.mock.calls[0][0].where).toEqual({
      agencyId: 'agency-1',
      assigneeId: 'user-1',
    });
  });
});
