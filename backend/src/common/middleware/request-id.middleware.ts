import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { requestId?: string };

/**
 * Adds a stable correlation id to every request and response. If an upstream
 * proxy already supplied a sane x-request-id we preserve it so application
 * logs can be joined with edge/load-balancer logs.
 */
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id')?.trim();
  const requestId =
    incoming && incoming.length <= 128 ? incoming : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
