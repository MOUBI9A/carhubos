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
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AgencyStaffService } from './agency-staff.service';
import {
  CreateStaffDto,
  UpdateStaffCapabilitiesDto,
} from './dto/agency-staff.dto';

/**
 * Owner-facing staff management. All endpoints require `staff.manage` and are
 * tenant-scoped to the caller's JWT `agencyId` (never a request-supplied one).
 */
@Controller('agency/staff')
@UseGuards(AuthGuard, CapabilitiesGuard)
@RequireCapabilities('staff.manage')
export class AgencyStaffController {
  constructor(private readonly agencyStaffService: AgencyStaffService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.agencyStaffService.list(user.agencyId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateStaffDto) {
    return this.agencyStaffService.create(
      user.agencyId,
      user.id,
      user.role,
      dto,
    );
  }

  @Patch(':userId/capabilities')
  updateCapabilities(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffCapabilitiesDto,
  ) {
    return this.agencyStaffService.updateCapabilities(
      user.agencyId,
      user.id,
      user.role,
      userId,
      dto,
    );
  }

  @Delete(':userId')
  remove(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.agencyStaffService.remove(user.agencyId, user.id, userId);
  }
}
