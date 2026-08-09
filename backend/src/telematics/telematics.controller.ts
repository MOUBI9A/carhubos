import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TelematicsService } from './telematics.service';
import {
  LinkDeviceDto,
  MobilityCommandDto,
  SaveTelematicsIntegrationDto,
} from './dto/telematics.dto';

/**
 * GPS / telematics surface. Every handler passes the caller's JWT `agencyId`
 * — never a body or param value — so an agency can only ever reach its own
 * integration, its own cars, and its own command history.
 *
 * Capability split is intentional:
 *   settings.manage     — connect/disconnect the provider account
 *   telematics.view     — read location + live state + history
 *   telematics.command  — immobilize / restore (OWNER-only by default)
 */
@Controller('telematics')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class TelematicsController {
  constructor(private readonly telematics: TelematicsService) {}

  // ── Provider connection ────────────────────────────────────────────

  @Get('integration')
  @RequireCapabilities('settings.manage')
  getIntegration(@CurrentUser() user: any) {
    return this.telematics.getIntegration(user.agencyId);
  }

  @Put('integration')
  @RequireCapabilities('settings.manage')
  saveIntegration(
    @CurrentUser() user: any,
    @Body() dto: SaveTelematicsIntegrationDto,
  ) {
    return this.telematics.saveIntegration(user.agencyId, user.id, dto);
  }

  @Delete('integration')
  @RequireCapabilities('settings.manage')
  removeIntegration(@CurrentUser() user: any) {
    return this.telematics.removeIntegration(user.agencyId, user.id);
  }

  @Post('integration/test')
  @RequireCapabilities('settings.manage')
  testIntegration(@CurrentUser() user: any) {
    return this.telematics.testIntegration(user.agencyId);
  }

  // ── Per-car device + live state ────────────────────────────────────

  @Put('cars/:carId/device')
  @RequireCapabilities('fleet.manage')
  linkDevice(
    @CurrentUser() user: any,
    @Param('carId') carId: string,
    @Body() dto: LinkDeviceDto,
  ) {
    return this.telematics.linkDevice(
      user.agencyId,
      carId,
      user.id,
      dto.deviceId,
    );
  }

  @Get('cars/:carId/state')
  @RequireCapabilities('telematics.view')
  getCarState(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.telematics.getCarState(user.agencyId, carId);
  }

  @Get('cars/:carId/commands')
  @RequireCapabilities('telematics.view')
  listCommands(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.telematics.listCommands(user.agencyId, carId);
  }

  // ── Mobility commands ──────────────────────────────────────────────

  /**
   * Engage the starter interrupt (prevents the NEXT start; never cuts a
   * running engine). Refused with 409 unless live telemetry proves the
   * vehicle is stopped on a fresh fix — see TelematicsService.immobilize.
   */
  @Post('cars/:carId/immobilize')
  @RequireCapabilities('telematics.command')
  immobilize(
    @CurrentUser() user: any,
    @Param('carId') carId: string,
    @Body() dto: MobilityCommandDto,
  ) {
    return this.telematics.immobilize(user.agencyId, carId, user.id, dto);
  }

  @Post('cars/:carId/restore-mobility')
  @RequireCapabilities('telematics.command')
  restoreMobility(
    @CurrentUser() user: any,
    @Param('carId') carId: string,
    @Body() dto: MobilityCommandDto,
  ) {
    return this.telematics.restoreMobility(user.agencyId, carId, user.id, dto);
  }
}
