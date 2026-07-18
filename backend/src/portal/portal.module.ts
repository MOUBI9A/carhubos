import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsentModule } from '../consent/consent.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

// PrismaModule is @Global and AuthGuard's JwtService comes from the global
// JwtModule; both are imported/available. ConsentModule is imported so the
// portal can drive renter-side consent (list/approve/revoke) via ConsentService.
@Module({
  imports: [PrismaModule, ConsentModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
