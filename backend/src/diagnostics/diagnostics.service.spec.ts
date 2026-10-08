import { ConflictException, NotFoundException } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { emptySessionData } from './obd/telemetry.types';
import { UnconfiguredDiagnosticProvider } from './providers/diagnostic-provider';
const event = {
  eventId: 'one',
  streamId: 'a',
  sequence: 0,
  observedAt: '2026-01-01T12:00:00Z',
  mode: 1,
  pid: 5,
  bytes: [128],
};
function harness() {
  const row = {
    id: 'session',
    agencyId: 'a',
    vehicleId: 'vehicle',
    revision: 0,
    status: 'OPEN',
    source: 'IMPORT',
    data: emptySessionData(),
    vehicle: { id: 'vehicle', brand: 'Test', model: 'Car' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    diagnosticSession: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(where.agencyId === row.agencyId ? row : null),
        ),
      update: jest.fn().mockImplementation(({ data }) => {
        Object.assign(row, data, { revision: row.revision + 1 });
        return Promise.resolve(row);
      }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: async (work: (arg: typeof tx) => unknown) => work(tx),
    diagnosticSession: tx.diagnosticSession,
  };
  const service = new DiagnosticsService(
    prisma as never,
    { assertOperating: jest.fn() } as never,
    {} as never,
    new UnconfiguredDiagnosticProvider(),
  );
  return { row, tx, service };
}
describe('Diagnostic session tenant and revision boundaries', () => {
  it('returns404 for another tenant before mutation or audit', async () => {
    const { service, tx } = harness();
    await expect(
      service.ingest('other', 'actor', 'session', {
        expectedRevision: 0,
        events: [event],
      }),
    ).rejects.toThrow(NotFoundException);
    expect(tx.diagnosticSession.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('rejects stale revisions before changing evidence', async () => {
    const { service, tx } = harness();
    await expect(
      service.ingest('a', 'actor', 'session', {
        expectedRevision: 3,
        events: [event],
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.diagnosticSession.update).not.toHaveBeenCalled();
  });
  it('requires conclusive tests before technician confirmation', async () => {
    const { service } = harness();
    const captured = await service.ingest('a', 'actor', 'session', {
      expectedRevision: 0,
      events: [event],
    });
    const analyzed = await service.analyze('a', 'actor', 'session', {
      expectedRevision: captured.revision,
    });
    await expect(
      service.confirm('a', 'actor', 'session', {
        expectedRevision: analyzed.revision,
        findingIds: ['no-rule-alert'],
        notes: 'Reviewed',
      }),
    ).rejects.toThrow('Record a conclusive test');
  });
  it('freezes reported sessions and prevents an invented provider claim', async () => {
    const { service, row, tx } = harness();
    row.status = 'REPORTED';
    await expect(
      service.analyze('a', 'actor', 'session', { expectedRevision: 0 }),
    ).rejects.toThrow(ConflictException);
    expect(tx.diagnosticSession.update).not.toHaveBeenCalled();
  });
});
