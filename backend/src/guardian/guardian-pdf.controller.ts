import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RenterGuard } from '../portal/guards/renter.guard';
import { GuardianPdfService } from './guardian-pdf.service';

function download(
  res: Response,
  result: { buffer: Buffer; filename: string; revision: number },
) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${result.filename}"`,
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Guardian-Revision', String(result.revision));
  res.send(result.buffer);
}

@Controller('guardian/staff')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class GuardianStaffPdfController {
  constructor(private readonly service: GuardianPdfService) {}

  @Get('reports/:id/pdf')
  @RequireCapabilities('booking.view')
  async pdf(
    @CurrentUser() user: { agencyId?: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    download(res, await this.service.forStaff(user.agencyId, id));
  }
}

@Controller('guardian/customer')
@UseGuards(AuthGuard, RenterGuard)
export class GuardianCustomerPdfController {
  constructor(private readonly service: GuardianPdfService) {}

  @Get('reports/:id/pdf')
  async pdf(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    download(res, await this.service.forCustomer(user.id, id));
  }
}
