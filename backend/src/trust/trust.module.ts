import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustService } from './trust.service';
import { TrustController } from './trust.controller';

// @Global so BookingsService and CustomersService can inject TrustService
// without editing their module imports (same pattern as AuditLogs/Webhooks).
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [TrustController],
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
