process.env.JWT_SECRET = 'test-jwt-secret-fixed-2026';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';
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
    expect(Object.getOwnPropertyNames(new RegisterDto())).not.toContain(
      'agencyId',
    );
  });

  it.each(['ROOT_ADMIN', 'MANAGER'])(
    'rejects role=%s at validation time',
    async (role) => {
      const dto = plainToInstance(RegisterDto, { ...base, role });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'role')).toBe(true);
    },
  );

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
      emailVerificationToken: { create: jest.fn() },
      ...overrides,
    };
  }

  function makeService(
    tx: ReturnType<typeof makeTx>,
    existingUser: any = null,
  ) {
    const usersService = {
      findOneByEmail: jest.fn().mockResolvedValue(existingUser),
    };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
    const prisma = { $transaction: jest.fn((cb: any) => cb(tx)) };
    return new AuthService(
      usersService as any,
      jwtService as any,
      prisma as any,
    );
  }

  it('rejects registration when the email already exists', async () => {
    const tx = makeTx();
    const svc = makeService(tx, { id: 'existing' });

    await expect(
      svc.register({
        email: 'a@b.com',
        password: 'longenough1',
        name: 'A',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('refuses agency signup without both legal acknowledgement and adult authority', async () => {
    const tx = makeTx();
    const service = makeService(tx);
    await expect(service.register({
      email: 'owner@agency.test',
      password: 'longenough1',
      name: 'Owner',
      agencyName: 'Example Agency',
      legalNoticeAcknowledged: false,
      confirmsAdultAndAuthority: true,
    })).rejects.toThrow('Agency signup requires acknowledgement');
    expect(tx.agency.create).not.toHaveBeenCalled();
  });

  it('creating an agency seeds an OWNER AgencyMembership regardless of the requested role', async () => {
    const tx = makeTx();
    tx.user.create.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      agencyId: 'agency-1',
    });
    const svc = makeService(tx);

    await svc.register({
      email: 'a@b.com',
      password: 'longenough1',
      name: 'A',
      agencyName: 'New Agency',
      legalNoticeAcknowledged: true,
      confirmsAdultAndAuthority: true,
    });

    expect(tx.agencyMembership.create).toHaveBeenCalledTimes(1);
    const membershipArg = tx.agencyMembership.create.mock.calls[0][0].data;
    expect(membershipArg).toMatchObject({
      userId: 'u1',
      agencyId: 'agency-1',
      rolePreset: 'OWNER',
    });

    // The new agency's id is the only agencyId ever used — never a
    // client-supplied one (RegisterDto has no such field to begin with).
    const userArg = tx.user.create.mock.calls[0][0].data;
    expect(userArg.agencyId).toBe('agency-1');
    expect(userArg.legalNoticeAcknowledgedAt).toBeInstanceOf(Date);
    expect(userArg.legalNoticeRevision).toBe('2026-11-12-draft');
    expect(userArg.adultBusinessAuthorityConfirmedAt).toBeInstanceOf(Date);
  });

  it('registering without agencyName creates no agency and no membership', async () => {
    const tx = makeTx();
    tx.user.create.mockResolvedValue({
      id: 'u2',
      email: 'a@b.com',
      agencyId: undefined,
    });
    const svc = makeService(tx);

    await svc.register({
      email: 'a@b.com',
      password: 'longenough1',
      name: 'A',
    });

    expect(tx.agency.create).not.toHaveBeenCalled();
    expect(tx.agencyMembership.create).not.toHaveBeenCalled();
    const userArg = tx.user.create.mock.calls[0][0].data;
    expect(userArg.agencyId).toBeUndefined();
    expect(userArg.role).toBe('AGENT'); // default with no agency and no explicit role
  });
});

describe('AuthService.deleteAccount — compliant account deletion', () => {
  it('never promises complete erasure when account-linked records can remain', async () => {
    const hashed = await bcrypt.hash('mypassword123', 10);
    const tx = {
      emailVerificationToken: { deleteMany: jest.fn() },
      consentGrant: { updateMany: jest.fn() },
      renterDocument: { deleteMany: jest.fn() },
      user: { update: jest.fn() },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({
        id: 'renter-1', email: 'secret@invalid.test', name: 'Private Name',
        role: 'RENTER', agencyId: null, password: hashed,
      }) },
      booking: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };
    const svc = new AuthService({} as any, {} as any, prisma as any);
    const result = await svc.deleteAccount('renter-1', 'mypassword123');
    expect(result.message).toContain('retention and deletion review');
    expect(result.message).not.toMatch(/compliance with privacy regulations|fully erased/);
  });

  it('rejects deletion if user does not exist', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new AuthService({} as any, {} as any, prisma as any);
    await expect(
      svc.deleteAccount('missing-id', 'password123'),
    ).rejects.toThrow('User not found');
  });

  it('rejects deletion for ROOT_ADMIN platform administrators', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'root', role: 'ROOT_ADMIN' }),
      },
    };
    const svc = new AuthService({} as any, {} as any, prisma as any);
    await expect(svc.deleteAccount('root', 'password123')).rejects.toThrow(
      'Platform administrator accounts cannot be deleted through this endpoint.',
    );
  });

  it('rejects deletion if password confirmation does not match', async () => {
    const hashedPassword = await bcrypt.hash('realpassword123', 10);
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'u1',
            role: 'RENTER',
            password: hashedPassword,
          }),
      },
    };
    const svc = new AuthService({} as any, {} as any, prisma as any);
    await expect(svc.deleteAccount('u1', 'wrongpassword')).rejects.toThrow(
      'Invalid password confirmation.',
    );
  });

  it('rejects agency OWNER deletion if active rentals exist', async () => {
    const hashedPassword = await bcrypt.hash('mypassword123', 10);
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'owner-1',
            role: 'OWNER',
            agencyId: 'ag-1',
            password: hashedPassword,
          }),
      },
      booking: { count: jest.fn().mockResolvedValue(2) },
    };
    const svc = new AuthService({} as any, {} as any, prisma as any);
    await expect(svc.deleteAccount('owner-1', 'mypassword123')).rejects.toThrow(
      'Cannot delete agency account while 2 active or confirmed rental(s) exist.',
    );
  });

  it('anonymizes user data and revokes consent upon valid deletion', async () => {
    const hashedPassword = await bcrypt.hash('mypassword123', 10);
    const tx = {
      emailVerificationToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      consentGrant: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      renterDocument: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      agency: { update: jest.fn() },
      user: { update: jest.fn().mockResolvedValue({ id: 'renter-1' }) },
    };
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'renter-1',
            role: 'RENTER',
            agencyId: null,
            password: hashedPassword,
          }),
      },
      booking: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };
    const svc = new AuthService({} as any, {} as any, prisma as any);
    const result = await svc.deleteAccount(
      'renter-1',
      'mypassword123',
      'No longer need account',
    );

    expect(result.success).toBe(true);
    expect(tx.consentGrant.updateMany).toHaveBeenCalledWith({
      where: { grantorUserId: 'renter-1' },
      data: { status: 'REVOKED' },
    });
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'renter-1' },
        data: expect.objectContaining({
          name: 'Utilisateur Supprimé',
          isVerified: false,
        }),
      }),
    );
  });
});
