import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { PredictiveMaintenanceService } from './predictive/predictive-maintenance.service';
import { CreateMaintenanceDto } from './dto/maintenance.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Fleet maintenance & predictive intelligence controller.
 * Gated by capabilities: mutations require `fleet.manage`, reads require `fleet.view`.
 */
@Controller('maintenance')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly predictiveService: PredictiveMaintenanceService,
  ) {}

  @Post()
  @RequireCapabilities('fleet.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(user.agencyId, dto);
  }

  @Get('predictive-overview')
  @RequireCapabilities('fleet.view')
  getPredictiveOverview(@CurrentUser() user: any) {
    return this.predictiveService.getFleetPredictiveOverview(user.agencyId);
  }

  @Get('car/:carId/schedule')
  @RequireCapabilities('fleet.view')
  getCarSchedule(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.predictiveService.calculateScheduleForCar(user.agencyId, carId);
  }

  @Get('car/:carId')
  @RequireCapabilities('fleet.view')
  findAll(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.maintenanceService.findAllForCar(user.agencyId, carId);
  }

  @Get('agency')
  @RequireCapabilities('fleet.view')
  getGlobalHistory(@CurrentUser() user: any) {
    return this.maintenanceService.getGlobalHistory(user.agencyId);
  }
}
