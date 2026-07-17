import { Module } from '@nestjs/common';
import { RefusalLogsService } from './refusal-logs.service';
import { RefusalLogsController } from './refusal-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RefusalLogsController],
  providers: [RefusalLogsService],
  exports: [RefusalLogsService],
})
export class RefusalLogsModule {}
