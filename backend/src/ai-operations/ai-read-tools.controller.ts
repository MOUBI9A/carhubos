import {
  Controller, Get, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AiReadToolsService } from './ai-read-tools.service';

/** Preview only. Never routes to arbitrary data queries or writable tools. */
@Controller('ai-operations/tools')
@UseGuards(AuthGuard, RolesGuard, CapabilitiesGuard)
@Roles('OWNER', 'MANAGER')
@RequireCapabilities('reports.view', 'finance.view')
export class AiReadToolsController {
  constructor(private readonly tools: AiReadToolsService) {}

  @Get()
  list() {
    return this.tools.list();
  }

  @Get(':toolId/preview')
  preview(
    @CurrentUser() user: { agencyId?: string },
    @Param('toolId') toolId: string,
  ) {
    return this.tools.preview(user?.agencyId ?? '', toolId);
  }
}
