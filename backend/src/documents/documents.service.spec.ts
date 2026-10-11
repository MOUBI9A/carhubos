import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

/**
 * Coverage for DocumentsService (module had zero specs). findAllForCar's
 * cross-tenant 404 is already covered in common/multi-tenant-boundary.spec.ts
 * — not duplicated here.
 *
 * THE BUG THIS FILE CAUGHT: `status` (VALID/EXPIRING_SOON/EXPIRED) is derived
 * from `expiryDate` and persisted at create()/renew() time, then never
 * touched again — no cron or read-time recompute exists anywhere in the
 * backend (grepped every CarDocument.status write). So a document created
 * far in advance is frozen at "VALID" forever in the DB, even long after its
 * real expiryDate has passed. The Guardian Vault views (findAllForCar/
 * findAllForAgency) were returning that stale, persisted column verbatim —
 * a car with an actually-expired mandatory document (insurance, carte grise)
 * could show as fully compliant. Fixed by deriving status fresh on every
 * read instead of trusting the stored value; the stored column stays useful
 * as the value-as-of-last-write, just no longer the last word.
 */
describe('DocumentsService — status is derived fresh on read, not trusted from storage', () => {
  it('findAllForCar overrides a stale stored VALID with the real EXPIRED state', async () => {
    const pastExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const staleRow = {
      id: 'doc-1',
      carId: 'car-1',
      type: 'INSURANCE',
      expiryDate: pastExpiry,
      status: 'VALID', // stale — frozen at creation, never updated since
    };
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      carDocument: { findMany: jest.fn().mockResolvedValue([staleRow]) },
    };
    const svc = new DocumentsService(prisma as any);

    const [result] = await svc.findAllForCar('agency-a', 'car-1');

    expect(result.status).toBe('EXPIRED');
  });

  it('findAllForAgency overrides a stale stored VALID with the real EXPIRING_SOON state', async () => {
    const soonExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days out
    const staleRow = {
      id: 'doc-2',
      carId: 'car-1',
      type: 'CARTE_GRISE',
      expiryDate: soonExpiry,
      status: 'VALID',
      car: { brand: 'Dacia', model: 'Duster', licensePlate: 'A-1' },
    };
    const prisma = {
      carDocument: { findMany: jest.fn().mockResolvedValue([staleRow]) },
    };
    const svc = new DocumentsService(prisma as any);

    const [result] = await svc.findAllForAgency('agency-a');

    expect(result.status).toBe('EXPIRING_SOON');
  });

  it('leaves a genuinely still-valid document as VALID', async () => {
    const farExpiry = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    const row = {
      id: 'doc-3',
      carId: 'car-1',
      expiryDate: farExpiry,
      status: 'VALID',
    };
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      carDocument: { findMany: jest.fn().mockResolvedValue([row]) },
    };
    const svc = new DocumentsService(prisma as any);

    const [result] = await svc.findAllForCar('agency-a', 'car-1');

    expect(result.status).toBe('VALID');
  });
});

describe('DocumentsService — list caps (P2 backlog)', () => {
  it('findAllForCar caps at 100 rows', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      carDocument: { findMany },
    };
    const svc = new DocumentsService(prisma as any);

    await svc.findAllForCar('agency-a', 'car-1');

    expect(findMany.mock.calls[0][0].take).toBe(100);
  });

  it('findAllForAgency caps at 500 rows, scoped by car.agencyId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new DocumentsService({ carDocument: { findMany } } as any);

    await svc.findAllForAgency('agency-a');

    expect(findMany.mock.calls[0][0].take).toBe(500);
    expect(findMany.mock.calls[0][0].where).toEqual({ car: { agencyId: 'agency-a' } });
  });
});

describe('DocumentsService.create/renew — status derivation at write time', () => {
  it('create() derives EXPIRED for a past expiry date', async () => {
    const create = jest.fn((args: any) => Promise.resolve(args.data));
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      carDocument: { create },
    };
    const svc = new DocumentsService(prisma as any);

    await svc.create('agency-a', {
      carId: 'car-1',
      type: 'INSURANCE',
      expiryDate: new Date(Date.now() - 86400000).toISOString(),
    });

    expect(create.mock.calls[0][0].data.status).toBe('EXPIRED');
  });

  it('renew() recomputes status from the new expiry date', async () => {
    const update = jest.fn((args: any) => Promise.resolve(args.data));
    const prisma = {
      carDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', car: { agencyId: 'agency-a' } }),
        update,
      },
    };
    const svc = new DocumentsService(prisma as any);

    await svc.renew('agency-a', 'doc-1', {
      expiryDate: new Date(Date.now() + 400 * 86400000).toISOString(),
    });

    expect(update.mock.calls[0][0].data.status).toBe('VALID');
  });
});

describe('DocumentsService — vaultFileId linking (Vault entity-linking)', () => {
  it('create() 404s on a vaultFileId belonging to another agency, and never creates the document', async () => {
    const create = jest.fn();
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      // The VaultFile lookup is scoped by {id, agencyId} — a cross-tenant id
      // simply matches nothing, same 404-not-403 shape as every other
      // ownership check in this codebase.
      vaultFile: { findFirst: jest.fn().mockResolvedValue(null) },
      carDocument: { create },
    };
    const svc = new DocumentsService(prisma as any);

    await expect(
      svc.create('agency-a', {
        carId: 'car-1',
        type: 'INSURANCE',
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
        vaultFileId: 'someone-elses-file',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.vaultFile.findFirst.mock.calls[0][0].where).toEqual({
      id: 'someone-elses-file',
      agencyId: 'agency-a',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('create() links a vaultFileId that does belong to the caller\'s own agency', async () => {
    const create = jest.fn((args: any) => Promise.resolve(args.data));
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue({ id: 'car-1' }) },
      vaultFile: { findFirst: jest.fn().mockResolvedValue({ id: 'file-1' }) },
      carDocument: { create },
    };
    const svc = new DocumentsService(prisma as any);

    await svc.create('agency-a', {
      carId: 'car-1',
      type: 'INSURANCE',
      expiryDate: new Date(Date.now() + 86400000).toISOString(),
      vaultFileId: 'file-1',
    });

    expect(create.mock.calls[0][0].data.vaultFileId).toBe('file-1');
  });

  it('renew() 404s on a cross-tenant vaultFileId and never updates the document', async () => {
    const update = jest.fn();
    const prisma = {
      carDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', car: { agencyId: 'agency-a' } }),
        update,
      },
      vaultFile: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = new DocumentsService(prisma as any);

    await expect(
      svc.renew('agency-a', 'doc-1', {
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
        vaultFileId: 'someone-elses-file',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('DocumentsService.findExpiringSoon — tenant-scoped and capped', () => {
  it('scopes query to car.agencyId and bounds with take limit', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { carDocument: { findMany } };
    const svc = new DocumentsService(prisma as any);

    await svc.findExpiringSoon('agency-a', 50);

    expect(findMany.mock.calls[0][0].take).toBe(50);
    expect(findMany.mock.calls[0][0].where.car).toEqual({ agencyId: 'agency-a' });
    expect(findMany.mock.calls[0][0].where.status).toBe('VALID');
  });
});
