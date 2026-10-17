import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PredictiveMaintenanceService } from './predictive/predictive-maintenance.service';

@Module({
  imports: [PrismaModule, AnalyticsModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, PredictiveMaintenanceService],
  exports: [MaintenanceService, PredictiveMaintenanceService],
})
export class MaintenanceModule {}
