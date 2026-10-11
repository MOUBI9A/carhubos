import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error', statusCode: 500 };

    const requestId =
      request.correlationId ||
      (request.headers['x-request-id'] as string) ||
      'unknown-req';

    // Mask sensitive fields in logs
    const sanitizedLogMessage = this.maskSensitiveData(rawMessage);

    this.logger.error(
      `[${requestId}] [${request.method} ${request.url}] Status: ${status} Payload: ${JSON.stringify(sanitizedLogMessage)}`,
      (exception as Error)?.stack,
    );

    const errorPayload =
      typeof rawMessage === 'object' && rawMessage !== null
        ? rawMessage
        : { message: rawMessage };

    response.status(status).json({
      ...errorPayload,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map((item) => this.maskSensitiveData(item));

    const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'identityNumber', 'access_token'];
    const masked: Record<string, any> = {};

    for (const [key, val] of Object.entries(data)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        masked[key] = '***MASKED***';
      } else if (typeof val === 'object' && val !== null) {
        masked[key] = this.maskSensitiveData(val);
      } else {
        masked[key] = val;
      }
    }
    return masked;
  }
}
