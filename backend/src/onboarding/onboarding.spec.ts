process.env.JWT_SECRET = 'test-jwt-secret-fixed-2026';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { AuthGuard } from '../auth/auth.guard';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';

describe('Mandatory Owner Onboarding & Tenant Scoping (P0-3)', () => {
  let onboardingService: OnboardingService;
  let mockPrisma: any;
  let mockAuditLogs: any;
  let mockAuthService: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockPrisma = {
      agency: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      car: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    mockAuditLogs = {
      log: jest.fn().mockResolvedValue(true),
    };

    mockAuthService = {
      issueSessionForUser: jest.fn().mockResolvedValue({
        access_token: 'fresh-completed-token',
        user: { id: 'user-1', onboardingStatus: 'COMPLETED' },
      }),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
      verifyAsync: jest.fn(),
    };

    onboardingService = new OnboardingService(
      mockPrisma,
      mockAuditLogs,
      mockAuthService,
    );
  });

  describe('1. Onboarding State & Resume Capability', () => {
    it('returns initial NOT_STARTED state for freshly registered agency', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({
        id: 'agency-1',
        name: 'Atlas Cars',
        onboardingStatus: 'NOT_STARTED',
        onboardingCurrentStep: 1,
        currency: 'MAD',
      });
      mockPrisma.car.count.mockResolvedValue(0);
      mockPrisma.car.findMany.mockResolvedValue([]);

      const state = await onboardingService.getState('agency-1');

      expect(state.agency.name).toBe('Atlas Cars');
      expect(state.currentStep).toBe(1);
      expect(state.isComplete).toBe(false);
      expect(state.carsCount).toBe(0);
      expect(state.minVehiclesRequired).toBe(1);
    });

    it('resumes from previously saved step and attributes', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({
        id: 'agency-1',
        name: 'Atlas Cars Casablanca',
        city: 'Casablanca',
        businessPhone: '+212522000000',
        onboardingStatus: 'IN_PROGRESS',
        onboardingCurrentStep: 3,
        currency: 'MAD',
      });
      mockPrisma.car.count.mockResolvedValue(1);
      mockPrisma.car.findMany.mockResolvedValue([{ id: 'car-1', brand: 'Dacia', model: 'Logan' }]);

      const state = await onboardingService.getState('agency-1');

      expect(state.currentStep).toBe(3);
      expect(state.isComplete).toBe(false);
      expect(state.carsCount).toBe(1);
      expect(state.agency.businessPhone).toBe('+212522000000');
    });
  });

  describe('2. Step Persistence & Updates', () => {
    it('persists agency profile in Step 1 and advances step', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({
        id: 'agency-1',
        onboardingStatus: 'NOT_STARTED',
      });
      mockPrisma.agency.update.mockResolvedValue({
        id: 'agency-1',
        name: 'Atlas Premium',
        city: 'Marrakech',
        onboardingCurrentStep: 2,
        onboardingStatus: 'IN_PROGRESS',
      });

      const updated = await onboardingService.saveStep('agency-1', 'user-1', {
        step: 2,
        agencyProfile: {
          name: 'Atlas Premium',
          city: 'Marrakech',
          businessPhone: '+212661000000',
          contactEmail: 'contact@atlas.ma',
        },
      });

      expect(mockPrisma.agency.update).toHaveBeenCalledWith({
        where: { id: 'agency-1' },
        data: expect.objectContaining({
          name: 'Atlas Premium',
          city: 'Marrakech',
          businessPhone: '+212661000000',
          contactEmail: 'contact@atlas.ma',
          onboardingCurrentStep: 2,
          onboardingStatus: 'IN_PROGRESS',
        }),
      });
      expect(updated.agency.name).toBe('Atlas Premium');
    });

    it('persists rental settings in Step 2 with Decimal defaultDeposit', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({
        id: 'agency-1',
        onboardingStatus: 'IN_PROGRESS',
      });
      mockPrisma.agency.update.mockResolvedValue({
        id: 'agency-1',
        defaultDeposit: new Prisma.Decimal(7000),
        onboardingCurrentStep: 3,
      });

      await onboardingService.saveStep('agency-1', 'user-1', {
        step: 3,
        rentalSettings: {
          defaultDeposit: 7000,
          currency: 'MAD',
          timezone: 'Africa/Casablanca',
        },
      });

      expect(mockPrisma.agency.update).toHaveBeenCalledWith({
        where: { id: 'agency-1' },
        data: expect.objectContaining({
          defaultDeposit: new Prisma.Decimal(7000),
          currency: 'MAD',
          timezone: 'Africa/Casablanca',
          onboardingCurrentStep: 3,
        }),
      });
    });
  });

  describe('3. Fleet Requirement & Completion Gating', () => {
    it('strictly rejects onboarding completion if fleet has 0 vehicles', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({
        id: 'agency-1',
        onboardingStatus: 'IN_PROGRESS',
      });
      mockPrisma.car.count.mockResolvedValue(0); // 0 cars!

      await expect(
        onboardingService.completeOnboarding('agency-1', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPrisma.agency.update).not.toHaveBeenCalled();
    });

    it('successfully completes onboarding when at least 1 vehicle is registered', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({
        id: 'agency-1',
        onboardingStatus: 'IN_PROGRESS',
      });
      mockPrisma.car.count.mockResolvedValue(2); // 2 cars registered!
      mockPrisma.agency.update.mockResolvedValue({
        id: 'agency-1',
        onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: new Date(),
      });

      const res = await onboardingService.completeOnboarding('agency-1', 'user-1');

      expect(res.agency.onboardingStatus).toBe('COMPLETED');
      expect(mockAuditLogs.log).toHaveBeenCalledWith(
        'agency-1',
        'user-1',
        'ONBOARDING_COMPLETED',
        'AGENCY',
        'agency-1',
        expect.anything(),
        expect.anything(),
      );
      expect(mockAuthService.issueSessionForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('4. Cross-Tenant Isolation Enforcement', () => {
    it('returns NotFoundException (404) if user attempts to access or mutate an unowned agency', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue(null); // Agency not found for this tenant!

      await expect(
        onboardingService.getState('foreign-agency-999'),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        onboardingService.saveStep('foreign-agency-999', 'user-1', { step: 2 }),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        onboardingService.completeOnboarding('foreign-agency-999', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('5. AuthGuard Role-Aware Onboarding Gating', () => {
    it('blocks OWNER with 403 ONBOARDING_INCOMPLETE if onboardingStatus !== COMPLETED', async () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockPrisma.agency.findUnique.mockResolvedValue({
        onboardingStatus: 'IN_PROGRESS',
        onboardingCurrentStep: 2,
      });

      const guard = new AuthGuard(mockJwtService, reflector, mockPrisma);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'owner-1',
        role: 'OWNER',
        agencyId: 'agency-1',
        isVerified: true,
      });

      const ctx: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ cookies: { infinity_token: 'valid-jwt' }, headers: {} }),
        }),
      };

      await expect(guard.canActivate(ctx)).rejects.toMatchObject({
        response: { code: 'ONBOARDING_INCOMPLETE' },
      });
    });

    it('exempts employees (AGENT / MANAGER) from owner onboarding gating', async () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const guard = new AuthGuard(mockJwtService, reflector, mockPrisma);
      // AGENT role
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'agent-1',
        role: 'AGENT',
        agencyId: 'agency-1',
        isVerified: true,
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

    it('exempts RENTER from owner onboarding gating', async () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const guard = new AuthGuard(mockJwtService, reflector, mockPrisma);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'renter-1',
        role: 'RENTER',
        isVerified: true,
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

    it('exempts ROOT_ADMIN from owner onboarding gating', async () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const guard = new AuthGuard(mockJwtService, reflector, mockPrisma);
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'root-admin-1',
        role: 'ROOT_ADMIN',
        isVerified: true,
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
