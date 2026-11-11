import type { Analysis } from '../obd/telemetry.types';
export interface DiagnosticReasoningProvider {
  readonly name: string;
  readonly configured: boolean;
  explain(
    context: Analysis,
    signal?: AbortSignal,
  ): Promise<{ narrative: string; evidenceIds: string[] }>;
}
// Genuine external reasoning is optional. The deterministic pipeline never
// claims that an unconfigured model/provider was invoked.
export class UnconfiguredDiagnosticProvider implements DiagnosticReasoningProvider {
  readonly name = 'UNCONFIGURED';
  readonly configured = false;
  async explain(): Promise<never> {
    throw new Error('No diagnostic AI provider is configured');
  }
}
