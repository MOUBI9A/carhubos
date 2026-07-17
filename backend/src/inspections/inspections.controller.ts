import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('inspections')
@UseGuards(AuthGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.inspectionsService.create({
      ...data,
      inspectorId: user.sub,
    });
  }

  @Get('car/:carId')
  findByCar(@Param('carId') carId: string) {
    return this.inspectionsService.findByCar(carId);
  }

  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.inspectionsService.findByBooking(bookingId);
  }
}
