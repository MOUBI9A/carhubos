import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { InspectionsService } from './inspections.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

class CreateInspectionDto {
  @IsIn(['PRE_RENTAL', 'POST_RENTAL'])
  type!: string;

  @IsInt()
  @Min(0)
  fuelLevel!: number;

  @IsInt()
  @Min(0)
  mileage!: number;

  @IsOptional()
  @IsString()
  damages?: string;

  @IsOptional()
  @IsString()
  photos?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @MinLength(1)
  carId!: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}

@Controller('inspections')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  @RequireCapabilities('inspection.perform')
  create(@CurrentUser() user: any, @Body() data: CreateInspectionDto) {
    return this.inspectionsService.create(user.agencyId, {
      ...data,
      inspectorId: user.sub,
    });
  }

  @Get('car/:carId')
  @RequireCapabilities('fleet.view')
  findByCar(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.inspectionsService.findByCar(user.agencyId, carId);
  }

  @Get('booking/:bookingId')
  @RequireCapabilities('booking.view')
  findByBooking(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.inspectionsService.findByBooking(user.agencyId, bookingId);
  }
}
