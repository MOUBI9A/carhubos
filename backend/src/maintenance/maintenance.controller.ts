import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/maintenance.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('maintenance')
@UseGuards(AuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(user.agencyId, dto);
  }

  @Get('car/:carId')
  findAll(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.maintenanceService.findAllForCar(user.agencyId, carId);
  }

  @Get('agency')
  getGlobalHistory(@CurrentUser() user: any) {
    return this.maintenanceService.getGlobalHistory(user.agencyId);
  }
}
