import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RefusalLogsService } from './refusal-logs.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateRefusalLogDto,
  UpdateRefusalStatusDto,
} from './dto/refusal-logs.dto';

/**
 * Waitlist / demand tracking (Pillar 3). Refusal logs record a would-be
 * CUSTOMER's demand (name, phone, requested car type, potential revenue), so
 * they're gated on the customer capability — reads on `customer.view`, writes on
 * `customer.manage`. AGENT holds both (front-desk logs refusals), which is the
 * point; a RENTER / minimal staff-preset without them is now excluded, where the
 * previous bare `@UseGuards(AuthGuard)` let any authenticated user in (finding #13).
 */
@Controller('refusal-logs')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class RefusalLogsController {
  constructor(private readonly refusalLogsService: RefusalLogsService) {}

  @Post()
  @RequireCapabilities('customer.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateRefusalLogDto) {
    return this.refusalLogsService.create(user.agencyId, dto);
  }

  @Get()
  @RequireCapabilities('customer.view')
  findAll(@CurrentUser() user: any) {
    return this.refusalLogsService.findAll(user.agencyId);
  }

  /** Legacy route — kept for backward compatibility */
  @Patch(':id/recovered')
  @RequireCapabilities('customer.manage')
  markAsRecovered(@CurrentUser() user: any, @Param('id') id: string) {
    return this.refusalLogsService.markAsRecovered(user.agencyId, id);
  }

  /** Generic status update: body { status: 'RECOVERED' | 'LOST' } */
  @Patch(':id/status')
  @RequireCapabilities('customer.manage')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRefusalStatusDto,
  ) {
    return this.refusalLogsService.updateStatus(user.agencyId, id, dto.status);
  }
}
