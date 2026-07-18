import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from '../integrations/twilio/twilio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustService } from '../trust/trust.service';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private prisma: PrismaService,
    private twilio: TwilioService,
    private notifications: NotificationsService,
    private trust: TrustService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDocumentExpiryChecks() {
    this.logger.log('Running automated document expiry checks...');

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const expiringSoon = await this.prisma.carDocument.findMany({
      where: {
        expiryDate: { lte: nextWeek },
        status: 'VALID',
      },
      include: { car: { include: { agency: true } } },
    });

    for (const doc of expiringSoon) {
      this.logger.warn(
        `Document ${doc.type} for car ${doc.car.licensePlate} is expiring soon!`,
      );

      // 1. Create an automated task for employees
      const title = `Renew ${doc.type}`;
      const existingTask = await this.prisma.task.findFirst({
        where: { agencyId: doc.car.agencyId, title, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        select: { id: true },
      });
      if (!existingTask) {
        await this.prisma.task.create({
          data: {
            title,
            description: `Car: ${doc.car.brand} ${doc.car.model} (${doc.car.licensePlate}). Expiry: ${doc.expiryDate.toLocaleDateString()}`,
            priority: 'HIGH',
            status: 'PENDING',
            agencyId: doc.car.agencyId,
          },
        });
      }

      // 2. BP Pillar D: Send real WhatsApp nudge to the Agency Owner
      const daysLeft = Math.ceil((doc.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const agencyPhone = doc.car.agency.businessPhone?.trim();
      if (!agencyPhone) {
        this.logger.warn(`Skipping WhatsApp alert for agency ${doc.car.agencyId}: no phone configured.`);
        continue;
      }
      
      const message = await this.notifications.getWhatsAppLink('GUARDIAN_ALERT', {
        carBrand: doc.car.brand,
        carModel: doc.car.model,
        plate: doc.car.licensePlate,
        docType: doc.type,
        daysLeft,
        phone: agencyPhone,
      });

      // Extract raw message from link (for real twilio send)
      const rawText = decodeURIComponent(message.split('text=')[1]);
      await this.twilio.sendWhatsAppMessage(agencyPhone, rawText);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueReturns() {
    this.logger.log('Checking for overdue returns...');

    const now = new Date();

    const overdueBookings = await this.prisma.booking.findMany({
      where: {
        endDate: { lt: now },
        status: 'ACTIVE',
      },
      include: { customer: true, car: true },
    });

    for (const booking of overdueBookings) {
      const markedOverdue = await this.prisma.booking.updateMany({
        where: { id: booking.id, status: 'ACTIVE' },
        data: { status: 'OVERDUE' },
      });
      if (!markedOverdue.count) continue;

      this.logger.error(
        `Booking ${booking.id} is OVERDUE! Customer: ${booking.customer.firstName}`,
      );

      // 1. Create urgent task
      await this.prisma.task.create({
        data: {
          title: `Overdue Return: ${booking.car.licensePlate}`,
          description: `Customer ${booking.customer.firstName} ${booking.customer.lastName} was supposed to return the car at ${booking.endDate.toLocaleDateString()}.`,
          priority: 'URGENT',
          status: 'PENDING',
          agencyId: booking.agencyId,
        },
      });

      // 2. Send real WhatsApp alert to the Customer
      const message = await this.notifications.getWhatsAppLink('OVERDUE_RETURN', {
        customerName: booking.customer.firstName,
        carModel: booking.car.model,
        plate: booking.car.licensePlate,
        endDate: booking.endDate.toLocaleDateString(),
        phone: booking.customer.phone,
      });

      const rawText = decodeURIComponent(message.split('text=')[1]);
      await this.twilio.sendWhatsAppMessage(booking.customer.phone, rawText);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBlacklistExpiry() {
    const result = await this.trust.expireBlacklistEntries();
    if (result.expired) this.logger.log(`Expired ${result.expired} blacklist entrie(s).`);
  }
}
