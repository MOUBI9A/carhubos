import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto, UpdateAutomationDto } from './dto/automations.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

/**
 * Agency-configurable automation rules (AutomationRule). Every handler is
 * agency-scoped in the service (agencyId from the JWT, never the body) — a
 * cross-tenant read/write resolves to nothing and 404s (CLAUDE.md §5.1).
 *
 * Gated on `settings.manage` (OWNER-only) — automation rules are agency-wide
 * config, same class as webhooks; reusing the existing capability keeps it off
 * MANAGER/AGENT and works on the live/seeded DB with no re-seed.
 *
 * NOTE: these rows are persisted but NOT yet executed — the cron handlers in
 * automations.service.ts are still hardcoded and do not consult AutomationRule.
 * Wiring rule execution is a tracked follow-up; until then a stored rule is a
 * definition, so any UI must not imply it fires.
 */
@Controller('automations')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @RequireCapabilities('settings.manage')
  findAll(@CurrentUser() user: any) {
    return this.automationsService.findAll(user.agencyId);
  }

  @Post()
  @RequireCapabilities('settings.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateAutomationDto) {
    return this.automationsService.create(user.agencyId, dto);
  }

  @Patch(':id')
  @RequireCapabilities('settings.manage')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(user.agencyId, id, dto);
  }

  @Delete(':id')
  @RequireCapabilities('settings.manage')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.automationsService.remove(user.agencyId, id);
  }
}
