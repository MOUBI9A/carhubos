import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationEngine } from './automation-engine.service';
import { AutomationsController } from './automations.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationEngine],
  // Exported so request-path services (e.g. bookings for BOOKING_CREATED) can
  // inject the engine later — it depends only on Prisma, so no circular risk.
  exports: [AutomationEngine],
})
export class AutomationsModule {}
