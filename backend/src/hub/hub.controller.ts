import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { HubService } from './hub.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('hub')
@UseGuards(AuthGuard)
export class HubController {
  constructor(private readonly hubService: HubService) {}

  @Post('list')
  listAsset(
    @CurrentUser() user: any,
    @Body() data: { carId: string; b2bRate: number },
  ) {
    return this.hubService.listAsset(user.agencyId, data.carId, data.b2bRate);
  }

  @Get('discover')
  discoverAssets(@CurrentUser() user: any) {
    return this.hubService.discoverAssets(user.agencyId);
  }
}
