import { TrustService } from './trust.service';

/**
 * Coverage for the Customer<->renter-User link (R48): resolving a renter's
 * own global identity, and auto-claiming Customer rows that resolve to the
 * same person. Both only ever run against the CALLER's own userId — never
 * agency-initiated — so the risk being tested is false-positive linking
 * (claiming someone else's Customer row), not tenant boundary bypass.
 */
const TEST_PEPPER = 'test-pepper-fixed-2026';

describe('TrustService.resolveIdentityForRenterUser', () => {
  const savedPepper = process.env.IDENTITY_PEPPER;
  beforeEach(() => {
    process.env.IDENTITY_PEPPER = TEST_PEPPER;
  });
  afterEach(() => {
    if (savedPepper === undefined) delete process.env.IDENTITY_PEPPER;
    else process.env.IDENTITY_PEPPER = savedPepper;
  });

  it('reuses an existing RenterIdentity by hash and links the user, without creating a new one', async () => {
    const existing = { id: 'identity-1' };
    const findUnique = jest.fn().mockResolvedValue(existing);
    const create = jest.fn();
    const userUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      renterIdentity: { findUnique, create },
      user: { update: userUpdate },
    };
    const svc = new TrustService(prisma as any);

    const result = await svc.resolveIdentityForRenterUser(
      'user-1',
      'CIN',
      'AB123456',
    );

    expect(result).toBe(existing);
    expect(create).not.toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { renterIdentityId: 'identity-1' },
    });
  });

  it('creates a new RenterIdentity when none matches the hash yet', async () => {
    const created = { id: 'identity-new' };
    const findUnique = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue(created);
    const userUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      renterIdentity: { findUnique, create },
      user: { update: userUpdate },
    };
    const svc = new TrustService(prisma as any);

    const result = await svc.resolveIdentityForRenterUser(
      'user-1',
      'CIN',
      'AB123456',
    );

    expect(result).toBe(created);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ identityType: 'CIN' }),
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { renterIdentityId: 'identity-new' },
    });
  });
});

describe('TrustService.linkCustomersToRenter', () => {
  it('claims a customer matched by renterIdentityId and returns its agency', async () => {
    const candidate = {
      id: 'cust-1',
      agencyId: 'agency-a',
      phone: '+212600000000',
      renterIdentityId: 'identity-1',
      agency: { name: 'Atlas Cars' },
    };
    const findMany = jest.fn().mockResolvedValue([candidate]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { customer: { findMany, updateMany } };
    const svc = new TrustService(prisma as any);

    const result = await svc.linkCustomersToRenter('user-1', 'identity-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['cust-1'] } },
      data: { userId: 'user-1' },
    });
    expect(result).toEqual([{ agencyId: 'agency-a', agencyName: 'Atlas Cars' }]);
  });

  it('never queries already-linked customers (userId: null stays in the WHERE)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { customer: { findMany, updateMany: jest.fn() } };
    const svc = new TrustService(prisma as any);

    await svc.linkCustomersToRenter('user-1', 'identity-1');

    const where = findMany.mock.calls[0][0].where;
    expect(where.userId).toBeNull();
  });

  it('matches by phone across country-code / leading-zero formatting differences', async () => {
    const candidate = {
      id: 'cust-2',
      agencyId: 'agency-b',
      phone: '0661112233',
      renterIdentityId: null,
      agency: { name: 'Casa Rentals' },
    };
    const findMany = jest.fn().mockResolvedValue([candidate]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { customer: { findMany, updateMany } };
    const svc = new TrustService(prisma as any);

    // Renter's own phone in +212 form; candidate stored with a leading 0 —
    // normalizePhone() should fold both to the same 9-digit local number.
    const result = await svc.linkCustomersToRenter(
      'user-1',
      'identity-does-not-match',
      '+212661112233',
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['cust-2'] } },
      data: { userId: 'user-1' },
    });
    expect(result).toEqual([
      { agencyId: 'agency-b', agencyName: 'Casa Rentals' },
    ]);
  });

  it('re-checks the loose phone prefilter precisely and drops a false-positive substring match', async () => {
    // The DB-side `contains` prefilter is loose; a customer whose phone merely
    // CONTAINS the renter's digits as a substring (not equal after
    // normalization) must NOT be claimed.
    const falsePositive = {
      id: 'cust-3',
      agencyId: 'agency-c',
      phone: '0699611223311', // contains "611223" but isn't the same number
      renterIdentityId: null,
      agency: { name: 'Rif Cars' },
    };
    const findMany = jest.fn().mockResolvedValue([falsePositive]);
    const updateMany = jest.fn();
    const prisma = { customer: { findMany, updateMany } };
    const svc = new TrustService(prisma as any);

    const result = await svc.linkCustomersToRenter(
      'user-1',
      'identity-does-not-match',
      '0611223344',
    );

    expect(updateMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns an empty array and skips the update when nothing matches', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const updateMany = jest.fn();
    const prisma = { customer: { findMany, updateMany } };
    const svc = new TrustService(prisma as any);

    const result = await svc.linkCustomersToRenter('user-1', 'identity-1');

    expect(updateMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
