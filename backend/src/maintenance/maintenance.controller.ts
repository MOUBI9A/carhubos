import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/maintenance.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Fleet maintenance records — same domain as `cars`/`accidents`/`documents`,
 * gated the same way (reads `fleet.view`, mutations `fleet.manage`). Was
 * previously bare AuthGuard with no capability gate at all: any authenticated
 * role could log a fake maintenance record, which also syncs `Car.mileage`
 * upward (`MaintenanceService.create`) and feeds ROI recompute — a real
 * mutation risk, not just an information gap.
 */
@Controller('maintenance')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequireCapabilities('fleet.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(user.agencyId, dto);
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
