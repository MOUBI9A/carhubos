import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SaasAdminService } from './saas-admin.service';
import { ForensicService } from './forensic.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import {
  IssueInvoiceDto,
  UpdateSubscriptionDto,
} from './dto/founder-billing.dto';

/** Cookie options shared with the auth login/logout flow. */
const AUTH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Founder (ROOT_ADMIN) platform console — tenant roster, business metrics, and
 * manual subscription/billing management. Every handler is ROOT_ADMIN-gated and
 * billing mutations are audited in the service.
 */
@Controller('saas-admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ROOT_ADMIN')
export class SaasAdminController {
  constructor(
    private readonly saasAdminService: SaasAdminService,
    private readonly forensic: ForensicService,
  ) {}

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

  /** Founder provisions a new tenant (agency + OWNER + BETA subscription). */
  @Post('provision')
  provisionTenant(@Body() dto: ProvisionTenantDto, @CurrentUser() user: any) {
    return this.saasAdminService.provisionTenant(dto, user.id);
  }

  /**
   * Impersonate an agency's owner for support (audited, 30-min token). Sets the
   * session cookie so the founder's browser acts as that owner; POST
   * /auth/exit-impersonation restores the founder session.
   */
  @Post('agency/:id/impersonate')
  async impersonate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.forensic.impersonateAgencyOwner(user.id, id);
    res.cookie('infinity_token', result.access_token, {
      ...AUTH_COOKIE,
      maxAge: 30 * 60 * 1000, // 30 minutes
    });
    return result.impersonating;
  }
}
