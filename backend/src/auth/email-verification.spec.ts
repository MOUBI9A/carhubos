process.env.JWT_SECRET = 'test-jwt-secret-fixed-2026';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

describe('Email Verification & Gating (P0-2)', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockUsersService: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      agency: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      agencyMembership: {
        create: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
      },
      plan: {
        findUnique: jest.fn().mockResolvedValue({ id: 'plan-beta' }),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
      verifyAsync: jest.fn(),
    };

    mockUsersService = {
      findOneByEmail: jest.fn(),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
    };

    authService = new AuthService(
      mockUsersService,
      mockJwtService,
      mockPrisma,
      mockEmailService,
    );
  });

  describe('1. Registration & Verification Token Generation', () => {
    it('creates an unverified user and stores only a hashed verification token', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockPrisma.agency.create.mockResolvedValue({
        id: 'agency-1',
        name: 'Test Agency',
        onboardingStatus: 'NOT_STARTED',
      });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.com',
        isVerified: false,
        role: 'OWNER',
        agencyId: 'agency-1',
      });

      const res = await authService.register({
        name: 'Owner User',
        email: 'owner@test.com',
        password: 'Password123!',
        role: 'OWNER',
        agencyName: 'Test Agency',
      });

      expect(res.user.isVerified).toBe(false);
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);

      const tokenCreateCall = mockPrisma.emailVerificationToken.create.mock.calls[0][0];
      expect(tokenCreateCall.data.userId).toBe('user-1');
      expect(tokenCreateCall.data.email).toBe('owner@test.com');
      // The token hash must be a 64-character SHA-256 hex string, NOT plaintext
      expect(tokenCreateCall.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Email Verification Token Validation', () => {
    it('successfully verifies email with valid token and single-use enforcement', async () => {
      const rawToken = 'test-raw-token-123';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-1',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour in future
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'owner@test.com',
          role: 'OWNER',
          isVerified: false,
          agency: { id: 'agency-1', onboardingStatus: 'NOT_STARTED' },
        },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.com',
        role: 'OWNER',
        isVerified: true,
        agency: { id: 'agency-1', onboardingStatus: 'NOT_STARTED' },
      });

      mockPrisma.emailVerificationToken.update.mockResolvedValue({ id: 'evt-1' });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        isVerified: true,
      });

      const result: any = await authService.verifyEmail(rawToken);

      expect(result.verified).toBe(true);
      expect(result.nextStep).toBe('ONBOARDING');
      // Must record usedAt timestamp
      expect(mockPrisma.emailVerificationToken.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { usedAt: expect.any(Date) },
      });
      // Must update user isVerified and emailVerifiedAt
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isVerified: true, emailVerifiedAt: expect.any(Date) },
      });
    });

    it('rejects expired verification tokens with TOKEN_EXPIRED', async () => {
      const rawToken = 'expired-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-expired',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in past
        usedAt: null,
        user: { id: 'user-1', email: 'owner@test.com', isVerified: false },
      });

      await expect(authService.verifyEmail(rawToken)).rejects.toMatchObject({
        response: { code: 'TOKEN_EXPIRED' },
      });
    });

    it('handles already-verified tokens safely', async () => {
      const rawToken = 'already-used-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-replayed',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 60000), // Already used!
        user: { id: 'user-1', email: 'owner@test.com', isVerified: true },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.com',
        role: 'OWNER',
        isVerified: true,
        agency: { id: 'agency-1', onboardingStatus: 'NOT_STARTED' },
      });

      const res: any = await authService.verifyEmail(rawToken);
      expect(res.alreadyVerified).toBe(true);
    });

    it('rejects already used token if user was not verified with ALREADY_USED', async () => {
      const rawToken = 'used-token-unverified';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-used-unverified',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 60000),
        user: { id: 'user-1', email: 'owner@test.com', isVerified: false },
      });

      await expect(authService.verifyEmail(rawToken)).rejects.toMatchObject({
        response: { code: 'ALREADY_USED' },
      });
    });
  });

  describe('3. Resend & Anti-Enumeration Protection', () => {
    it('returns generic safe response if email does not exist (anti-enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await authService.resendVerification({ email: 'nonexistent@random.com' });
      expect(res.success).toBe(true);
      expect(res.message).toContain('a verification link has been sent');
      expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
    });

    it('enforces 60-second cooldown rate limit on resending verification email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.com',
        isVerified: false,
      });

      // Token generated 15 seconds ago
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue({
        id: 'evt-recent',
        createdAt: new Date(Date.now() - 15000),
      });

      await expect(
        authService.resendVerification({ email: 'owner@test.com' }),
      ).rejects.toMatchObject({
        response: { code: 'COOLDOWN_ACTIVE' },
      });
    });

    it('allows resend when cooldown period has elapsed (> 60s)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.com',
        isVerified: false,
      });

      // Token generated 75 seconds ago
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue({
        id: 'evt-old',
        createdAt: new Date(Date.now() - 75000),
      });

      const res = await authService.resendVerification({ email: 'owner@test.com' });
      expect(res.success).toBe(true);
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. AuthGuard Verification Gating', () => {
    it('denies access with 403 EMAIL_VERIFICATION_REQUIRED if user is not verified', async () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const guard = new AuthGuard(mockJwtService, reflector, mockPrisma);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-unverified',
        email: 'unverified@test.com',
        role: 'OWNER',
        isVerified: false,
      });

      const ctx: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ cookies: { infinity_token: 'valid-jwt' }, headers: {} }),
        }),
      };

      await expect(guard.canActivate(ctx)).rejects.toMatchObject({
        response: { code: 'EMAIL_VERIFICATION_REQUIRED' },
      });
    });

    it('permits unverified user when route has @AllowUnverified()', async () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true); // AllowUnverified = true

      const guard = new AuthGuard(mockJwtService, reflector, mockPrisma);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-unverified',
        email: 'unverified@test.com',
        role: 'OWNER',
        isVerified: false,
      });

      const ctx: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ cookies: { infinity_token: 'valid-jwt' }, headers: {} }),
        }),
      };

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });
});
