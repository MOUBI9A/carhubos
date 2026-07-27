import { Body, Controller, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, ListPaymentsQueryDto } from './dto/payments.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending')
  @RequireCapabilities('payment.verify')
  findAllPending(@CurrentUser() user: any, @Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.findAllPending(user.agencyId, query);
  }

  @Get('recent')
  @RequireCapabilities('finance.view')
  findRecent(@CurrentUser() user: any, @Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.findRecent(user.agencyId, query);
  }

  @Post()
  @RequireCapabilities('payment.record')
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.agencyId, user.id, user.role, dto);
  }

  @Patch(':id/verify')
  @RequireCapabilities('payment.verify')
  verify(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.verify(id, user.id, user.role, user.agencyId);
  }
}
