import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsNumber, IsString, Min } from 'class-validator';
import { HubService } from './hub.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

class ListAssetDto {
  @IsString()
  carId!: string;

  @IsNumber()
  @Min(0)
  b2bRate!: number;
}

@Controller('hub')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class HubController {
  constructor(private readonly hubService: HubService) {}

  @Post('list')
  @RequireCapabilities('hub.manage')
  listAsset(
    @CurrentUser() user: any,
    @Body() data: ListAssetDto,
  ) {
    return this.hubService.listAsset(user.agencyId, data.carId, data.b2bRate);
  }

  @Get('discover')
  @RequireCapabilities('fleet.view')
  discoverAssets(@CurrentUser() user: any) {
    return this.hubService.discoverAssets(user.agencyId);
  }
}
