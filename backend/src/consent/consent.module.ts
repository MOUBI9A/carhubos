import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';

// AuthGuard's JwtService comes from the globally-registered JwtModule
// (auth.module, `global: true`); PrismaModule is @Global. Import PrismaModule
// explicitly to mirror sibling feature modules. ConsentService is exported so
// the renter portal can drive approve/revoke/list from /portal/consent/*.
@Module({
  imports: [PrismaModule],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
