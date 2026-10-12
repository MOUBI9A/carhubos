import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushTokenDto } from './dto/push-token.dto';

interface DeviceTokenRecord {
  token: string;
  platform: string;
  deviceId?: string;
  registeredAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // User ID -> Map of Device Tokens
  private readonly deviceTokens = new Map<string, Map<string, DeviceTokenRecord>>();

  constructor(private prisma: PrismaService) {}

  /**
   * Register a mobile push notification token (Expo Push Token, APNs, FCM)
   * for an authenticated user.
   */
  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    if (!this.deviceTokens.has(userId)) {
      this.deviceTokens.set(userId, new Map());
    }

    const userTokens = this.deviceTokens.get(userId)!;
    userTokens.set(dto.token, {
      token: dto.token,
      platform: dto.platform,
      deviceId: dto.deviceId,
      registeredAt: new Date(),
    });

    this.logger.log(`Registered push token for user ${userId} on ${dto.platform}`);

    return {
      success: true,
      message: 'Push token successfully registered.',
      token: dto.token,
      platform: dto.platform,
    };
  }

  /**
   * List notifications for the authenticated user, newest first.
   */
  async listUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark a notification as read. Strictly scoped by userId to prevent IDOR.
   */
  async markNotificationRead(userId: string, notificationId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    if (res.count === 0) {
      throw new NotFoundException('Notification not found.');
    }

    return { id: notificationId, read: true };
  }

  /**
   * Mark all notifications as read for the user.
   */
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true };
  }

  /**
   * Get unread notification count for the user.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { unreadCount: count };
  }

  async getWhatsAppLink(type: string, data: any) {
    let message = '';

    switch (type) {
      case 'DAILY_HEALTH':
        message = `📊 *Fider: Daily Pulse*\n\nAgency: ${data.agencyName}\nDate: ${new Date().toLocaleDateString()}\n\n💰 *Finance*\n- Revenue MTD: ${data.revenue} MAD\n- Net Profit: ${data.profit} MAD\n\n🚗 *Fleet*\n- Utilization: ${data.utilization}%\n- Active Rentals: ${data.activeCount}\n\n⚠️ *Risk Alert*\n- Overdue Returns: ${data.overdue}\n- Expiring Docs: ${data.expiring}\n\n*Benchmark:* Business running smoothly. View full details on your dashboard.`;
        break;

      case 'BOOKING_CONFIRMED':
        message = `🚗 *Fider Confirmation*\n\nHello ${data.customerName},\nYour booking for the ${data.carModel} has been confirmed!\nPeriod: ${data.startDate} to ${data.endDate}\nTotal: ${data.totalPrice} MAD\n\n📍 See you at your agency.`;
        break;

      case 'OVERDUE_RETURN':
        message = `⚠️ *URGENT: Return Overdue*\n\nHello ${data.customerName},\nOur system shows that the ${data.carModel} (${data.plate}) was due for return at ${data.endDate}.\nPlease contact your rental agency immediately to avoid additional fees.`;
        break;

      case 'GUARDIAN_ALERT':
        message = `🛡️ *Fider Guardian Alert*\n\nAsset: *${data.carBrand} ${data.carModel}*\nPlate: *${data.plate}*\nIssue: *${data.docType} EXPIRES IN ${data.daysLeft} DAYS*\n\n*Action:* Please renew this document immediately to prevent a platform lock on this vehicle.`;
        break;

      default:
        message = `Hello, this is regarding your car rental.`;
    }

    const phone = String(data.phone || '').trim();
    if (!phone) throw new BadRequestException('A recipient phone number is required.');
    return `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
  }
}
