process.env.JWT_SECRET = 'test-jwt-secret-fixed-2026';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';

/**
 * Regression tests for the Phase 0 register() fix: privilege-escalation
 * (self-assigning a platform/staff role) and tenant-hijack (joining an
 * existing agency by id) must both be structurally impossible, not just
 * "usually" blocked.
 */
describe('RegisterDto — DTO-level privilege boundary', () => {
  const base = { email: 'a@b.com', password: 'longenough1', name: 'A B' };

  it('has no agencyId field at all — joining an existing agency cannot be requested', () => {
    // forbidNonWhitelisted (global ValidationPipe) rejects any property not
    // declared on the DTO class. Structurally proving the class has no
    // agencyId property is the source-level guarantee that backs that pipe
    // config for this endpoint specifically.
    expect(Object.getOwnPropertyNames(new RegisterDto())).not.toContain('agencyId');
  });

  it.each(['ROOT_ADMIN', 'MANAGER'])('rejects role=%s at validation time', async (role) => {
    const dto = plainToInstance(RegisterDto, { ...base, role });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it.each(['OWNER', 'AGENT', 'RENTER'])('accepts role=%s', async (role) => {
    const dto = plainToInstance(RegisterDto, { ...base, role });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'role')).toBeUndefined();
  });
});

describe('AuthService.register — service-level behavior', () => {
  function makeTx(overrides: any = {}) {
    return {
      agency: { create: jest.fn().mockResolvedValue({ id: 'agency-1' }) },
      plan: { findUnique: jest.fn().mockResolvedValue(null) }, // beta plan not seeded — best-effort skip
      subscription: { create: jest.fn() },
      user: { create: jest.fn() },
      agencyMembership: { create: jest.fn() },
      ...overrides,
    };
  }

  function makeService(tx: ReturnType<typeof makeTx>, existingUser: any = null) {
    const usersService = { findOneByEmail: jest.fn().mockResolvedValue(existingUser) };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
    const prisma = { $transaction: jest.fn((cb: any) => cb(tx)) };
    return new AuthService(usersService as any, jwtService as any, prisma as any);
  }

  it('rejects registration when the email already exists', async () => {
    const tx = makeTx();
    const svc = makeService(tx, { id: 'existing' });

    await expect(
      svc.register({ email: 'a@b.com', password: 'longenough1', name: 'A' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('creating an agency seeds an OWNER AgencyMembership regardless of the requested role', async () => {
    const tx = makeTx();
    tx.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', agencyId: 'agency-1' });
    const svc = makeService(tx);

    await svc.register({
      email: 'a@b.com',
      password: 'longenough1',
      name: 'A',
      agencyName: 'New Agency',
    });

    expect(tx.agencyMembership.create).toHaveBeenCalledTimes(1);
    const membershipArg = tx.agencyMembership.create.mock.calls[0][0].data;
    expect(membershipArg).toMatchObject({ userId: 'u1', agencyId: 'agency-1', rolePreset: 'OWNER' });

    // The new agency's id is the only agencyId ever used — never a
    // client-supplied one (RegisterDto has no such field to begin with).
    const userArg = tx.user.create.mock.calls[0][0].data;
    expect(userArg.agencyId).toBe('agency-1');
  });

  it('registering without agencyName creates no agency and no membership', async () => {
    const tx = makeTx();
    tx.user.create.mockResolvedValue({ id: 'u2', email: 'a@b.com', agencyId: undefined });
    const svc = makeService(tx);

    await svc.register({ email: 'a@b.com', password: 'longenough1', name: 'A' });

    expect(tx.agency.create).not.toHaveBeenCalled();
    expect(tx.agencyMembership.create).not.toHaveBeenCalled();
    const userArg = tx.user.create.mock.calls[0][0].data;
    expect(userArg.agencyId).toBeUndefined();
    expect(userArg.role).toBe('AGENT'); // default with no agency and no explicit role
  });
});
