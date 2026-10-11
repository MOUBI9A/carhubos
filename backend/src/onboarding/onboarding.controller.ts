import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowIncompleteOnboarding } from '../common/decorators/allow-incomplete-onboarding.decorator';
import { SaveOnboardingStepDto, BulkImportCarsDto } from './dto/onboarding.dto';
import type { Response } from 'express';

@AllowIncompleteOnboarding()
@UseGuards(AuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  private assertOwnerRole(user: any) {
    if (user.role !== 'OWNER' && user.role !== 'ROOT_ADMIN') {
      throw new ForbiddenException(
        'Only the agency owner can view or configure agency onboarding.',
      );
    }
  }

  @Get('state')
  async getState(@CurrentUser() user: any) {
    this.assertOwnerRole(user);
    return this.onboardingService.getState(user.agencyId);
  }

  @Patch('step')
  async saveStep(
    @CurrentUser() user: any,
    @Body() dto: SaveOnboardingStepDto,
  ) {
    this.assertOwnerRole(user);
    return this.onboardingService.saveStep(user.agencyId, user.id, dto);
  }

  @Post('cars/bulk-csv')
  async bulkImportCars(
    @CurrentUser() user: any,
    @Body() dto: BulkImportCarsDto,
  ) {
    this.assertOwnerRole(user);
    return this.onboardingService.bulkImportCars(user.agencyId, user.id, dto);
  }

  @Post('complete')
  async completeOnboarding(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertOwnerRole(user);
    const data = await this.onboardingService.completeOnboarding(
      user.agencyId,
      user.id,
    );

    // Set updated session cookie with onboardingStatus: 'COMPLETED'
    if (data.access_token) {
      res.cookie('infinity_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return data;
  }
}
