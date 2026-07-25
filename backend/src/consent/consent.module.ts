import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VaultModule } from '../vault/vault.module';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';

// AuthGuard's JwtService comes from the globally-registered JwtModule
// (auth.module, `global: true`); PrismaModule is @Global. Import PrismaModule
// explicitly to mirror sibling feature modules. ConsentService is exported so
// the renter portal can drive approve/revoke/list from /portal/consent/*.
// VaultModule is imported so an agency's consented document read can also get
// a signed download URL, reusing VaultStorageService.
@Module({
  imports: [PrismaModule, VaultModule],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
