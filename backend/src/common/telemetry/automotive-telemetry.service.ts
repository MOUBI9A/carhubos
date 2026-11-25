import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ObdConnectedEvent {
  agencyId: string;
  sessionId?: string;
  adapterType: 'BLE' | 'SERIAL' | 'WIFI' | 'USB' | 'SIMULATOR';
  protocol: string;
  supportedPidsCount: number;
  vin?: string;
}

export interface DtcDetectedEvent {
  agencyId: string;
  sessionId?: string;
  dtcs: Array<{ code: string; status?: string; system?: string }>;
  vin?: string;
}

export interface AiReasoningEvent {
  agencyId: string;
  sessionId: string;
  model: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostMAD?: number;
  findingsCount: number;
}

export interface WorkOrderTransitionEvent {
  agencyId: string;
  workOrderId: string;
  fromStatus: string;
  toStatus: string;
  durationInPreviousStateMs?: number;
  actorId?: string;
}

export interface PostRepairGateEvent {
  agencyId: string;
  workOrderId: string;
  dtcCleared: boolean;
  passed: boolean;
  actorId?: string;
  remainingDtcs?: string[];
}

export interface PartsMatchedEvent {
  agencyId: string;
  workOrderId?: string;
  sessionId?: string;
  query: string;
  matchCount: number;
  supplierNames: string[];
}

@Injectable()
export class AutomotiveTelemetryService {
  private readonly logger = new Logger('AutomotiveTelemetry');

  /**
   * Mask VIN to protect PII in telemetry pipelines.
   * e.g., 'VF1BB0A0512345678' -> 'VF1***5678'
   */
  sanitizeVin(vin?: string | null): string {
    if (!vin) return 'UNKNOWN_VIN';
    const trimmed = vin.trim();
    if (trimmed.length < 8) return '***';
    return `${trimmed.slice(0, 3)}***${trimmed.slice(-4)}`;
  }

  generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  parseTraceparent(header?: string): { traceId: string; parentId: string; sampled: boolean } | null {
    if (!header) return null;
    const match = /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/.exec(header.trim());
    if (!match || /^0+$/.test(match[1]) || /^0+$/.test(match[2])) return null;
    return { traceId: match[1], parentId: match[2], sampled: (parseInt(match[3], 16) & 1) === 1 };
  }

  formatTraceparent(traceId: string, spanId: string, sampled = true): string {
    return `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`;
  }

  logObdConnected(event: ObdConnectedEvent): void {
    this.logger.log(
      JSON.stringify({
        event: 'AUTOMOTIVE_OBD_CONNECTED',
        timestamp: new Date().toISOString(),
        agencyId: event.agencyId,
        sessionId: event.sessionId,
        adapterType: event.adapterType,
        protocol: event.protocol,
        supportedPidsCount: event.supportedPidsCount,
        vin: this.sanitizeVin(event.vin),
      }),
    );
  }

  logDtcDetected(event: DtcDetectedEvent): void {
    this.logger.warn(
      JSON.stringify({
        event: 'AUTOMOTIVE_DTC_DETECTED',
        timestamp: new Date().toISOString(),
        agencyId: event.agencyId,
        sessionId: event.sessionId,
        dtcCount: event.dtcs.length,
        dtcCodes: event.dtcs.map((d) => d.code),
        vin: this.sanitizeVin(event.vin),
      }),
    );
  }

  logAiReasoningCompleted(event: AiReasoningEvent): void {
    this.logger.log(
      JSON.stringify({
        event: 'AUTOMOTIVE_AI_REASONING_COMPLETED',
        timestamp: new Date().toISOString(),
        agencyId: event.agencyId,
        sessionId: event.sessionId,
        model: event.model,
        durationMs: event.durationMs,
        promptTokens: event.promptTokens ?? 0,
        completionTokens: event.completionTokens ?? 0,
        estimatedCostMAD: event.estimatedCostMAD ?? 0,
        findingsCount: event.findingsCount,
      }),
    );
  }

  logWorkOrderTransition(event: WorkOrderTransitionEvent): void {
    this.logger.log(
      JSON.stringify({
        event: 'AUTOMOTIVE_WORK_ORDER_TRANSITION',
        timestamp: new Date().toISOString(),
        agencyId: event.agencyId,
        workOrderId: event.workOrderId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        durationInPreviousStateMs: event.durationInPreviousStateMs ?? 0,
        actorId: event.actorId,
      }),
    );
  }

  logPostRepairGateVerified(event: PostRepairGateEvent): void {
    const level = event.passed ? 'log' : 'warn';
    this.logger[level](
      JSON.stringify({
        event: 'AUTOMOTIVE_POST_REPAIR_GATE_VERIFIED',
        timestamp: new Date().toISOString(),
        agencyId: event.agencyId,
        workOrderId: event.workOrderId,
        dtcCleared: event.dtcCleared,
        passed: event.passed,
        actorId: event.actorId,
        remainingDtcs: event.remainingDtcs ?? [],
      }),
    );
  }

  logPartsMatched(event: PartsMatchedEvent): void {
    this.logger.log(
      JSON.stringify({
        event: 'AUTOMOTIVE_PARTS_MATCHED',
        timestamp: new Date().toISOString(),
        agencyId: event.agencyId,
        workOrderId: event.workOrderId,
        sessionId: event.sessionId,
        query: event.query,
        matchCount: event.matchCount,
        suppliers: event.supplierNames,
      }),
    );
  }
}
