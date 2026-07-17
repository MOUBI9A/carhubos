import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getWhatsAppLink(type: string, data: any) {
    let message = '';

    switch (type) {
      case 'DAILY_HEALTH':
        message = `📊 *CarHub OS: Daily Pulse*\n\nAgency: ${data.agencyName}\nDate: ${new Date().toLocaleDateString()}\n\n💰 *Finance*\n- Revenue MTD: ${data.revenue} MAD\n- Net Profit: ${data.profit} MAD\n\n🚗 *Fleet*\n- Utilization: ${data.utilization}%\n- Active Rentals: ${data.activeCount}\n\n⚠️ *Risk Alert*\n- Overdue Returns: ${data.overdue}\n- Expiring Docs: ${data.expiring}\n\n*Benchmark:* Business running smoothly. View full details on your dashboard.`;
        break;

      case 'BOOKING_CONFIRMED':
        message = `🚗 *CarHub OS Confirmation*\n\nHello ${data.customerName},\nYour booking for the ${data.carModel} has been confirmed!\nPeriod: ${data.startDate} to ${data.endDate}\nTotal: ${data.totalPrice} MAD\n\n📍 See you at CIG CAR Casablanca.`;
        break;

      case 'OVERDUE_RETURN':
        message = `⚠️ *URGENT: Return Overdue*\n\nHello ${data.customerName},\nOur system shows that the ${data.carModel} (${data.plate}) was due for return at ${data.endDate}.\nPlease contact us immediately to avoid additional fees.\n\n📞 +212600000000`;
        break;

      case 'GUARDIAN_ALERT':
        message = `🛡️ *CarHub Guardian Alert*\n\nAsset: *${data.carBrand} ${data.carModel}*\nPlate: *${data.plate}*\nIssue: *${data.docType} EXPIRES IN ${data.daysLeft} DAYS*\n\n*Action:* Please renew this document immediately to prevent a platform Hard Lock on this vehicle.`;
        break;

      default:
        message = `Hello, this is regarding your car rental.`;
    }

    const phone = data.phone || '212600000000';
    return `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
  }
}
