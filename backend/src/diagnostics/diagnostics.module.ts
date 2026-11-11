import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller';
import { DiagnosticsService } from './diagnostics.service';
import { AnthropicDiagnosticProvider } from './providers/anthropic.provider';
import { DiagnosticReportService } from './reports/diagnostic-report.service';
import { AutomotiveKnowledgeService } from './knowledge/automotive-knowledge.service';
import { AutomotiveTelemetryService } from '../common/telemetry/automotive-telemetry.service';

@Module({
  controllers: [DiagnosticsController],
  providers: [
    DiagnosticsService,
    DiagnosticReportService,
    AutomotiveKnowledgeService,
    AutomotiveTelemetryService,
    {
      provide: 'DIAGNOSTIC_REASONING_PROVIDER',
      useFactory: () => new AnthropicDiagnosticProvider(),
    },
  ],
  exports: [DiagnosticsService, AutomotiveKnowledgeService, AutomotiveTelemetryService],
})
export class DiagnosticsModule {}

