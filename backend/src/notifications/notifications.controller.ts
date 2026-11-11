import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterPushTokenDto } from './dto/push-token.dto';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-token')
  @HttpCode(HttpStatus.OK)
  async registerPushToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationsService.registerPushToken(user.id, dto);
  }

  @Get()
  async getNotifications(@CurrentUser() user: any) {
    return this.notificationsService.listUserNotifications(user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  async markRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markNotificationRead(user.id, id);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Get('whatsapp-link')
  getWhatsAppLink(
    @Query('type') type: string,
    @Query('customerName') customerName?: string,
    @Query('carModel') carModel?: string,
    @Query('plate') plate?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('totalPrice') totalPrice?: string,
    @Query('phone') phone?: string,
    @Query('docType') docType?: string,
    @Query('expiryDate') expiryDate?: string,
  ) {
    return this.notificationsService.getWhatsAppLink(type, {
      customerName,
      carModel,
      plate,
      startDate,
      endDate,
      totalPrice,
      phone,
      docType,
      expiryDate,
    });
  }
}
