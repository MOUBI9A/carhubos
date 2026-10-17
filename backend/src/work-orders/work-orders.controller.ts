import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { VerifyWorkOrderDto } from './dto/verify-work-order.dto';

type UserSession = { id: string; agencyId: string; role: string };

@Controller('work-orders')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  @RequireCapabilities('work_order.manage')
  findAll(
    @CurrentUser() user: UserSession,
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('assignedTechnicianId') assignedTechnicianId?: string,
  ) {
    return this.service.findAll(user.agencyId, {
      status,
      vehicleId,
      assignedTechnicianId,
    });
  }

  @Get(':id')
  @RequireCapabilities('work_order.manage')
  findOne(@CurrentUser() user: UserSession, @Param('id') id: string) {
    return this.service.findOne(user.agencyId, id);
  }

  @Post()
  @RequireCapabilities('work_order.manage')
  create(
    @CurrentUser() user: UserSession,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.service.create(user.agencyId, user.id, dto);
  }

  @Patch(':id/status')
  @RequireCapabilities('work_order.manage')
  updateStatus(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.service.updateStatus(user.agencyId, user.id, id, dto);
  }

  @Post(':id/verify')
  @RequireCapabilities('work_order.manage')
  recordVerification(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
    @Body() dto: VerifyWorkOrderDto,
  ) {
    return this.service.recordVerification(user.agencyId, user.id, id, dto);
  }
}
