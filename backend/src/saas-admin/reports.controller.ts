import { Controller, Get, Param, Res, UseGuards, NotImplementedException } from '@nestjs/common';
import { PdfEngineService } from '../pdf-engine/pdf-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Response } from 'express';

@Controller('reports')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class ReportsController {
  constructor(
    private readonly pdfEngine: PdfEngineService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates and downloads a real PDF Contract for a booking.
   */
  @Get('contract/:bookingId')
  @RequireCapabilities('booking.view')
  async downloadContract(@CurrentUser() user: any, @Param('bookingId') bookingId: string, @Res() res: Response) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, agencyId: user.agencyId },
      include: {
        car: true,
        customer: true,
        agency: true,
      },
    });

    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    const pdfBuffer = await this.pdfEngine.generateContract(booking);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=contract-${bookingId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  /**
   * Generates a Fleet Health Audit PDF
   */
  @Get('fleet-audit')
  @RequireCapabilities('reports.view')
  async downloadFleetAudit(@Res() res: Response) {
    void res;
    throw new NotImplementedException('Fleet health audit report is not available yet.');
  }
}
