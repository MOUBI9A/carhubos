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

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error', statusCode: 500 };

    // Express `path` excludes the query string. This prevents sensitive query
    // parameters (for example temporary access/bypass tokens) from leaking into
    // structured logs or being reflected back in error responses.
    const safePath = request.path;

    this.logger.error(
      JSON.stringify({
        event: 'http_exception',
        requestId: request.requestId,
        method: request.method,
        path: safePath,
        statusCode: status,
        error:
          exception instanceof Error
            ? exception.name
            : 'UnknownError',
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      ...(typeof message === 'object' ? message : { message }),
      timestamp: new Date().toISOString(),
      path: safePath,
      requestId: request.requestId,
    });
  }
}
