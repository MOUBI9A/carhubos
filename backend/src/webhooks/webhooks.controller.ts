import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { SubscribeWebhookDto } from './dto/subscribe-webhook.dto';

/**
 * Webhook subscription management. Every handler is gated on `settings.manage`
 * (an owner-level capability — excluded from the MANAGER and AGENT presets) so
 * configuring/reading/removing outbound webhooks is not open to every
 * authenticated role. Managing webhooks is an agency-integration/settings
 * concern; `settings.manage` is the existing capability that fits, and it is
 * already held by existing OWNER memberships (no re-seed required).
 */
@Controller('webhooks')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('subscribe')
  @RequireCapabilities('settings.manage')
  subscribe(@CurrentUser() user: any, @Body() data: SubscribeWebhookDto) {
    return this.webhooksService.subscribe(user.agencyId, data);
  }

  @Get()
  @RequireCapabilities('settings.manage')
  findAll(@CurrentUser() user: any) {
    return this.webhooksService.findAll(user.agencyId);
  }

  @Delete(':id')
  @RequireCapabilities('settings.manage')
  unsubscribe(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.unsubscribe(id, user.agencyId);
  }
}
