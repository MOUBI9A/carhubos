import { ConflictException } from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';

/**
 * Founder tenant-provisioning invariants. The critical one is that the OWNER
 * *membership* is seeded in the same transaction as the user — without it the
 * CapabilitiesGuard 403s the new owner on every gated endpoint (a silently
 * broken tenant). Also: the password is hashed, a BETA subscription is created,
 * the action is audited, and a duplicate email is rejected before any write.
 */
function makeTx() {
  return {
    agency: { create: jest.fn().mockResolvedValue({ id: 'ag-1', name: 'Titan Rentals' }) },
    plan: { findUnique: jest.fn().mockResolvedValue({ id: 'plan-beta' }) },
    subscription: { create: jest.fn().mockResolvedValue({}) },
    user: {
      create: jest.fn().mockResolvedValue({ id: 'u-1', email: 'owner@titan.co', name: 'Sara' }),
    },
    agencyMembership: { create: jest.fn().mockResolvedValue({}) },
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>, existingUser: unknown = null) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue(existingUser) },
    $transaction: jest.fn((cb: any) => cb(tx)),
  };
}

const DTO = {
  agencyName: 'Titan Rentals',
  ownerName: 'Sara',
  ownerEmail: 'owner@titan.co',
  initialPassword: 'secret123',
};

describe('SaasAdminService.provisionTenant', () => {
  it('creates agency + OWNER user + OWNER membership + BETA subscription, hashed + audited', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const audit = { log: jest.fn() };
    const svc = new SaasAdminService(prisma as any, audit as any);

    const result = await svc.provisionTenant(DTO, 'founder-1');

    expect(result.agency).toEqual({ id: 'ag-1', name: 'Titan Rentals' });
    expect(result.owner.email).toBe('owner@titan.co');

    // Owner is role OWNER, and the password is HASHED (never stored plaintext).
    const userData = tx.user.create.mock.calls[0][0].data;
    expect(userData.role).toBe('OWNER');
    expect(userData.password).not.toBe('secret123');
    expect(userData.password.length).toBeGreaterThan(20); // bcrypt hash

    // THE invariant: an OWNER membership is seeded, or the owner is 403'd everywhere.
    expect(tx.agencyMembership.create).toHaveBeenCalledTimes(1);
    const membershipData = tx.agencyMembership.create.mock.calls[0][0].data;
    expect(membershipData.rolePreset).toBe('OWNER');
    expect(membershipData.capabilities.length).toBeGreaterThan(0);

    // BETA subscription created; action audited.
    expect(tx.subscription.create).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      'ag-1',
      'founder-1',
      'TENANT_PROVISION',
      'AGENCY',
      'ag-1',
      null,
      expect.objectContaining({ ownerEmail: 'owner@titan.co' }),
    );
  });

  it('rejects a duplicate owner email before opening the transaction', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx, { id: 'already-here' });
    const svc = new SaasAdminService(prisma as any, { log: jest.fn() } as any);

    await expect(svc.provisionTenant(DTO, 'founder-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('still provisions (and seeds the owner membership) when plans are not seeded yet', async () => {
    const tx = makeTx();
    tx.plan.findUnique.mockResolvedValue(null); // fresh DB, no BETA plan row
    const prisma = makePrisma(tx);
    const svc = new SaasAdminService(prisma as any, { log: jest.fn() } as any);

    await svc.provisionTenant(DTO, 'founder-1');

    expect(tx.subscription.create).not.toHaveBeenCalled(); // no plan → no subscription
    expect(tx.agencyMembership.create).toHaveBeenCalledTimes(1); // owner still usable
  });
});
