import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

class UpdateAgencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

@UseGuards(AuthGuard)
@Controller('agencies')
export class AgenciesController {
  constructor(private agenciesService: AgenciesService) {}

  @Get('me')
  getMyAgency(@CurrentUser() user: any) {
    return this.agenciesService.getMyAgency(user.agencyId);
  }

  @Patch('me')
  updateMyAgency(@CurrentUser() user: any, @Body() dto: UpdateAgencyDto) {
    return this.agenciesService.updateMyAgency(user.agencyId, dto);
  }

  @Get('me/stats')
  getStats(@CurrentUser() user: any) {
    return this.agenciesService.getStats(user.agencyId);
  }
}
