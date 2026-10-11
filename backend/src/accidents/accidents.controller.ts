import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccidentsService } from './accidents.service';
import { CreateAccidentDto, UpdateAccidentDto } from './dto/accidents.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

/**
 * Fleet accident/incident dossiers. Every handler is agency-scoped in the
 * service (agencyId from the JWT, never the body) — cross-tenant → 404.
 *
 * Capability gating reuses the fleet capabilities rather than minting a new one:
 * an accident is a Pillar-2 fleet-asset event (same domain as Car /
 * MaintenanceRecord), and the `cars` controller — the direct sibling — gates
 * reads on `fleet.view` and mutations on `fleet.manage`. Reusing them keeps the
 * gating consistent AND works on the live/seeded DB today (existing OWNER +
 * MANAGER memberships already hold both; AGENT holds `fleet.view` only, so an
 * agent can see incidents but not file/edit them), with no re-seed needed.
 */
@Controller('accidents')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class AccidentsController {
  constructor(private readonly accidentsService: AccidentsService) {}

  @Get()
  @RequireCapabilities('fleet.view')
  findAll(@CurrentUser() user: any) {
    return this.accidentsService.findAll(user.agencyId);
  }

  @Get(':id')
  @RequireCapabilities('fleet.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accidentsService.findOne(user.agencyId, id);
  }

  @Get(':id/pdf')
  @RequireCapabilities('fleet.view')
  async exportPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.accidentsService.getDossierPdf(user.agencyId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="accident-${id.slice(0, 8)}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  @RequireCapabilities('fleet.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateAccidentDto) {
    return this.accidentsService.create(user.agencyId, dto);
  }

  @Patch(':id')
  @RequireCapabilities('fleet.manage')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAccidentDto,
  ) {
    return this.accidentsService.update(user.agencyId, id, dto);
  }
}
