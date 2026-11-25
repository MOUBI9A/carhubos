import { ServiceUnavailableException } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';

// The sorted set contains one entry per admitted request in the sliding window.
// Replacing it with a short-lived string starts a block; rejected attempts do
// not extend it. Each decision runs atomically using the Redis server clock.
const incrementScript = `
local key = KEYS[1]
local ttl, limit, block = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
if redis.call('TYPE', key).ok == 'string' then
  local remaining = math.max(1, redis.call('PTTL', key))
  return {limit + 1, remaining, remaining}
end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - ttl)
local hits = redis.call('ZCARD', key) + 1
if hits > limit then
  redis.call('SET', key, 'blocked', 'PX', block)
  return {hits, block, block}
end
redis.call('ZADD', key, now, ARGV[4])
redis.call('PEXPIRE', key, ttl)
local first = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
return {hits, tonumber(first[2]) + ttl - now, 0}
`;

export function configuredStorage(
  env: NodeJS.ProcessEnv,
): ThrottlerStorage | undefined {
  const mode = env.THROTTLE_STORAGE ?? 'memory';
  if (mode === 'memory') return undefined;
  if (mode !== 'upstash') throw new Error('Invalid THROTTLE_STORAGE selection');

  const endpoint = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const namespace = env.THROTTLE_NAMESPACE;
  if (
    !endpoint ||
    !/^https:\/\/[\w-]+\.upstash\.io\/?$/.test(endpoint) ||
    !token?.trim() ||
    !namespace ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(namespace)
  ) {
    throw new Error(
      'Shared throttling requires an Upstash HTTPS endpoint, token and stage-specific THROTTLE_NAMESPACE',
    );
  }
  return new SharedThrottleStorage(endpoint, token, namespace);
}

export class SharedThrottleStorage implements ThrottlerStorage {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
    private readonly namespace: string,
    private readonly send: typeof fetch = fetch,
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    try {
      const response = await this.send(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          'EVAL',
          incrementScript,
          '1',
          ['fider', this.namespace, 'throttle', throttlerName, key].join(':'),
          String(ttl),
          String(limit),
          String(blockDuration),
          randomUUID(),
        ]),
        redirect: 'error',
        signal: AbortSignal.timeout(1500),
      });
      if (!response.ok) throw new Error();
      const data: { result?: unknown; error?: unknown } = await response.json();
      const values = data.result;
      if (
        data.error ||
        !Array.isArray(values) ||
        values.length !== 3 ||
        !values.every(
          (v: unknown) =>
            typeof v === 'number' && Number.isSafeInteger(v) && v >= 0,
        )
      ) {
        throw new Error();
      }
      const [hits, expiresMs, blockMs] = values as number[];
      if (!hits || !expiresMs || hits > limit !== blockMs > 0)
        throw new Error();
      return {
        totalHits: hits,
        timeToExpire: Math.ceil(expiresMs / 1000),
        isBlocked: blockMs > 0,
        timeToBlockExpire: Math.ceil(blockMs / 1000),
      };
    } catch {
      // The remote may have counted this request. Refuse the guarded operation
      // and avoid retrying it or revealing provider errors/credentials.
      throw new ServiceUnavailableException('Rate limit service unavailable');
    }
  }
}
