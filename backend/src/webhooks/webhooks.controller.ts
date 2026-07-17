import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('webhooks')
@UseGuards(AuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body() data: { url: string; event: string; secret?: string }) {
    return this.webhooksService.subscribe(user.agencyId, data);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.webhooksService.findAll(user.agencyId);
  }

  @Delete(':id')
  unsubscribe(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.unsubscribe(id, user.agencyId);
  }
}
