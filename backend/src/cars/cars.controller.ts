import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto, UpdateCarDto } from './dto/cars.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('cars')
@UseGuards(AuthGuard)
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createCarDto: CreateCarDto) {
    return this.carsService.create(user.agencyId, createCarDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.carsService.findAll(user.agencyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.carsService.findOneDetailed(user.agencyId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateCarDto: UpdateCarDto) {
    return this.carsService.update(user.agencyId, id, updateCarDto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.carsService.remove(user.agencyId, id, user.id);
  }
}
