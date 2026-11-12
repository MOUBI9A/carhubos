import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AiGovernanceService } from './ai-governance.service';
import { UpdateAiGovernanceDto } from './ai-governance.dto';

type AgencyUser = { id: string; agencyId?: string; role: string };

/** Tenant ID only from validated session; no cross-agency query arguments. */
@Controller('ai-operations')
@UseGuards(AuthGuard, RolesGuard, CapabilitiesGuard)
@Roles('OWNER', 'MANAGER')
@RequireCapabilities('reports.view')
export class AiGovernanceController {
  constructor(private readonly governance: AiGovernanceService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: AgencyUser) {
    return this.governance.getSettings(user.agencyId ?? '', { id: user.id, role: user.role });
  }

  @Get('usage')
  getUsage(@CurrentUser() user: AgencyUser) {
    return this.governance.getUsage(user.agencyId ?? '');
  }

  @Patch('settings')
  @Roles('OWNER')
  @RequireCapabilities('settings.manage')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  updateSettings(
    @CurrentUser() user: AgencyUser,
    @Body() dto: UpdateAiGovernanceDto,
  ) {
    return this.governance.updateSettings(user.agencyId ?? '', user.id, dto);
  }
}
