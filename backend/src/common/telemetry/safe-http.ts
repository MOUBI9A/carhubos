import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { RequestWithId } from '../middleware/request-id.middleware';

const logger = new Logger('HTTP');

/** Express supplies route.path from its registered route, even when the URL contains a token. */
export function httpRouteLabel(request: Request): string {
  const pattern: unknown = request.route?.path;
  return typeof pattern === 'string' && pattern.startsWith('/') ? pattern : 'unmatched';
}

export function httpAccessLog(request: RequestWithId, response: Response, next: NextFunction) {
  const started = Date.now();
  response.once('finish', () => {
    logger.log(JSON.stringify({
      event: 'http_request',
      requestId: request.requestId,
      method: request.method,
      path: httpRouteLabel(request),
      statusCode: response.statusCode,
      durationMs: Date.now() - started,
    }));
  });
  next();
}
