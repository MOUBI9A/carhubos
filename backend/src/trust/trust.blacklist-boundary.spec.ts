process.env.IDENTITY_PEPPER = 'test-pepper-fixed-2026';

import { TrustService } from './trust.service';

/** blockingFlagForCustomer()'s severity boundary (Phase 8) — CRITICAL/HIGH hard-block, MEDIUM/LOW don't. */
function makePrisma(customer: any, flags: any[]) {
  return {
    customer: { findFirst: jest.fn().mockResolvedValue(customer) },
    renterIdentity: {
      findUnique: jest.fn().mockResolvedValue({ id: 'identity-1' }),
    },
    blacklistEntry: { findMany: jest.fn().mockResolvedValue(flags) },
  };
}

const CUSTOMER = { id: 'c1', identityType: 'CIN', identityNumber: 'AB123456', renterIdentityId: 'identity-1' };

describe('TrustService.blockingFlagForCustomer — severity boundary', () => {
  it('returns null when the customer is not found (cross-tenant safe)', async () => {
    const prisma = makePrisma(null, []);
    const svc = new TrustService(prisma as any);
    expect(await svc.blockingFlagForCustomer('agency-a', 'c1')).toBeNull();
  });

  it('returns null with no active flags', async () => {
    const prisma = makePrisma(CUSTOMER, []);
    const svc = new TrustService(prisma as any);
    expect(await svc.blockingFlagForCustomer('agency-a', 'c1')).toBeNull();
  });

  it.each(['LOW', 'MEDIUM'])('does not hard-block on a %s-severity flag', async (severity) => {
    const prisma = makePrisma(CUSTOMER, [{ severity, agency: { name: 'X' } }]);
    const svc = new TrustService(prisma as any);
    expect(await svc.blockingFlagForCustomer('agency-a', 'c1')).toBeNull();
  });

  it.each(['HIGH', 'CRITICAL'])('hard-blocks on a %s-severity flag', async (severity) => {
    const prisma = makePrisma(CUSTOMER, [{ severity, agency: { name: 'X' } }]);
    const svc = new TrustService(prisma as any);
    const flag = await svc.blockingFlagForCustomer('agency-a', 'c1');
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe(severity);
  });

  it('prefers CRITICAL over HIGH when both are active', async () => {
    const prisma = makePrisma(CUSTOMER, [
      { severity: 'HIGH', agency: { name: 'X' } },
      { severity: 'CRITICAL', agency: { name: 'Y' } },
    ]);
    const svc = new TrustService(prisma as any);
    const flag = await svc.blockingFlagForCustomer('agency-a', 'c1');
    expect(flag!.severity).toBe("CRITICAL");
  });

  it('a LOW flag alongside a HIGH one still hard-blocks (any qualifying flag triggers it)', async () => {
    const prisma = makePrisma(CUSTOMER, [
      { severity: 'LOW', agency: { name: 'X' } },
      { severity: 'HIGH', agency: { name: 'Y' } },
    ]);
    const svc = new TrustService(prisma as any);
    expect(await svc.blockingFlagForCustomer('agency-a', 'c1')).not.toBeNull();
  });
});
