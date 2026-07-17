import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('saas-admin')
@UseGuards(AuthGuard, RolesGuard)
export class SaasAdminController {
  constructor(private readonly saasAdminService: SaasAdminService) {}

  @Get('overview')
  @Roles('ROOT_ADMIN')
  getOverview() {
    return this.saasAdminService.getPlatformOverview();
  }

  @Patch('agency/:id/tier')
  @Roles('ROOT_ADMIN')
  updateTier(@Param('id') id: string, @Body('tier') tier: string) {
    return this.saasAdminService.updateAgencyTier(id, tier);
  }
}
