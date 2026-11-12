import {
  Body, Controller, Get, Param, Patch, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiPlatformControlsService } from './ai-platform-controls.service';
import {
  ReviewAgencyAiDto, UpdateAiEmergencyDto,
} from './ai-platform-controls.dto';

/**
 * Independent ROOT_ADMIN-only control plane. Never put these mutations in an
 * agency-facing controller or allow client-supplied actor identities.
 */
@Controller('saas-admin/ai-control')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ROOT_ADMIN')
export class AiPlatformControlsController {
  constructor(private readonly controls: AiPlatformControlsService) {}

  @Get('policy')
  getPolicy(@CurrentUser() user: { id: string }) {
    return this.controls.getPolicy(user.id);
  }

  @Get('requests')
  getRequests(@CurrentUser() user: { id: string }) {
    return this.controls.listRequests(user.id);
  }

  @Patch('policy')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  updatePolicy(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAiEmergencyDto,
  ) {
    return this.controls.updateEmergency(user.id, dto);
  }

  @Patch('agencies/:agencyId/review')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  reviewAgency(
    @CurrentUser() user: { id: string },
    @Param('agencyId') agencyId: string,
    @Body() dto: ReviewAgencyAiDto,
  ) {
    return this.controls.reviewAgency(user.id, agencyId, dto);
  }
}
