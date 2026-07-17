import { Controller, Get, Param, Res, UseGuards, Query } from '@nestjs/common';
import { PdfEngineService } from '../pdf-engine/pdf-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import type { Response } from 'express';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly pdfEngine: PdfEngineService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates and downloads a real PDF Contract for a booking.
   */
  @Get('contract/:bookingId')
  async downloadContract(@Param('bookingId') bookingId: string, @Res() res: Response) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
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
  async downloadFleetAudit(@Res() res: Response) {
    // Logic for fleet health PDF would go here
    // For now, we return a 200 to confirm the route is ready
    return res.status(200).send('Fleet Health Logic Initialized');
  }
}
