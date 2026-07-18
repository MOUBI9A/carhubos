import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * API CONTRACT GUARD.
 *
 * Money columns are stored as SQL DECIMAL and surface from Prisma as
 * `Prisma.Decimal` (decimal.js). If those instances reach `JSON.stringify`
 * they serialise as STRINGS (e.g. "1500"), which silently breaks every
 * frontend consumer that does arithmetic/formatting on a `number`.
 *
 * This single global interceptor walks each controller response and rewrites
 * every `Prisma.Decimal` to a JS `number` (via `.toNumber()`), so money stays
 * a number on the wire — one place, no per-controller mapping to forget.
 *
 * It only recurses into plain objects and arrays; Dates, Buffers (PDF
 * endpoints), streams and other class instances pass through untouched.
 */
@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => convertDecimals(data)));
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function convertDecimals(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value;

  // The actual conversion: Prisma.Decimal -> number.
  if (Prisma.Decimal.isDecimal(value)) {
    return (value as Prisma.Decimal).toNumber();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return value;
    seen.add(value);
    for (let i = 0; i < value.length; i++) {
      value[i] = convertDecimals(value[i], seen);
    }
    return value;
  }

  // Only descend into plain data objects — never Date, Buffer, streams, or
  // other class instances, which must be forwarded verbatim.
  if (isPlainObject(value)) {
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Object.keys(value)) {
      value[key] = convertDecimals(value[key], seen);
    }
    return value;
  }

  return value;
}
