import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER', 'ROOT_ADMIN')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('agency')
  getAgencyInsights(@CurrentUser() user: any) {
    return this.analyticsService.getAgencyInsights(user.agencyId);
  }

  @Get('financial-pulse')
  getFinancialPulse(@CurrentUser() user: any) {
    return this.analyticsService.getFinancialPulse(user.agencyId);
  }

  @Get('utilization')
  getUtilization(@CurrentUser() user: any) {
    return this.analyticsService.getUtilizationMetrics(user.agencyId);
  }

  @Get('command-centre')
  getCommandCentre(@CurrentUser() user: any) {
    return this.analyticsService.getCommandCentre(user.agencyId);
  }

  @Get('erp-dashboard')
  getErpDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getErpDashboard(user.agencyId);
  }

  @Get('car/:id')
  getCarPerformance(@CurrentUser() user: any, @Param('id') id: string) {
    return this.analyticsService.getCarPerformance(user.agencyId, id);
  }
}
