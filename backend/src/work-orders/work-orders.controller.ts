import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('metrics/summary')
  @RequireCapabilities('work_order.manage')
  getOperationalMetrics(@CurrentUser() user: UserSession) {
    return this.service.getOperationalMetrics(user.agencyId);
  }

  @Get(':id/pdf')
  @RequireCapabilities('work_order.manage')
  async downloadPdf(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generatePdf(user.agencyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="work-order-${id.slice(0, 8)}.pdf"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
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

  @Get(':id/share-link')
  @RequireCapabilities('work_order.view')
  getApprovalShareLink(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.service.getApprovalShareLink(user.agencyId, id);
  }
}
