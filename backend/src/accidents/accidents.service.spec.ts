import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccidentsService } from './accidents.service';

/**
 * Tenant-boundary coverage for the Accidents domain (T3 acceptance criteria).
 *
 * The load-bearing guarantee: every read/write is scoped by the caller's
 * agencyId (from the JWT), so agency A can never resolve agency B's accident —
 * a cross-tenant id returns null from the scoped `findFirst` and becomes a 404,
 * never a 403 that would leak the row's existence (CLAUDE.md §5.1). A mocked
 * Prisma is sufficient — this is about the WHERE clause the service builds and
 * the NotFoundException it throws, not the DB.
 */
describe('AccidentsService.findOne — tenant boundary', () => {
  const AGENCY_A = 'agency-aaaa';
  const AGENCY_B = 'agency-bbbb';
  const ACCIDENT = {
    id: 'acc-1',
    agencyId: AGENCY_A,
    carId: 'car-1',
    severity: 'MINOR',
    status: 'REPORTED',
  };

  function makeService(findFirstImpl: (args: any) => any) {
    const findFirst = jest.fn(findFirstImpl);
    const prisma = { accident: { findFirst } };
    return { svc: new AccidentsService(prisma as any, {} as any), findFirst };
  }

  it('returns the accident when it belongs to the caller agency, scoping on { id, agencyId }', async () => {
    const { svc, findFirst } = makeService(() => Promise.resolve(ACCIDENT));

    await expect(svc.findOne(AGENCY_A, 'acc-1')).resolves.toBe(ACCIDENT);

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: 'acc-1',
      agencyId: AGENCY_A,
    });
  });

  it('cross-tenant read → NotFoundException, never leaks existence', async () => {
    // Real DB behaviour: findFirst({ id, agencyId: A }) over B's row → null.
    const { svc, findFirst } = makeService((args: any) =>
      Promise.resolve(
        args.where.id === ACCIDENT.id && args.where.agencyId === ACCIDENT.agencyId
          ? ACCIDENT
          : null,
      ),
    );

    // Agency B asks for agency A's accident by its real id → 404.
    await expect(svc.findOne(AGENCY_B, ACCIDENT.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    // The caller's own agencyId (B) is in the WHERE clause — never the row's.
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: ACCIDENT.id,
      agencyId: AGENCY_B,
    });
  });

  it('unknown id → NotFoundException', async () => {
    const { svc } = makeService(() => Promise.resolve(null));
    await expect(svc.findOne(AGENCY_A, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AccidentsService.create / update — ownership guards', () => {
  const AGENCY_A = 'agency-aaaa';

  it('create 404s when the car is not in the caller agency (never trusts body carId)', async () => {
    const carFindFirst = jest.fn().mockResolvedValue(null); // no car for {id, agencyId: A}
    const accidentCreate = jest.fn();
    const prisma = {
      car: { findFirst: carFindFirst },
      accident: { create: accidentCreate },
    };
    const svc = new AccidentsService(prisma as any, {} as any);

    await expect(
      svc.create(AGENCY_A, {
        carId: 'car-from-another-tenant',
        occurredAt: '2026-03-12T10:00:00.000Z',
        severity: 'SEVERE',
        description: 'x',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(carFindFirst.mock.calls[0][0].where).toEqual({
      id: 'car-from-another-tenant',
      agencyId: AGENCY_A,
    });
    expect(accidentCreate).not.toHaveBeenCalled();
  });

  it('create persists estimatedCost as a Prisma.Decimal (money is never stored as a raw number)', async () => {
    const carFindFirst = jest.fn().mockResolvedValue({ id: 'car-1' });
    const accidentCreate = jest.fn((args: any) => Promise.resolve(args.data));
    const prisma = {
      car: { findFirst: carFindFirst },
      accident: { create: accidentCreate },
    };
    const svc = new AccidentsService(prisma as any, {} as any);

    await svc.create(AGENCY_A, {
      carId: 'car-1',
      occurredAt: '2026-03-12T10:00:00.000Z',
      severity: 'MODERATE',
      description: 'rear bumper',
      estimatedCost: 1234.5,
    });

    const data = accidentCreate.mock.calls[0][0].data;
    expect(data.estimatedCost).toBeInstanceOf(Prisma.Decimal);
    expect(data.estimatedCost.equals(new Prisma.Decimal('1234.50'))).toBe(true);
    expect(data.agencyId).toBe(AGENCY_A);
    expect(data.occurredAt).toBeInstanceOf(Date);
  });

  it('update 404s a cross-tenant accident before any write', async () => {
    const accidentFindFirst = jest.fn().mockResolvedValue(null); // findOne guard → null
    const accidentUpdate = jest.fn();
    const prisma = {
      accident: { findFirst: accidentFindFirst, update: accidentUpdate },
    };
    const svc = new AccidentsService(prisma as any, {} as any);

    await expect(
      svc.update(AGENCY_A, 'someone-elses-accident', { status: 'RESOLVED' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(accidentUpdate).not.toHaveBeenCalled();
  });
});

describe('AccidentsService.generateReportPdf — tenant boundary + engine handoff', () => {
  const AGENCY_A = 'agency-aaaa';

  it('cross-tenant/unknown id 404s before Puppeteer ever launches', async () => {
    const accidentFindFirst = jest.fn().mockResolvedValue(null);
    const generateAccidentReport = jest.fn();
    const prisma = { accident: { findFirst: accidentFindFirst } };
    const pdfEngine = { generateAccidentReport };
    const svc = new AccidentsService(prisma as any, pdfEngine as any);

    await expect(
      svc.generateReportPdf(AGENCY_A, 'someone-elses-accident'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(accidentFindFirst.mock.calls[0][0].where).toEqual({
      id: 'someone-elses-accident',
      agencyId: AGENCY_A,
    });
    expect(generateAccidentReport).not.toHaveBeenCalled();
  });

  it('hands the tenant-scoped accident (with car+agency) to the PDF engine and returns its buffer', async () => {
    const accident = {
      id: 'acc-1',
      agencyId: AGENCY_A,
      car: { id: 'car-1', brand: 'Dacia', model: 'Duster', licensePlate: '1-A-1' },
      agency: { name: 'Fider Rent', address: 'Casablanca' },
    };
    const accidentFindFirst = jest.fn().mockResolvedValue(accident);
    const pdfBuffer = Buffer.from('pdf-bytes');
    const generateAccidentReport = jest.fn().mockResolvedValue(pdfBuffer);
    const prisma = { accident: { findFirst: accidentFindFirst } };
    const pdfEngine = { generateAccidentReport };
    const svc = new AccidentsService(prisma as any, pdfEngine as any);

    await expect(svc.generateReportPdf(AGENCY_A, 'acc-1')).resolves.toBe(pdfBuffer);
    expect(generateAccidentReport).toHaveBeenCalledWith(accident);
  });
});
