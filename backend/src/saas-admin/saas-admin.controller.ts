import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  IssueInvoiceDto,
  UpdateSubscriptionDto,
} from './dto/founder-billing.dto';

/**
 * Founder (ROOT_ADMIN) platform console — tenant roster, business metrics, and
 * manual subscription/billing management. Every handler is ROOT_ADMIN-gated and
 * billing mutations are audited in the service.
 */
@Controller('saas-admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ROOT_ADMIN')
export class SaasAdminController {
  constructor(private readonly saasAdminService: SaasAdminService) {}

  @Get('overview')
  getOverview() {
    return this.saasAdminService.getPlatformOverview();
  }

  @Get('metrics')
  getMetrics() {
    return this.saasAdminService.getFounderMetrics();
  }

  @Patch('agency/:id/tier')
  updateTier(@Param('id') id: string, @Body('tier') tier: string) {
    return this.saasAdminService.updateAgencyTier(id, tier);
  }

  @Patch('agency/:id/subscription')
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.saasAdminService.updateSubscription(id, dto, user.id);
  }

  @Post('agency/:id/invoice')
  issueInvoice(
    @Param('id') id: string,
    @Body() dto: IssueInvoiceDto,
    @CurrentUser() user: any,
  ) {
    return this.saasAdminService.issueInvoice(id, dto, user.id);
  }

  @Patch('invoice/:id/mark-paid')
  markInvoicePaid(@Param('id') id: string, @CurrentUser() user: any) {
    return this.saasAdminService.markInvoicePaid(id, user.id);
  }
}
