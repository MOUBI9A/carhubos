import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto, ListCarsQueryDto, UpdateCarDto } from './dto/cars.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('cars')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @RequireCapabilities('fleet.manage')
  create(@CurrentUser() user: any, @Body() createCarDto: CreateCarDto) {
    return this.carsService.create(user.agencyId, createCarDto, user.id);
  }

  @Get()
  @RequireCapabilities('fleet.view')
  findAll(@CurrentUser() user: any, @Query() query: ListCarsQueryDto) {
    return this.carsService.findAll(user.agencyId, query);
  }

  @Get(':id')
  @RequireCapabilities('fleet.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.carsService.findOneDetailed(user.agencyId, id);
  }

  @Patch(':id')
  @RequireCapabilities('fleet.manage')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateCarDto: UpdateCarDto) {
    return this.carsService.update(user.agencyId, id, updateCarDto, user.id);
  }

  @Delete(':id')
  @RequireCapabilities('fleet.manage')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.carsService.remove(user.agencyId, id, user.id);
  }
}
