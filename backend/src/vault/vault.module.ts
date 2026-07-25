import { Module } from '@nestjs/common';
import { VaultService } from './vault.service';
import { VaultStorageService } from './vault-storage.service';
import { VaultController } from './vault.controller';

@Module({
  providers: [VaultService, VaultStorageService],
  controllers: [VaultController],
  // RenterDocument reuses VaultStorageService directly (same Supabase
  // bucket/mechanics) without going through VaultFile/VaultService — see
  // portal.module.ts + portal.service.ts.
  exports: [VaultStorageService],
})
export class VaultModule {}
