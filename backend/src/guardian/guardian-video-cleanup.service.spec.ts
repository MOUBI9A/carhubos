import { GuardianVideoCleanupService } from './guardian-video-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';

const NOW = new Date('2026-11-12T11:00:00.000Z');
const AGED = new Date('2026-11-09T01:00:00.000Z');

function setup(overrides: Record<string, unknown> = {}) {
  const intent = {
    id: 'intent-1',
    reportId: 'report-1',
    agencyId: 'agency-1',
    storagePath: 'agency-1/guardian/report-1/01234567-89ab-4def-8abc-0123456789ab.mp4',
    revisionAtInit: 1,
    createdAt: AGED,
    expiresAt: new Date('2026-11-09T03:00:00.000Z'),
    status: 'PENDING',
    lastSweptAt: null as Date | null,
    ...overrides,
  };
  const tx = {
    $queryRaw: jest.fn(async () => [{ id: intent.reportId }]),
    guardianUploadIntent: {
      findUnique: jest.fn(async () => ({ ...intent })),
      update: jest.fn(async () => ({})),
    },
    guardianEvidence: {
      findUnique: jest.fn(async () => null as { id: string } | null),
    },
    guardianEvent: { create: jest.fn(async () => ({})) },
  };
  const db = {
    guardianUploadIntent: {
      findMany: jest.fn(async () => [intent]),
    },
    $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  };
  const storage = {
    removeGuardianAbandonedVideo: jest.fn(async () => undefined),
  };
  const service = new GuardianVideoCleanupService(
    db as unknown as PrismaService,
    storage as unknown as VaultStorageService,
  );
  return { service, intent, db, tx, storage };
}

describe('privileged Guardian video orphan sweeper', () => {
  it('does not mutate or delete in default dry-run mode', async () => {
    const t = setup();
    const summary = await t.service.sweep({ now: NOW });
    expect(summary).toMatchObject({ claimed: 1, deleted: 0, dryRun: true });
    expect(t.tx.guardianUploadIntent.update).not.toHaveBeenCalled();
    expect(t.storage.removeGuardianAbandonedVideo).not.toHaveBeenCalled();
    expect(t.tx.guardianEvent.create).not.toHaveBeenCalled();
  });

  it('claims an aged expired intent under the report lock before exact deletion', async () => {
    const t = setup();
    const summary = await t.service.sweep({ now: NOW, dryRun: false });
    expect(summary).toMatchObject({ candidates: 1, claimed: 1, deleted: 1, failed: 0 });
    expect(t.tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(t.tx.guardianEvidence.findUnique).toHaveBeenCalledWith({
      where: { storagePath: t.intent.storagePath }, select: { id: true },
    });
    expect(t.tx.guardianUploadIntent.update).toHaveBeenCalledWith({
      where: { id: t.intent.id }, data: { status: 'CANCELED', lastSweptAt: NOW },
    });
    expect(t.tx.guardianEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'VIDEO_UPLOAD_EXPIRED', actorRole: 'SYSTEM' }),
    });
    expect(t.storage.removeGuardianAbandonedVideo).toHaveBeenCalledWith(t.intent.storagePath);
  });

  it('retries a canceled orphan without adding duplicate expiry events', async () => {
    const t = setup({ status: 'CANCELED' });
    const summary = await t.service.sweep({ now: NOW, dryRun: false });
    expect(summary.deleted).toBe(1);
    expect(t.tx.guardianEvent.create).not.toHaveBeenCalled();
  });

  it('protects immutable evidence regardless of inconsistent intent status', async () => {
    const t = setup();
    t.tx.guardianEvidence.findUnique.mockResolvedValue({ id: 'evidence-1' });
    const summary = await t.service.sweep({ now: NOW, dryRun: false });
    expect(summary.skipped).toBe(1);
    expect(t.tx.guardianUploadIntent.update).not.toHaveBeenCalled();
    expect(t.storage.removeGuardianAbandonedVideo).not.toHaveBeenCalled();
  });

  it('rechecks status after lock to prevent deletion of concurrent finalization', async () => {
    const t = setup();
    t.tx.guardianUploadIntent.findUnique.mockResolvedValue({
      ...t.intent, status: 'COMPLETED',
    });
    const summary = await t.service.sweep({ now: NOW, dryRun: false });
    expect(summary.skipped).toBe(1);
    expect(t.storage.removeGuardianAbandonedVideo).not.toHaveBeenCalled();
  });

  it('never deletes an intent swept recently or younger than 48 hours', async () => {
    const t = setup();
    t.tx.guardianUploadIntent.findUnique.mockResolvedValue({
      ...t.intent, lastSweptAt: new Date('2026-11-12T02:00:00Z'),
    });
    expect((await t.service.sweep({ now: NOW, dryRun: false })).skipped).toBe(1);
    expect(t.storage.removeGuardianAbandonedVideo).not.toHaveBeenCalled();
  });

  it('reports deletion failure for later retries without leaking object paths', async () => {
    const t = setup();
    t.storage.removeGuardianAbandonedVideo.mockRejectedValueOnce(new Error('provider error: secret-token'));
    const summary = await t.service.sweep({ now: NOW, dryRun: false });
    expect(summary).toMatchObject({ claimed: 1, deleted: 0, failed: 1 });
    expect(JSON.stringify(summary)).not.toContain('secret-token');
    expect(JSON.stringify(summary)).not.toContain('guardian/report-1');
  });

  it('rejects unbounded batches and invalid dates', async () => {
    const t = setup();
    await expect(t.service.sweep({ now: NOW, limit: 500, dryRun: false })).rejects.toThrow();
    await expect(t.service.sweep({ now: new Date('invalid'), dryRun: false })).rejects.toThrow();
    expect(t.db.guardianUploadIntent.findMany).not.toHaveBeenCalled();
  });
});
