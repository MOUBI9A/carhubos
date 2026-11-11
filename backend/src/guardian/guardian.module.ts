import { Module } from '@nestjs/common';
import { VaultModule } from '../vault/vault.module';
import { GuardianService } from './guardian.service';
import { TwilioModule } from '../integrations/twilio/twilio.module';
import { GuardianPdfService } from './guardian-pdf.service';
import { GuardianCustomerPdfController, GuardianStaffPdfController } from './guardian-pdf.controller';
import { GuardianNotificationsService } from './guardian-notifications.service';
import { GuardianNotificationsController } from './guardian-notifications.controller';
import {
  GuardianCustomerController,
  GuardianStaffController,
} from './guardian.controller';

@Module({
  imports: [VaultModule, TwilioModule],
  providers: [GuardianService, GuardianPdfService, GuardianNotificationsService],
  controllers: [GuardianStaffController, GuardianCustomerController,
    GuardianStaffPdfController, GuardianCustomerPdfController, GuardianNotificationsController],
})
export class GuardianModule {}
