import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending')
  findAllPending(@CurrentUser() user: any) {
    return this.paymentsService.findAllPending(user.agencyId);
  }

  @Patch(':id/verify')
  verify(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.verify(id, user.id, user.role, user.agencyId);
  }
}
