import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiOperationsController } from './ai-operations.controller';
import { AiGovernanceController } from './ai-governance.controller';
import { AiGovernanceService } from './ai-governance.service';
import { AiOperationsService } from './ai-operations.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiOperationsController, AiGovernanceController],
  providers: [AiOperationsService, AiGovernanceService],
  exports: [AiOperationsService, AiGovernanceService],
})
export class AiOperationsModule {}
