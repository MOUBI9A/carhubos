import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch, Res } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/bookings.dto';
import { CaptureDepositDto, UpdateDepositDto } from './dto/deposit.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Response } from 'express';

@Controller('bookings')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @RequireCapabilities('booking.create')
  create(@CurrentUser() user: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(
      user.agencyId,
      createBookingDto,
      user.id,
    );
  }

  @Get()
  @RequireCapabilities('booking.view')
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // Every param is optional and additive — omitting all of them returns the
    // same flat array as before (see BookingsService.findAll's doc comment).
    return this.bookingsService.findAll(user.agencyId, {
      status,
      from,
      to,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('pricing/quote')
  @RequireCapabilities('booking.view')
  getPricingQuote(
    @CurrentUser() user: any,
    @Query('carId') carId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('seasonality') seasonality?: string,
  ) {
    return this.bookingsService.getPricingQuote(user.agencyId, carId, startDate, endDate, {
      enableSeasonality: seasonality === 'true' || seasonality === '1',
    });
  }

  @Get(':id')
  @RequireCapabilities('booking.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.findOne(user.agencyId, id);
  }

  @Patch(':id/status')
  @RequireCapabilities('booking.manage')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(user.agencyId, id, dto.status, user.id);
  }

  /** Set deposit amount while still PENDING (contract-time capture). */
  @Post(':id/deposit')
  @RequireCapabilities('deposit.manage')
  captureDeposit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CaptureDepositDto,
  ) {
    return this.bookingsService.captureDeposit(user.agencyId, id, user.id, dto);
  }

  /** HOLD / RETURN / CLAIM deposit transitions. */
  @Patch(':id/deposit')
  @RequireCapabilities('deposit.manage')
  updateDeposit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateDepositDto,
  ) {
    return this.bookingsService.updateDeposit(user.agencyId, id, user.id, dto);
  }

  @Get(':id/contract')
  @RequireCapabilities('booking.view')
  async getContract(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.bookingsService.generateContractPdf(user.agencyId, id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=contract-${id.slice(0, 8)}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }
}
