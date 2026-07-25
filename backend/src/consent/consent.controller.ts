import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsentService } from './consent.service';
import { RequestConsentDto } from './dto/consent.dto';

/**
 * Agency-facing consent endpoints. Tenant-scoped: every handler passes the
 * caller's JWT `agencyId` (never a body/param value) into the service, so a
 * request/read can only ever touch grants within the caller's own agency.
 */
@Controller('agency/consent')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('request')
  @RequireCapabilities('customer.view')
  request(@CurrentUser() user: any, @Body() dto: RequestConsentDto) {
    return this.consentService.requestGrant(user.agencyId, user.id, dto);
  }

  @Get('documents/:renterUserId')
  @RequireCapabilities('customer.view')
  readDocuments(
    @CurrentUser() user: any,
    @Param('renterUserId') renterUserId: string,
  ) {
    return this.consentService.readDocuments(user.agencyId, renterUserId);
  }

  @Get('documents/:renterUserId/:documentId/download-url')
  @RequireCapabilities('customer.view')
  getDocumentDownloadUrl(
    @CurrentUser() user: any,
    @Param('renterUserId') renterUserId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.consentService.getConsentedDocumentDownloadUrl(
      user.agencyId,
      renterUserId,
      documentId,
    );
  }
}
