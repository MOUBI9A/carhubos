import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiOperationsController } from './ai-operations.controller';
import { AiGovernanceController } from './ai-governance.controller';
import { AiGovernanceService } from './ai-governance.service';
import { AiOperationsService } from './ai-operations.service';
import { AiPlatformControlsController } from './ai-platform-controls.controller';
import { AiPlatformControlsService } from './ai-platform-controls.service';
import { AiReadToolsController } from './ai-read-tools.controller';
import { AiReadToolsService } from './ai-read-tools.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiOperationsController, AiGovernanceController, AiPlatformControlsController, AiReadToolsController],
  providers: [AiOperationsService, AiGovernanceService, AiPlatformControlsService, AiReadToolsService],
  exports: [AiOperationsService, AiGovernanceService, AiReadToolsService],
})
export class AiOperationsModule {}
