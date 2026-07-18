import { Module } from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { SaasAdminController } from './saas-admin.controller';
import { ReportsController } from './reports.controller';
import { ForensicService } from './forensic.service';

@Module({
  providers: [SaasAdminService, ForensicService],
  controllers: [SaasAdminController, ReportsController],
})
export class SaasAdminModule {}
