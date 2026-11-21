import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiOperationsController } from './ai-operations.controller';
import { AiOperationsService } from './ai-operations.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiOperationsController],
  providers: [AiOperationsService],
  exports: [AiOperationsService],
})
export class AiOperationsModule {}
