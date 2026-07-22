import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Coverage for MASTER_BACKLOG §4 (users.service.ts — trust QR / verifyRenter).
 * Module previously had zero specs.
 *
 * generateTrustQr's hash used to be `sha256(userId:email:Date.now())` — a
 * bearer credential derived entirely from non-secret/guessable inputs (email
 * isn't secret; a millisecond timestamp is brute-forceable within any
 * plausible generation window). Hardened to crypto.randomBytes; these tests
 * pin the new behavior and guard against a regression back to a derived hash.
 */
describe('UsersService.generateTrustQr', () => {
  it('rejects an unknown userId', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const svc = new UsersService(prisma as any);

    await expect(svc.generateTrustQr('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a non-RENTER user', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u1', role: 'OWNER', email: 'o@x.ma' }),
      },
    };
    const svc = new UsersService(prisma as any);

    await expect(svc.generateTrustQr('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('generates a 64-hex-char (32-byte) cryptographically random token, not a derived hash', async () => {
    const update = jest.fn((args: any) => Promise.resolve({ id: 'u1', ...args.data }));
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u1', role: 'RENTER', email: 'renter@x.ma' }),
        update,
      },
    };
    const svc = new UsersService(prisma as any);

    const first = await svc.generateTrustQr('u1');
    const second = await svc.generateTrustQr('u1');

    expect(update.mock.calls[0][0].data.qrHash).toMatch(/^[0-9a-f]{64}$/);
    // Two calls for the same user must not produce the same token (rules out
    // a regression to a deterministic hash of stable inputs like userId+email).
    expect(first.qrHash).not.toBe(second.qrHash);
  });
});

describe('UsersService — pass-throughs', () => {
  it('findOneByEmail looks up by email', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'u1' });
    const svc = new UsersService({ user: { findUnique } } as any);

    await svc.findOneByEmail('x@y.ma');

    expect(findUnique.mock.calls[0][0].where).toEqual({ email: 'x@y.ma' });
  });

  it('findOneById looks up by id', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'u1' });
    const svc = new UsersService({ user: { findUnique } } as any);

    await svc.findOneById('u1');

    expect(findUnique.mock.calls[0][0].where).toEqual({ id: 'u1' });
  });
});
