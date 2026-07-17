import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AutomationsService],
})
export class AutomationsModule {}
