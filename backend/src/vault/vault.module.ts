import { Module } from '@nestjs/common';
import { VaultService } from './vault.service';
import { VaultStorageService } from './vault-storage.service';
import { VaultController } from './vault.controller';

@Module({
  providers: [VaultService, VaultStorageService],
  controllers: [VaultController],
})
export class VaultModule {}
