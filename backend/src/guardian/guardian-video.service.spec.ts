import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GuardianService } from './guardian.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuardianVideoUploadDto } from './guardian.dto';

const actor = randomUUID(),
  agency = randomUUID(),
  reportId = randomUUID();
const input = {
  revision: 1,
  kind: 'VIDEO' as const,
  filename: 'walkaround.mp4',
  mimeType: 'video/mp4' as const,
  expectedSizeBytes: 40 * 1024 * 1024,
};

/** In-memory unit fixture; PostgreSQL serialization is covered by the separate opt-in suite. */
function setup() {
  const report: any = {
    id: reportId,
    agencyId: agency,
    carId: randomUUID(),
    bookingId: randomUUID(),
    phase: 'OUT',
    status: 'DRAFT',
    revision: 1,
    agencyApprovedRevision: 1,
    customerApprovedRevision: 1,
    publishedAt: new Date(),
    mutuallyApprovedAt: new Date(),
    car: { agencyId: agency },
    evidence: [],
    findings: [],
    events: [],
  };
  report.booking = {
    agencyId: agency,
    carId: report.carId,
    renterId: randomUUID(),
    customer: { agencyId: agency, userId: randomUUID() },
  };
  const intents: any[] = [],
    evidence: any[] = [],
    events: any[] = [];
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([key, value]) =>
      value && typeof value === 'object' && 'gt' in value
        ? row[key] > (value as { gt: Date }).gt
        : row[key] === value,
    );
  const db: any = {
    $queryRaw: jest.fn(async (_q: any, id: string, scope: string) =>
      id === reportId && scope === agency ? [{ id }] : [],
    ),
    $transaction: jest.fn(async (work: any) => work(db)),
    guardianReport: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === reportId && where.agencyId === agency ? report : null,
      ),
      update: jest.fn(async ({ data }: any) => {
        report.revision++;
        for (const [k, v] of Object.entries(data))
          if (k !== 'revision') report[k] = v;
        return report;
      }),
    },
    guardianUploadIntent: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          intents.find((row) => matches(row, where)) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        intents.filter((row) => matches(row, where)),
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          status: 'PENDING',
          createdAt: new Date(),
          ...data,
        };
        intents.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = intents.find((row) => row.id === where.id);
        Object.assign(row, data);
        return row;
      }),
    },
    guardianEvidence: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: randomUUID(), ...data };
        evidence.push(row);
        return row;
      }),
      findFirst: jest.fn(
        async ({ where }: any) =>
          evidence.find((row) => matches(row, where)) ?? null,
      ),
    },
    guardianEvent: {
      create: jest.fn(async ({ data }: any) => {
        events.push(data);
        return data;
      }),
    },
  };
  const storage: any = {
    createGuardianVideoUpload: jest.fn(async () => ({
      token: 'memory-only',
      bucketName: 'private',
      endpoint: 'https://storage.test/upload/resumable',
    })),
    verifyGuardianVideo: jest.fn(async () => ({
      sha256: 'd'.repeat(64),
      sizeBytes: input.expectedSizeBytes,
      mimeType: 'video/mp4',
    })),
    remove: jest.fn(async () => undefined),
  };
  const service = new GuardianService(db, storage);
  const init = () =>
    service.initiateVideoUpload(actor, agency, reportId, input);
  return { service, storage, db, intents, evidence, events, report, init };
}

describe('Guardian direct video authorization and lifecycle', () => {
  it('signs only a fresh server UUID path and persists intent without a token', async () => {
    const t = setup();
    const result = await t.init();
    expect(result.storagePath).toMatch(
      new RegExp(`^${agency}/guardian/${reportId}/[0-9a-f-]{36}\\.mp4$`),
    );
    expect(t.storage.createGuardianVideoUpload).toHaveBeenCalledWith(
      result.storagePath,
    );
    expect(t.intents[0]).toMatchObject({
      actorId: actor,
      agencyId: agency,
      side: 'AGENCY',
      revisionAtInit: 1,
    });
    expect(JSON.stringify(t.intents)).not.toContain('memory-only');
    expect(t.report.revision).toBe(1);
    expect(t.intents[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(
      7190000,
    );
    await expect(t.init()).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails closed before signing for missing tenant, foreign tenant and broken booking association', async () => {
    const t = setup();
    for (const scope of ['', 'foreign'])
      await expect(
        t.service.initiateVideoUpload(actor, scope, reportId, input),
      ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      t.service.initiateVideoUpload('', agency, reportId, input),
    ).rejects.toBeInstanceOf(NotFoundException);
    t.report.booking.carId = randomUUID();
    await expect(t.init()).rejects.toBeInstanceOf(NotFoundException);
    expect(t.storage.createGuardianVideoUpload).not.toHaveBeenCalled();
  });

  it('preserves a valid exact filename so original-file reselection remains possible', async () => {
    const t = setup();
    const signed = await t.service.initiateVideoUpload(
      actor,
      agency,
      reportId,
      { ...input, filename: ' walkaround.mp4 ' },
    );
    expect(signed.filename).toBe(' walkaround.mp4 ');
    expect(t.intents[0].filename).toBe(signed.filename);
  });

  it.each([
    'CUSTOMER_REVIEW',
    'CORRECTIONS_PENDING',
    'DISPUTED',
    'MUTUALLY_APPROVED',
  ])('rejects initiation in %s', async (status) => {
    const t = setup();
    t.report.status = status;
    await expect(t.init()).rejects.toBeInstanceOf(ConflictException);
    expect(t.storage.createGuardianVideoUpload).not.toHaveBeenCalled();
  });

  it('rejects stale revision and unsafe or out-of-range client input before storage', async () => {
    const t = setup();
    const bad = [
      { revision: 2 },
      { expectedSizeBytes: 157286401 },
      { expectedSizeBytes: 6291455 },
      { expectedSizeBytes: 7.5 },
      { filename: '../forged.mp4' },
      { filename: ' ' },
      { mimeType: 'image/png' },
      { kind: 'DAMAGE' },
    ];
    for (const override of bad)
      await expect(
        t.service.initiateVideoUpload(actor, agency, reportId, {
          ...input,
          ...override,
        } as typeof input),
      ).rejects.toThrow();
    expect(t.storage.createGuardianVideoUpload).not.toHaveBeenCalled();
  });

  it('keeps token out of list and fixes expiry across resume', async () => {
    const t = setup();
    const init = await t.init();
    const expiry = t.intents[0].expiresAt;
    expect(
      await t.service.listVideoUploads('other-actor', agency, reportId),
    ).toEqual([]);
    expect(
      JSON.stringify(await t.service.listVideoUploads(actor, agency, reportId)),
    ).not.toContain('memory-only');
    await t.service.resumeVideoUpload(actor, agency, reportId, init.id);
    expect(t.intents[0].expiresAt).toEqual(expiry);
    for (const method of [
      'resumeVideoUpload',
      'finalizeVideoUpload',
      'cancelVideoUpload',
    ] as const)
      await expect(
        t.service[method]('other-actor', agency, reportId, init.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    expect(t.storage.remove).not.toHaveBeenCalled();
  });

  it('commits actual verified digest once, invalidates approvals, and replays original result', async () => {
    const t = setup();
    const init = await t.init();
    const result = await t.service.finalizeVideoUpload(
      actor,
      agency,
      reportId,
      init.id,
    );
    expect(t.storage.verifyGuardianVideo).toHaveBeenCalledWith(
      init.storagePath,
      input.expectedSizeBytes,
    );
    expect(result).toMatchObject({
      sha256: 'd'.repeat(64),
      revision: 2,
      sizeBytes: input.expectedSizeBytes,
    });
    expect(t.report).toMatchObject({
      revision: 2,
      agencyApprovedRevision: null,
      customerApprovedRevision: null,
      publishedAt: null,
      mutuallyApprovedAt: null,
    });
    t.report.revision = 7;
    t.report.status = 'MUTUALLY_APPROVED';
    expect(
      await t.service.finalizeVideoUpload(actor, agency, reportId, init.id),
    ).toEqual(result);
    expect(t.evidence).toHaveLength(1);
    expect(
      t.events.filter((e) => e.action === 'EVIDENCE_UPLOADED'),
    ).toHaveLength(1);
    expect(t.storage.verifyGuardianVideo).toHaveBeenCalledTimes(1);
    await expect(
      t.service.cancelVideoUpload(actor, agency, reportId, init.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.storage.remove).not.toHaveBeenCalled();
  });

  it.each(['revision', 'phase', 'bookingId', 'status'])(
    'rechecks %s after streaming before evidence is created',
    async (field) => {
      const t = setup();
      const init = await t.init();
      t.storage.verifyGuardianVideo.mockImplementationOnce(async () => {
        t.report[field] =
          field === 'revision'
            ? 2
            : field === 'phase'
              ? 'IN'
              : field === 'status'
                ? 'CUSTOMER_REVIEW'
                : randomUUID();
        return {
          sha256: 'd'.repeat(64),
          sizeBytes: input.expectedSizeBytes,
          mimeType: 'video/mp4',
        };
      });
      await expect(
        t.service.finalizeVideoUpload(actor, agency, reportId, init.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(t.evidence).toHaveLength(0);
      expect(t.intents[0].status).toBe('PENDING');
      expect(t.storage.remove).not.toHaveBeenCalled();
    },
  );

  it('leaves failed or incomplete verification pending and never adds evidence', async () => {
    const t = setup();
    const init = await t.init();
    for (const failure of [
      new ServiceUnavailableException('Incomplete'),
      new BadRequestException('Wrong contents'),
    ]) {
      t.storage.verifyGuardianVideo.mockRejectedValueOnce(failure);
      await expect(
        t.service.finalizeVideoUpload(actor, agency, reportId, init.id),
      ).rejects.toBe(failure);
    }
    expect(t.evidence).toHaveLength(0);
    expect(t.report.revision).toBe(1);
    expect(t.intents[0].status).toBe('PENDING');
  });

  it('blocks expired intents but permits terminal cancel and retry cleanup without changing revision', async () => {
    const t = setup();
    const init = await t.init();
    t.intents[0].expiresAt = new Date(0);
    for (const method of ['resumeVideoUpload', 'finalizeVideoUpload'] as const)
      await expect(
        t.service[method](actor, agency, reportId, init.id),
      ).rejects.toBeInstanceOf(ConflictException);
    await t.service.cancelVideoUpload(actor, agency, reportId, init.id);
    await t.service.cancelVideoUpload(actor, agency, reportId, init.id);
    expect(t.intents[0].status).toBe('CANCELED');
    expect(t.report.revision).toBe(1);
    expect(
      t.events.filter((e) => e.action === 'VIDEO_UPLOAD_CANCELED'),
    ).toHaveLength(1);
    await expect(
      t.service.finalizeVideoUpload(actor, agency, reportId, init.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(t.storage.verifyGuardianVideo).not.toHaveBeenCalled();
  });

  it('validates exact numeric bounds and rejects an arbitrary object path via the API DTO', async () => {
    expect(
      await validate(plainToInstance(GuardianVideoUploadDto, input)),
    ).toHaveLength(0);
    for (const override of [
      { expectedSizeBytes: '7000000' },
      { filename: 'x\ny.mp4' },
      { kind: 'DAMAGE' },
      { revision: 0 },
      { storagePath: 'another-tenant/object' },
    ]) {
      const dto = plainToInstance(GuardianVideoUploadDto, {
        ...input,
        ...override,
      });
      expect(
        (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
          .length,
      ).toBeGreaterThan(0);
    }
  });
});
