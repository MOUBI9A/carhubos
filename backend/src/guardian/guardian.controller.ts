import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RenterGuard } from '../portal/guards/renter.guard';
import { GuardianService } from './guardian.service';
import {
  CreateGuardianReportDto,
  GuardianDecisionDto,
  GuardianDisputeDto,
  GuardianEvidenceDto,
  GuardianFindingDto,
  GuardianRepairDto,
  GuardianRevisionDto,
  GuardianVideoUploadDto,
} from './guardian.dto';

const UPLOAD_LIMIT = 32 * 1024 * 1024;

@Controller('guardian/staff')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class GuardianStaffController {
  constructor(private service: GuardianService) {}

  @Post('reports/:id/upload-intents')
  @Header('Cache-Control', 'no-store')
  @RequireCapabilities('inspection.perform')
  initiateVideo(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardianVideoUploadDto,
  ) {
    return this.service.initiateVideoUpload(user.id, user.agencyId, id, dto);
  }

  @Get('reports/:id/upload-intents')
  @Header('Cache-Control', 'no-store')
  @RequireCapabilities('inspection.perform')
  videoUploads(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listVideoUploads(user.id, user.agencyId, id);
  }

  @Post('reports/:id/upload-intents/:intentId/resume')
  @Header('Cache-Control', 'no-store')
  @RequireCapabilities('inspection.perform')
  resumeVideo(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('intentId', ParseUUIDPipe) intentId: string,
  ) {
    return this.service.resumeVideoUpload(user.id, user.agencyId, id, intentId);
  }

  @Post('reports/:id/upload-intents/:intentId/finalize')
  @Header('Cache-Control', 'no-store')
  @RequireCapabilities('inspection.perform')
  finalizeVideo(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('intentId', ParseUUIDPipe) intentId: string,
  ) {
    return this.service.finalizeVideoUpload(
      user.id,
      user.agencyId,
      id,
      intentId,
    );
  }

  @Post('reports/:id/upload-intents/:intentId/cancel')
  @Header('Cache-Control', 'no-store')
  @RequireCapabilities('inspection.perform')
  cancelVideo(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('intentId', ParseUUIDPipe) intentId: string,
  ) {
    return this.service.cancelVideoUpload(user.id, user.agencyId, id, intentId);
  }

  @Post('reports')
  @RequireCapabilities('inspection.perform')
  create(@CurrentUser() user: any, @Body() dto: CreateGuardianReportDto) {
    return this.service.create(user.agencyId, user.id, dto);
  }
  @Get('booking/:bookingId')
  @RequireCapabilities('booking.view')
  booking(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.service.staffBooking(user.agencyId, bookingId);
  }
  @Get('reports/:id')
  @RequireCapabilities('booking.view')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getStaff(user.agencyId, id);
  }
  @Get('cars/:carId/active-damage')
  @RequireCapabilities('fleet.view')
  activeDamage(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.service.activeCarDamage(user.agencyId, carId);
  }
  @Post('reports/:id/evidence')
  @RequireCapabilities('inspection.perform')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: UPLOAD_LIMIT } }),
  )
  upload(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GuardianEvidenceDto,
  ) {
    if (!file) throw new BadRequestException('File is required.');
    return this.service.upload(
      user.id,
      'AGENCY',
      id,
      dto.kind,
      file,
      user.agencyId,
      dto.revision,
    );
  }
  @Get('reports/:id/media/:evidenceId/url')
  @RequireCapabilities('booking.view')
  media(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.service.mediaUrl(
      user.id,
      'AGENCY',
      id,
      evidenceId,
      user.agencyId,
    );
  }
  @Post('reports/:id/findings')
  @RequireCapabilities('inspection.perform')
  add(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianFindingDto,
  ) {
    return this.service.finding(user.id, 'AGENCY', id, dto, user.agencyId);
  }
  @Post('reports/:id/findings/:findingId/decision')
  @RequireCapabilities('inspection.perform')
  decide(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Body() dto: GuardianDecisionDto,
  ) {
    return this.service.decide(
      user.agencyId,
      user.id,
      id,
      findingId,
      dto.decision,
      dto.note,
      dto.revision,
    );
  }
  @Post('reports/:id/findings/:findingId/repair')
  @RequireCapabilities('fleet.manage')
  repair(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Body() dto: GuardianRepairDto,
  ) {
    return this.service.repair(
      user.agencyId,
      user.id,
      id,
      findingId,
      dto.photoId,
      dto.revision,
    );
  }
  @Post('reports/:id/reopen')
  @RequireCapabilities('inspection.perform')
  reopen(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianDisputeDto,
  ) {
    return this.service.reopen(
      user.agencyId,
      user.id,
      id,
      dto.note,
      dto.revision,
    );
  }
  @Post('reports/:id/publish')
  @RequireCapabilities('inspection.perform')
  publish(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianRevisionDto,
  ) {
    return this.service.publish(user.agencyId, user.id, id, dto.revision);
  }
}

@Controller('guardian/customer')
@UseGuards(AuthGuard, RenterGuard)
export class GuardianCustomerController {
  constructor(private service: GuardianService) {}
  @Get('reports')
  list(@CurrentUser() user: any) {
    return this.service.listCustomer(user.id);
  }
  @Get('reports/:id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getCustomer(user.id, id);
  }
  @Post('reports/:id/evidence')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: UPLOAD_LIMIT } }),
  )
  upload(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GuardianEvidenceDto,
  ) {
    if (!file) throw new BadRequestException('File is required.');
    return this.service.upload(
      user.id,
      'CUSTOMER',
      id,
      dto.kind,
      file,
      undefined,
      dto.revision,
    );
  }
  @Get('reports/:id/media/:evidenceId/url')
  media(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.service.mediaUrl(user.id, 'CUSTOMER', id, evidenceId);
  }
  @Post('reports/:id/findings')
  add(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianFindingDto,
  ) {
    return this.service.finding(user.id, 'CUSTOMER', id, dto);
  }
  @Post('reports/:id/approve')
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianRevisionDto,
  ) {
    return this.service.approveCustomer(user.id, id, dto.revision);
  }
  @Post('reports/:id/dispute')
  dispute(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianDisputeDto,
  ) {
    return this.service.disputeCustomer(user.id, id, dto.note, dto.revision);
  }
}
