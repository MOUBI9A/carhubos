import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ServerTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ServerTiming');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = performance.now();
    const httpCtx = context.switchToHttp();
    const response = httpCtx.getResponse<Response>();
    const request = httpCtx.getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Math.round((performance.now() - start) * 10) / 10;
        if (response && typeof response.setHeader === 'function') {
          // Standard Server-Timing header for browser DevTools Performance & Network panels
          response.setHeader('Server-Timing', `total;dur=${duration};desc="Total"`);
        }

        if (duration > 300) {
          this.logger.warn(
            `Slow API call: ${request?.method} ${request?.url} took ${duration}ms`,
          );
        }
      }),
    );
  }
}
