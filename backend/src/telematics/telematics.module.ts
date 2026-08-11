import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TelematicsController } from './telematics.controller';
import { TelematicsService } from './telematics.service';

// PrismaModule is @Global, and AuditLogsService comes from the @Global
// AuditLogsModule — both are already available without importing them here.
@Module({
  imports: [PrismaModule],
  controllers: [TelematicsController],
  providers: [TelematicsService],
  exports: [TelematicsService],
})
export class TelematicsModule {}
