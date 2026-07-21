import { NotFoundException } from '@nestjs/common';
import { AgenciesService } from './agencies.service';

/**
 * Coverage for finding #8: a soft-deleted agency must not permanently occupy
 * the `subdomain` / `contactEmail` @unique slots, or the same subdomain/email
 * can never be re-provisioned (a permanent 409 with no reclaim path). softDelete
 * renames both fields off the tombstone — embedding the row's own uuid so the
 * retired value is globally unique — which frees the original values for reuse
 * while keeping the dead row's historical identity as a readable prefix.
 *
 * A mocked Prisma is sufficient — this is about the update payload softDelete
 * writes and the deletedAt: null guard, not the DB. Also covers getMyAgency's
 * tombstone filter (the agencies module had zero specs — finding #7).
 */
function makePrisma(agencyRow: any) {
  const update = jest.fn(({ where, data }: any) =>
    Promise.resolve({ ...agencyRow, ...data, id: where.id }),
  );
  const findFirst = jest.fn().mockResolvedValue(agencyRow);
  return {
    prisma: { agency: { findFirst, update } },
    update,
    findFirst,
  };
}

describe('AgenciesService.softDelete — frees the @unique slots (finding #8)', () => {
  const LIVE = {
    id: 'agency-uuid-0001',
    name: 'Acme Rentals',
    contactEmail: 'owner@acme.ma',
    subdomain: 'acme',
    deletedAt: null,
  };

  it('stamps deletedAt AND renames subdomain + contactEmail off the tombstone', async () => {
    const { prisma, update } = makePrisma(LIVE);
    const svc = new AgenciesService(prisma as any);

    await svc.softDelete(LIVE.id);

    expect(update).toHaveBeenCalledTimes(1);
    const { where, data } = update.mock.calls[0][0];
    expect(where).toEqual({ id: LIVE.id });
    expect(data.deletedAt).toBeInstanceOf(Date);

    // The unique slots are freed: the stored values no longer equal the
    // originals, so a later re-provision of the same subdomain/email succeeds.
    expect(data.contactEmail).not.toBe(LIVE.contactEmail);
    expect(data.subdomain).not.toBe(LIVE.subdomain);

    // Historical identity kept as a prefix, uuid embedded for global uniqueness.
    expect(data.contactEmail.startsWith(LIVE.contactEmail)).toBe(true);
    expect(data.subdomain.startsWith(LIVE.subdomain)).toBe(true);
    expect(data.contactEmail).toContain(LIVE.id);
    expect(data.subdomain).toContain(LIVE.id);
  });

  it('leaves a null subdomain null (no broken tombstone string) but still frees contactEmail', async () => {
    const NULL_SUB = { ...LIVE, id: 'agency-uuid-0002', subdomain: null };
    const { prisma, update } = makePrisma(NULL_SUB);
    const svc = new AgenciesService(prisma as any);

    await svc.softDelete(NULL_SUB.id);

    const { data } = update.mock.calls[0][0];
    // A null already occupies no unique slot — must stay null, not become
    // "null.deleted-..." which would be a nonsense subdomain.
    expect(data.subdomain).toBeNull();
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.contactEmail).toBe(`${NULL_SUB.contactEmail}.deleted-${NULL_SUB.id}`);
  });

  it('produces a deterministic, collision-proof retired value (embeds the pk)', async () => {
    const { prisma, update } = makePrisma(LIVE);
    const svc = new AgenciesService(prisma as any);

    await svc.softDelete(LIVE.id);

    const { data } = update.mock.calls[0][0];
    expect(data.contactEmail).toBe(`owner@acme.ma.deleted-${LIVE.id}`);
    expect(data.subdomain).toBe(`acme.deleted-${LIVE.id}`);
  });

  it('404s (and does not update) when the agency is missing or already soft-deleted', async () => {
    const update = jest.fn();
    const prisma = {
      agency: { findFirst: jest.fn().mockResolvedValue(null), update },
    };
    const svc = new AgenciesService(prisma as any);

    await expect(svc.softDelete('nope')).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('only ever resolves a live (deletedAt: null) row — never re-tombstones', async () => {
    const { prisma, findFirst } = makePrisma(LIVE);
    const svc = new AgenciesService(prisma as any);

    await svc.softDelete(LIVE.id);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: LIVE.id, deletedAt: null },
    });
  });
});

describe('AgenciesService.getMyAgency — tombstone filter', () => {
  const LIVE = { id: 'a1', name: 'Live Co', users: [] };

  it('returns the agency and scopes the lookup on deletedAt: null', async () => {
    const findFirst = jest.fn().mockResolvedValue(LIVE);
    const svc = new AgenciesService({ agency: { findFirst } } as any);

    await expect(svc.getMyAgency('a1')).resolves.toBe(LIVE);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: 'a1',
      deletedAt: null,
    });
  });

  it('404s a soft-deleted (or missing) agency', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = new AgenciesService({ agency: { findFirst } } as any);

    await expect(svc.getMyAgency('gone')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
