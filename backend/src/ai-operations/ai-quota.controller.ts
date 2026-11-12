import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AiQuotaService } from './ai-quota.service';

/** Read-only, agency-scoped usage reservation totals. No quota writer routes. */
@Controller('ai-operations')
@UseGuards(AuthGuard, RolesGuard, CapabilitiesGuard)
@Roles('OWNER', 'MANAGER')
@RequireCapabilities('reports.view', 'finance.view')
export class AiQuotaController {
  constructor(private readonly quota: AiQuotaService) {}

  @Get('quota')
  getQuota(@CurrentUser() user: { agencyId?: string }) {
    return this.quota.getSummary(user?.agencyId ?? '');
  }
}
