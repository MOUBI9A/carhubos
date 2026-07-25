import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsentModule } from '../consent/consent.module';
import { UsersModule } from '../users/users.module';
import { VaultModule } from '../vault/vault.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

// PrismaModule is @Global and AuthGuard's JwtService comes from the global
// JwtModule; both are imported/available. ConsentModule is imported so the
// portal can drive renter-side consent (list/approve/revoke) via ConsentService.
// UsersModule is imported so the portal can (re)issue the caller's own Trust
// Vault QR via the existing, already-hardened UsersService.generateTrustQr.
// VaultModule is imported so the renter's own document uploads can reuse
// VaultStorageService (same Supabase bucket/mechanics as the agency Vault).
@Module({
  imports: [PrismaModule, ConsentModule, UsersModule, VaultModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
