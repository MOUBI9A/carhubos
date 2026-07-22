import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AutomationsController],
  providers: [AutomationsService],
})
export class AutomationsModule {}
