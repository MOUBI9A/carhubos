import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller';
import { DiagnosticsService } from './diagnostics.service';
import { AnthropicDiagnosticProvider } from './providers/anthropic.provider';
import { DiagnosticReportService } from './reports/diagnostic-report.service';
@Module({
  controllers: [DiagnosticsController],
  providers: [
    DiagnosticsService,
    DiagnosticReportService,
    {
      provide: 'DIAGNOSTIC_REASONING_PROVIDER',
      useFactory: () => new AnthropicDiagnosticProvider(),
    },
  ],
})
export class DiagnosticsModule {}
