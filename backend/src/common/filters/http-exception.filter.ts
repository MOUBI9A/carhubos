import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';
import { httpRouteLabel } from '../telemetry/safe-http';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const safePath = httpRouteLabel(request);
    const message =
      status === 404 && safePath === 'unmatched'
        ? { message: 'Not Found', statusCode: status }
        : exception instanceof HttpException
          ? exception.getResponse()
          : { message: 'Internal server error', statusCode: 500 };

    this.logger.error(
      JSON.stringify({
        event: 'http_exception',
        requestId: request.requestId,
        method: request.method,
        path: safePath,
        statusCode: status,
      }),
    );

    response.status(status).json({
      ...(typeof message === 'object' ? message : { message }),
      timestamp: new Date().toISOString(),
      path: safePath,
      requestId: request.requestId,
    });
  }
}
