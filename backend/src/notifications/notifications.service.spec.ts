import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {};
    service = new NotificationsService(prisma);
  });

  describe('getWhatsAppLink', () => {
    it('generates a valid WhatsApp URL for DAILY_HEALTH', async () => {
      const url = await service.getWhatsAppLink('DAILY_HEALTH', {
        phone: '+212612345678',
        agencyName: 'Atlas Rent',
        revenue: '15000',
        profit: '8500',
        utilization: '85',
        activeCount: '12',
        overdue: '1',
        expiring: '0',
      });

      expect(url).toContain('https://wa.me/212612345678?text=');
      expect(url).toContain(encodeURIComponent('Daily Pulse'));
      expect(url).toContain(encodeURIComponent('Atlas Rent'));
      expect(url).toContain(encodeURIComponent('15000 MAD'));
    });

    it('generates a valid WhatsApp URL for BOOKING_CONFIRMED', async () => {
      const url = await service.getWhatsAppLink('BOOKING_CONFIRMED', {
        phone: '0612345678',
        customerName: 'Karim',
        carModel: 'Clio 5',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        totalPrice: '1600',
      });

      expect(url).toContain('https://wa.me/0612345678?text=');
      expect(url).toContain(encodeURIComponent('Karim'));
      expect(url).toContain(encodeURIComponent('Clio 5'));
      expect(url).toContain(encodeURIComponent('1600 MAD'));
    });

    it('generates a valid WhatsApp URL for OVERDUE_RETURN', async () => {
      const url = await service.getWhatsAppLink('OVERDUE_RETURN', {
        phone: '+212699887766',
        customerName: 'Hamza',
        carModel: 'Duster',
        plate: '12345-A-1',
        endDate: '2026-11-04 18:00',
      });

      expect(url).toContain('https://wa.me/212699887766?text=');
      expect(url).toContain(encodeURIComponent('URGENT: Return Overdue'));
      expect(url).toContain(encodeURIComponent('12345-A-1'));
    });

    it('generates a valid WhatsApp URL for GUARDIAN_ALERT', async () => {
      const url = await service.getWhatsAppLink('GUARDIAN_ALERT', {
        phone: '0655443322',
        carBrand: 'Peugeot',
        carModel: '208',
        plate: '54321-B-26',
        docType: 'ASSURANCE',
        daysLeft: '5',
      });

      expect(url).toContain('https://wa.me/0655443322?text=');
      expect(url).toContain(encodeURIComponent('Guardian Alert'));
      expect(url).toContain(encodeURIComponent('EXPIRES IN 5 DAYS'));
    });

    it('throws BadRequestException when phone is missing or blank', async () => {
      await expect(
        service.getWhatsAppLink('BOOKING_CONFIRMED', {
          phone: '',
          customerName: 'Karim',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.getWhatsAppLink('BOOKING_CONFIRMED', {
          customerName: 'Karim',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
