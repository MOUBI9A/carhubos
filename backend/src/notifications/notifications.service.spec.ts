import { NotificationsService } from './notifications.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new NotificationsService(prisma);
  });

  describe('registerPushToken', () => {
    it('registers an iOS push token for a user', async () => {
      const res = await service.registerPushToken('u1', {
        token: 'ExponentPushToken[xxxxxxxxxxxxxx]',
        platform: 'IOS',
        deviceId: 'iphone-15-pro',
      });

      expect(res.success).toBe(true);
      expect(res.platform).toBe('IOS');
      expect(res.token).toBe('ExponentPushToken[xxxxxxxxxxxxxx]');
    });

    it('registers an Android push token for a user', async () => {
      const res = await service.registerPushToken('u2', {
        token: 'ExponentPushToken[yyyyyyyyyyyyyy]',
        platform: 'ANDROID',
      });

      expect(res.success).toBe(true);
      expect(res.platform).toBe('ANDROID');
    });
  });

  describe('notifications list & read', () => {
    it('lists user notifications scoped by userId', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', title: 'Doc Expiring', userId: 'u1' },
      ]);

      const res = await service.listUserNotifications('u1');
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(res).toHaveLength(1);
    });

    it('marks notification as read scoped by userId', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.markNotificationRead('u1', 'n1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'u1' },
        data: { read: true },
      });
      expect(res).toEqual({ id: 'n1', read: true });
    });

    it('throws NotFoundException if notification does not belong to user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markNotificationRead('u1', 'n-other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns unread notification count', async () => {
      prisma.notification.count.mockResolvedValue(4);

      const res = await service.getUnreadCount('u1');
      expect(res.unreadCount).toBe(4);
    });
  });
});
