import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  // AutomationsModule exports the Prisma-only AutomationEngine (no cycle:
  // AutomationsModule imports only NotificationsModule) so BOOKING_CREATED can
  // fire user automation rules.
  imports: [AutomationsModule],
  providers: [BookingsService],
  controllers: [BookingsController],
})
export class BookingsModule {}
