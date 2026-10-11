import { Module } from '@nestjs/common';
import { AiVisionController } from './ai-vision.controller';
import { AiVisionService } from './ai-vision.service';
import { SimulationVisionProvider } from './providers/simulation-vision.provider';
import { CloudVisionProvider } from './providers/cloud-vision.provider';

@Module({
  controllers: [AiVisionController],
  providers: [
    AiVisionService,
    SimulationVisionProvider,
    CloudVisionProvider,
  ],
  exports: [AiVisionService],
})
export class AiVisionModule {}
