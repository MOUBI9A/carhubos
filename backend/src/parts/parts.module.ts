import { Module } from '@nestjs/common';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { PARTS_PROVIDER } from './providers/parts-provider.interface';
import { MoroccoCatalogProvider } from './providers/morocco-catalog.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EntitlementsModule, AuthModule],
  controllers: [PartsController],
  providers: [
    PartsService,
    {
      provide: PARTS_PROVIDER,
      useClass: MoroccoCatalogProvider,
    },
  ],
  exports: [PartsService, PARTS_PROVIDER],
})
export class PartsModule {}
