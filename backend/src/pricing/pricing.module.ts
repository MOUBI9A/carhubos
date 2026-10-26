import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { RateRulesService } from './rate-rules.service';

// @Global so BookingsService can inject PricingService without editing its
// module imports — same pattern as TrustModule/AuditLogsModule.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [PricingController],
  providers: [PricingService, RateRulesService],
  exports: [PricingService, RateRulesService],
})
export class PricingModule {}
