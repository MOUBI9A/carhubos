import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { AutomotiveTelemetryService } from './automotive-telemetry.service';

@Injectable()
export class AutomotiveTelemetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AutomotiveAPM');

  constructor(private readonly telemetryService: AutomotiveTelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { agencyId?: string; id?: string }; traceId?: string }>();
    const res = http.getResponse<Response>();

    const rawTraceparent = req.header('traceparent');
    const parsed = this.telemetryService.parseTraceparent(rawTraceparent);

    const traceId =
      parsed?.traceId ||
      req.header('x-trace-id') ||
      req.header('x-datadog-trace-id') ||
      this.telemetryService.generateTraceId();

    const spanId = this.telemetryService.generateSpanId();

    req.traceId = traceId;

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-Trace-Id', traceId);
      res.setHeader('traceparent', this.telemetryService.formatTraceparent(traceId, spanId));
    }

    const start = Date.now();
    const isAutomotiveRoute =
      req.path?.startsWith('/api/diagnostics') ||
      req.path?.startsWith('/api/work-orders') ||
      req.path?.startsWith('/api/parts');

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
                path: req.path,
                statusCode: res.statusCode,
                durationMs,
                agencyId: req.user?.agencyId ?? 'anonymous',
                actorId: req.user?.id,
              }),
            );
          }
        },
        error: (err) => {
          if (isAutomotiveRoute) {
            const durationMs = Date.now() - start;
            this.logger.warn(
              JSON.stringify({
                event: 'AUTOMOTIVE_HTTP_SPAN_ERROR',
                timestamp: new Date().toISOString(),
                traceId,
                spanId,
                method: req.method,
                path: req.path,
                statusCode: err.status || 500,
                durationMs,
                errorMessage: err.message,
                agencyId: req.user?.agencyId ?? 'anonymous',
                actorId: req.user?.id,
              }),
            );
          }
        },
      }),
    );
  }
}
