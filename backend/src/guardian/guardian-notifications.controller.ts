import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { GuardianWhatsAppNotificationDto } from './guardian-notifications.dto';
import { GuardianNotificationsService } from './guardian-notifications.service';

@Controller('guardian/staff')
@UseGuards(AuthGuard, CapabilitiesGuard)
@RequireCapabilities('booking.view', 'booking.manage')
export class GuardianNotificationsController {
  constructor(private readonly notifications: GuardianNotificationsService) {}

  @Get('reports/:id/notifications/whatsapp')
  preview(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notifications.preview(user.agencyId, id);
  }

  @Post('reports/:id/notifications/whatsapp')
  send(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GuardianWhatsAppNotificationDto,
  ) {
    return this.notifications.send(user.agencyId, user.id, id, dto.revision);
  }
}
