import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { httpRouteLabel } from './safe-http';
import type { Request, Response } from 'express';
import { AutomotiveTelemetryService } from './automotive-telemetry.service';

@Injectable()
export class AutomotiveTelemetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AutomotiveAPM');

  constructor(private readonly telemetryService: AutomotiveTelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { traceId?: string }>();
    const res = http.getResponse<Response>();

    const rawTraceparent = req.header('traceparent');
    const parsed = this.telemetryService.parseTraceparent(rawTraceparent);

    const hex = req.header('x-trace-id');
    const decimal = req.header('x-datadog-trace-id');
    // Normalize Datadog's unsigned 64-bit ID to the 128-bit traceparent representation.
    const dd = decimal && /^[1-9][0-9]{0,19}$/.test(decimal) ? BigInt(decimal) : undefined;
    const traceId = parsed?.traceId ??
      (hex && /^[0-9a-f]{32}$/.test(hex) && !/^0+$/.test(hex) ? hex : undefined) ??
      (dd && dd <= 0xffffffffffffffffn ? dd.toString(16).padStart(32, '0') : undefined) ??
      this.telemetryService.generateTraceId();

    const spanId = this.telemetryService.generateSpanId();

    req.traceId = traceId;

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-Trace-Id', traceId);
      res.setHeader('traceparent', this.telemetryService.formatTraceparent(traceId, spanId, parsed?.sampled));
    }

    const start = Date.now();
    const path = httpRouteLabel(req);
    const isAutomotiveRoute = /^\/api\/(?:diagnostics|work-orders|parts)(?:\/|$)/.test(path);

    return next.handle().pipe(
      tap({
        next: () => {
          if (isAutomotiveRoute) {
            const durationMs = Date.now() - start;
            this.logger.log(
              JSON.stringify({
                event: 'AUTOMOTIVE_HTTP_SPAN',
                timestamp: new Date().toISOString(),
                traceId,
                spanId,
                method: req.method,
                path,
                statusCode: res.statusCode,
                durationMs,
              }),
            );
          }
        },
        error: (err: unknown) => {
          if (isAutomotiveRoute) {
            const durationMs = Date.now() - start;
            this.logger.warn(
              JSON.stringify({
                event: 'AUTOMOTIVE_HTTP_SPAN_ERROR',
                timestamp: new Date().toISOString(),
                traceId,
                spanId,
                method: req.method,
                path,
                statusCode: err instanceof HttpException ? err.getStatus() : 500,
                durationMs,
              }),
            );
          }
        },
      }),
    );
  }
}
