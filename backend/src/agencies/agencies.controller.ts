import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

class UpdateAgencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

/**
 * `updateMyAgency` mutates agency-wide config (name/contactEmail/phone/
 * address/website) — same class of change as webhooks/automations, both
 * gated `settings.manage` (OWNER-only). Was previously reachable by any
 * authenticated agency member with no capability check at all. Reads stay
 * open to any authenticated staff (CapabilitiesGuard no-ops without
 * `@RequireCapabilities`, matching the pattern already used elsewhere).
 */
@UseGuards(AuthGuard, CapabilitiesGuard)
@Controller('agencies')
export class AgenciesController {
  constructor(private agenciesService: AgenciesService) {}

  @Get('me')
  getMyAgency(@CurrentUser() user: any) {
    return this.agenciesService.getMyAgency(user.agencyId);
  }

  @Patch('me')
  @RequireCapabilities('settings.manage')
  updateMyAgency(@CurrentUser() user: any, @Body() dto: UpdateAgencyDto) {
    return this.agenciesService.updateMyAgency(user.agencyId, dto);
  }

  @Get('me/stats')
  getStats(@CurrentUser() user: any) {
    return this.agenciesService.getStats(user.agencyId);
  }
}
