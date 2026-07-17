import { Module, Global } from '@nestjs/common';
import { PdfEngineService } from './pdf-engine.service';

@Global()
@Module({
  providers: [PdfEngineService],
  exports: [PdfEngineService],
})
export class PdfEngineModule {}
