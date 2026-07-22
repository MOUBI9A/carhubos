import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HubService } from './hub.service';

/**
 * Coverage for MASTER_BACKLOG §4: "hub/hub.service.ts — deliberate cross-
 * tenant discoverAssets (agencyId != mine); nothing guards what leaks."
 * Module previously had zero specs. discoverAssets is *intentionally*
 * cross-tenant (that's the B2B marketplace), so what needs pinning is the
 * shape of that exclusion (own agency out, everyone else's ACTIVE+AVAILABLE
 * listings in) plus the unbounded-list cap (MASTER_BACKLOG P2) — its result
 * set grows with the whole platform, not one tenant, unlike most lists here.
 */
describe('HubService.discoverAssets', () => {
  function makeService(findMany: jest.Mock) {
    return new HubService({ hubListing: { findMany } } as any);
  }

  it('excludes the caller\'s own agency and filters on ACTIVE + AVAILABLE', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = makeService(findMany);

    await svc.discoverAssets('agency-a');

    expect(findMany.mock.calls[0][0].where).toEqual({
      agencyId: { not: 'agency-a' },
      status: 'ACTIVE',
      car: { status: 'AVAILABLE' },
    });
  });

  it('caps the result at 100 rows, newest first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = makeService(findMany);

    await svc.discoverAssets('agency-a');

    expect(findMany.mock.calls[0][0].take).toBe(100);
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('HubService.listAsset', () => {
  function makeService({
    car,
    existingListing,
    create = jest.fn().mockResolvedValue({ id: 'listing-1' }),
  }: {
    car: any;
    existingListing: any;
    create?: jest.Mock;
  }) {
    const prisma = {
      car: { findFirst: jest.fn().mockResolvedValue(car) },
      hubListing: {
        findUnique: jest.fn().mockResolvedValue(existingListing),
        create,
      },
    };
    return { svc: new HubService(prisma as any), prisma, create };
  }

  it('404s when the car is not owned by the caller agency (never trusts body agencyId)', async () => {
    const { svc, prisma, create } = makeService({ car: null, existingListing: null });

    await expect(svc.listAsset('agency-a', 'car-x', 500)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.car.findFirst.mock.calls[0][0].where).toEqual({
      id: 'car-x',
      agencyId: 'agency-a',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('409s when the car is already listed (double-list guard)', async () => {
    const { svc, create } = makeService({
      car: { id: 'car-1' },
      existingListing: { id: 'listing-existing' },
    });

    await expect(svc.listAsset('agency-a', 'car-1', 500)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('lists a real owned, unlisted car with the rate as a Prisma.Decimal', async () => {
    const create = jest.fn((args: any) => Promise.resolve(args.data));
    const { svc } = makeService({
      car: { id: 'car-1' },
      existingListing: null,
      create,
    });

    await svc.listAsset('agency-a', 'car-1', 450);

    const data = create.mock.calls[0][0].data;
    expect(data.agencyId).toBe('agency-a');
    expect(data.carId).toBe('car-1');
    expect(data.status).toBe('ACTIVE');
    expect(data.dailyRateB2B).toBeInstanceOf(Prisma.Decimal);
    expect(data.dailyRateB2B.equals(new Prisma.Decimal('450'))).toBe(true);
  });
});
