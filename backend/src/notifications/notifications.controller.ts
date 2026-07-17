import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
