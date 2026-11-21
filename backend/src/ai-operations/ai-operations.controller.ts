import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { AiOperationsService } from './ai-operations.service';

/** Agency monitoring only. Platform ROOT_ADMIN without an agency is denied. */
@Controller('ai-operations')
@UseGuards(AuthGuard, RolesGuard, CapabilitiesGuard)
@Roles('OWNER', 'MANAGER')
@RequireCapabilities('reports.view', 'finance.view')
export class AiOperationsController {
  constructor(private readonly intelligence: AiOperationsService) {}

  @Get('briefing')
  getBriefing(@CurrentUser() user: { agencyId?: string }) {
    // NEVER resolve agencyId from a query parameter, request body or URL.
    return this.intelligence.getAgencyBriefing(user?.agencyId ?? '');
  }
}
