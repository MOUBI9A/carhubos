import { Module } from '@nestjs/common';
import { AccidentsService } from './accidents.service';
import { AccidentsController } from './accidents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfEngineModule } from '../pdf-engine/pdf-engine.module';

@Module({
  imports: [PrismaModule, PdfEngineModule],
  controllers: [AccidentsController],
  providers: [AccidentsService],
  exports: [AccidentsService],
})
export class AccidentsModule {}
