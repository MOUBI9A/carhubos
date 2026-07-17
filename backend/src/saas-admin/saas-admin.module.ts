import { Module } from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { SaasAdminController } from './saas-admin.controller';
import { ReportsController } from './reports.controller';

@Module({
  providers: [SaasAdminService],
  controllers: [SaasAdminController, ReportsController],
})
export class SaasAdminModule {}
