import { AutomotiveTelemetryService } from './automotive-telemetry.service';

describe('AutomotiveTelemetryService', () => {
  let service: AutomotiveTelemetryService;

  beforeEach(() => {
    service = new AutomotiveTelemetryService();
  });

  describe('VIN Sanitization', () => {
    it('masks middle characters of standard 17-character VIN', () => {
      const vin = 'VF1BB0A0512345678';
      const masked = service.sanitizeVin(vin);
      expect(masked).toBe('VF1***5678');
      expect(masked).not.toContain('0A0512');
    });

    it('handles short or empty VIN gracefully without leaking PII', () => {
      expect(service.sanitizeVin(null)).toBe('UNKNOWN_VIN');
      expect(service.sanitizeVin(undefined)).toBe('UNKNOWN_VIN');
      expect(service.sanitizeVin('')).toBe('UNKNOWN_VIN');
      expect(service.sanitizeVin('1234')).toBe('***');
    });
  });

  describe('W3C TraceContext Generation and Parsing', () => {
    it('generates valid 32-char hex trace ID and 16-char hex span ID', () => {
      const traceId = service.generateTraceId();
      const spanId = service.generateSpanId();

      expect(traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(spanId).toMatch(/^[0-9a-f]{16}$/);
    });

    it('formats and parses W3C traceparent headers correctly', () => {
      const traceId = service.generateTraceId();
      const spanId = service.generateSpanId();
      const header = service.formatTraceparent(traceId, spanId, true);

      expect(header).toBe(`00-${traceId}-${spanId}-01`);

      const parsed = service.parseTraceparent(header);
      expect(parsed).not.toBeNull();
      expect(parsed?.traceId).toBe(traceId);
      expect(parsed?.parentId).toBe(spanId);
      expect(parsed?.sampled).toBe(true);
    });

    it('returns null for malformed traceparent headers', () => {
      expect(service.parseTraceparent('invalid-header')).toBeNull();
      expect(service.parseTraceparent('01-trace-span-01')).toBeNull();
      expect(service.parseTraceparent(undefined)).toBeNull();
    });
  });

  describe('Structured Automotive Event Emitting', () => {
    it('emits OBD connection event with masked VIN', () => {
      const spy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      service.logObdConnected({
        agencyId: 'agency-123',
        sessionId: 'session-456',
        adapterType: 'BLE',
        protocol: 'ISO 15765-4 (CAN 11/500)',
        supportedPidsCount: 24,
        vin: 'VF1BB0A0512345678',
      });

      expect(spy).toHaveBeenCalled();
      const logPayload = JSON.parse(spy.mock.calls[0][0] as string);
      expect(logPayload.event).toBe('AUTOMOTIVE_OBD_CONNECTED');
      expect(logPayload.vin).toBe('VF1***5678');
      expect(logPayload.supportedPidsCount).toBe(24);
      spy.mockRestore();
    });

    it('emits DTC detected warning event', () => {
      const spy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

      service.logDtcDetected({
        agencyId: 'agency-123',
        sessionId: 'session-456',
        dtcs: [{ code: 'P0301' }, { code: 'P0171' }],
        vin: 'VF1BB0A0512345678',
      });

      expect(spy).toHaveBeenCalled();
      const logPayload = JSON.parse(spy.mock.calls[0][0] as string);
      expect(logPayload.event).toBe('AUTOMOTIVE_DTC_DETECTED');
      expect(logPayload.dtcCount).toBe(2);
      expect(logPayload.dtcCodes).toEqual(['P0301', 'P0171']);
      spy.mockRestore();
    });

    it('emits Post-Repair Gate verification event', () => {
      const spy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      service.logPostRepairGateVerified({
        agencyId: 'agency-123',
        workOrderId: 'wo-789',
        dtcCleared: true,
        passed: true,
        actorId: 'user-001',
      });

      expect(spy).toHaveBeenCalled();
      const logPayload = JSON.parse(spy.mock.calls[0][0] as string);
      expect(logPayload.event).toBe('AUTOMOTIVE_POST_REPAIR_GATE_VERIFIED');
      expect(logPayload.passed).toBe(true);
      expect(logPayload.dtcCleared).toBe(true);
      spy.mockRestore();
    });
  });
});

describe('incoming trace context validation', () => {
  const telemetry = new AutomotiveTelemetryService();
  const trace = '1'.repeat(32);
  const span = '2'.repeat(16);
  it.each([
    `00-${'0'.repeat(32)}-${span}-01`,
    `00-${trace}-${'0'.repeat(16)}-01`,
    `00-${'x'.repeat(32)}-${span}-01`,
    `00-${trace}-${span}-z1`,
  ])('regenerates invalid contexts', header => {
    expect(telemetry.parseTraceparent(header)).toBeNull();
  });
});
