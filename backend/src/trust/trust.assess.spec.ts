import { NotFoundException } from '@nestjs/common';
import { TrustService } from './trust.service';

/**
 * Regression test for the "recompute on every read" perf bug: assess() is
 * called on every render of the booking-flow Risk Assessment panel, so it
 * must serve the identity's already-fresh cached aggregates
 * (globalScore/reviewCount/riskLevel/...) instead of paying for a 3-query
 * recompute() transaction on every read. Only the mutation paths
 * (createReview / createBlacklistEntry / liftBlacklistEntry /
 * expireBlacklistEntries) are allowed to trigger recompute().
 *
 * A mocked Prisma is sufficient — this is about call-count/shape, not the DB.
 */
process.env.IDENTITY_PEPPER = 'test-pepper-fixed-2026';

function makePrisma() {
  return {
    customer: { findFirst: jest.fn(), update: jest.fn() },
    renterIdentity: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    renterReview: { findMany: jest.fn() },
    blacklistEntry: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

const IDENTITY = {
  id: 'identity-1',
  identityHash: 'hash-1',
  identityType: 'CIN',
  identityMasked: 'A••••56',
  globalScore: 4.5,
  reviewCount: 3,
  activeFlagCount: 0,
  riskLevel: 'TRUSTED',
  lastReviewAt: new Date('2026-01-01'),
};

describe('TrustService.assess', () => {
  it('does not call recompute() (no $transaction, no aggregate write) on a read', async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      agencyId: 'agency-1',
      identityType: 'CIN',
      identityNumber: 'AB123456',
      renterIdentityId: 'identity-1',
    });
    prisma.renterIdentity.findUnique.mockResolvedValue(IDENTITY);
    prisma.renterReview.findMany.mockResolvedValue([]);
    prisma.blacklistEntry.findMany.mockResolvedValue([]);

    const svc = new TrustService(prisma as any);
    const spy = jest.spyOn(svc, 'recompute');

    const result = await svc.assess('agency-1', 'cust-1');

    expect(spy).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.renterIdentity.update).not.toHaveBeenCalled();
    // Only the identity lookup inside resolveIdentityForCustomer — no
    // second "fresh" re-fetch after resolving it.
    expect(prisma.renterIdentity.findUnique).toHaveBeenCalledTimes(1);

    // The cached aggregates on the resolved identity flow straight through.
    expect(result.globalScore).toBe(4.5);
    expect(result.reviewCount).toBe(3);
    expect(result.riskLevel).toBe('TRUSTED');
    expect(result.status).toBe('TRUSTED');
  });

  it('still throws NotFoundException for a cross-tenant / missing customer', async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue(null);
    const svc = new TrustService(prisma as any);

    await expect(svc.assess('agency-1', 'cust-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.renterIdentity.findUnique).not.toHaveBeenCalled();
  });
});
