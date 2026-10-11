import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthService } from '../auth/auth.service';
import { SaveOnboardingStepDto, BulkImportCarsDto } from './dto/onboarding.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Loads the current server-side onboarding state for the tenant.
   * Completely resumable — closing and reopening the browser restores from here.
   */
  async getState(agencyId: string) {
    if (!agencyId) {
      throw new NotFoundException('No agency associated with user.');
    }

    const agency = await this.prisma.agency.findFirst({
      where: { id: agencyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        taxId: true,
        businessPhone: true,
        contactEmail: true,
        address: true,
        city: true,
        country: true,
        currency: true,
        timezone: true,
        website: true,
        defaultDeposit: true,
        subscriptionTier: true,
        onboardingStatus: true,
        onboardingCurrentStep: true,
        onboardingCompletedAt: true,
      },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found.');
    }

    const [carsCount, cars] = await Promise.all([
      this.prisma.car.count({ where: { agencyId } }),
      this.prisma.car.findMany({
        where: { agencyId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          licensePlate: true,
          pricePerDay: true,
          fuelType: true,
          gearbox: true,
          status: true,
        },
      }),
    ]);

    return {
      agency,
      onboardingStatus: agency.onboardingStatus,
      currentStep: agency.onboardingCurrentStep,
      onboardingCompletedAt: agency.onboardingCompletedAt,
      carsCount,
      cars,
    };
  }

  /**
   * Saves an onboarding step's data and updates the current step marker.
   */
  async saveStep(agencyId: string, userId: string, dto: SaveOnboardingStepDto) {
    if (!agencyId) {
      throw new NotFoundException('No agency associated with user.');
    }

    const existing = await this.prisma.agency.findFirst({
      where: { id: agencyId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Agency not found.');
    }

    const updateData: Prisma.AgencyUpdateInput = {
      onboardingCurrentStep: dto.step,
      onboardingStatus:
        existing.onboardingStatus === 'COMPLETED'
          ? 'COMPLETED'
          : 'IN_PROGRESS',
    };

    if (dto.agencyProfile) {
      if (dto.agencyProfile.name !== undefined)
        updateData.name = dto.agencyProfile.name.trim();
      if (dto.agencyProfile.taxId !== undefined)
        updateData.taxId = dto.agencyProfile.taxId.trim();
      if (dto.agencyProfile.businessPhone !== undefined)
        updateData.businessPhone = dto.agencyProfile.businessPhone.trim();
      if (dto.agencyProfile.contactEmail !== undefined)
        updateData.contactEmail = dto.agencyProfile.contactEmail.trim().toLowerCase();
      if (dto.agencyProfile.address !== undefined)
        updateData.address = dto.agencyProfile.address.trim();
      if (dto.agencyProfile.city !== undefined)
        updateData.city = dto.agencyProfile.city.trim();
      if (dto.agencyProfile.website !== undefined)
        updateData.website = dto.agencyProfile.website.trim();
    }

    if (dto.rentalSettings) {
      if (dto.rentalSettings.currency !== undefined)
        updateData.currency = dto.rentalSettings.currency.trim();
      if (dto.rentalSettings.country !== undefined)
        updateData.country = dto.rentalSettings.country.trim();
      if (dto.rentalSettings.timezone !== undefined)
        updateData.timezone = dto.rentalSettings.timezone.trim();
      if (dto.rentalSettings.defaultDeposit !== undefined)
        updateData.defaultDeposit = new Prisma.Decimal(
          dto.rentalSettings.defaultDeposit,
        );
    }

    const updated = await this.prisma.agency.update({
      where: { id: agencyId },
      data: updateData,
    });

    return {
      success: true,
      currentStep: updated.onboardingCurrentStep,
      onboardingStatus: updated.onboardingStatus,
      agency: updated,
    };
  }

  /**
   * Bulk imports vehicles from CSV/structured input during fleet setup.
   */
  async bulkImportCars(
    agencyId: string,
    userId: string,
    dto: BulkImportCarsDto,
  ) {
    if (!agencyId) {
      throw new NotFoundException('No agency associated with user.');
    }

    if (!dto.cars || dto.cars.length === 0) {
      throw new BadRequestException('No vehicle records provided.');
    }

    const createdCars = await this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const car of dto.cars) {
        // Enforce unique licensePlate per agency
        const existingPlate = await tx.car.findUnique({
          where: {
            agencyId_licensePlate: {
              agencyId,
              licensePlate: car.licensePlate.trim().toUpperCase(),
            },
          },
        });
        if (existingPlate) {
          throw new BadRequestException(
            `License plate "${car.licensePlate}" already exists in your fleet.`,
          );
        }

        const created = await tx.car.create({
          data: {
            agencyId,
            brand: car.brand.trim(),
            model: car.model.trim(),
            year: car.year,
            licensePlate: car.licensePlate.trim().toUpperCase(),
            pricePerDay: new Prisma.Decimal(car.pricePerDay),
            fuelType: car.fuelType || 'DIESEL',
            gearbox: car.gearbox || 'MANUAL',
            status: car.status || 'AVAILABLE',
          },
        });
        results.push(created);
      }
      return results;
    });

    return {
      success: true,
      importedCount: createdCars.length,
      cars: createdCars,
    };
  }

  /**
   * Completes the onboarding wizard:
   * Requires at least ONE valid vehicle in the fleet.
   */
  async completeOnboarding(agencyId: string, userId: string) {
    if (!agencyId) {
      throw new NotFoundException('No agency associated with user.');
    }

    const agency = await this.prisma.agency.findFirst({
      where: { id: agencyId, deletedAt: null },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found.');
    }

    // Guard: Require at least ONE vehicle
    const carsCount = await this.prisma.car.count({
      where: { agencyId },
    });
    if (carsCount < 1) {
      throw new BadRequestException(
        'At least one vehicle must be added to your fleet before completing onboarding.',
      );
    }

    const now = new Date();
    const updated = await this.prisma.agency.update({
      where: { id: agencyId },
      data: {
        onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: now,
        onboardingCurrentStep: 5,
      },
    });

    // Write audit log
    await this.auditLogs.log(
      agencyId,
      userId,
      'ONBOARDING_COMPLETED',
      'AGENCY',
      agencyId,
      { status: agency.onboardingStatus, step: agency.onboardingCurrentStep },
      { status: 'COMPLETED', completedAt: now.toISOString(), carsCount },
    );

    // Issue updated session with onboardingStatus: 'COMPLETED'
    const session = await this.authService.issueSessionForUser(userId);

    return {
      success: true,
      message: 'Onboarding complete! Welcome to Fider OS.',
      agency: updated,
      ...session,
    };
  }
}
