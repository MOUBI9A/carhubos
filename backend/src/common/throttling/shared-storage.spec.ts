import { ServiceUnavailableException } from '@nestjs/common';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { configuredStorage, SharedThrottleStorage } from './shared-storage';

const endpoint = 'https://test-db.upstash.io';
const enabled = {
  THROTTLE_STORAGE: 'upstash',
  UPSTASH_REDIS_REST_URL: endpoint,
  UPSTASH_REDIS_REST_TOKEN: 'test-only',
  THROTTLE_NAMESPACE: 'example-stage',
};

describe('shared throttling', () => {
  it('requires an explicit mode, destination, credentials and namespace', () => {
    expect(configuredStorage({})).toBeUndefined();
    expect(configuredStorage(enabled)).toBeInstanceOf(SharedThrottleStorage);
    for (const invalid of [
      { THROTTLE_STORAGE: 'unknown' },
      { ...enabled, UPSTASH_REDIS_REST_URL: 'http://other.invalid' },
      { ...enabled, UPSTASH_REDIS_REST_TOKEN: '' },
      { ...enabled, THROTTLE_NAMESPACE: 'a:b' },
    ]) {
      expect(() => configuredStorage(invalid)).toThrow();
    }
  });

  it.each([
    () => Promise.reject(new Error('sensitive transport error')),
    () =>
      Promise.resolve(new Response('sensitive upstream body', { status: 500 })),
    () => Promise.resolve(Response.json({ error: 'provider details' })),
    () => Promise.resolve(Response.json({ result: [0, 0, 0] })),
    () => Promise.resolve(Response.json({ result: [100, 1000, 0] })),
    () => Promise.resolve(Response.json({ result: ['2', 1000, 0] })),
  ])('refuses the request on an ambiguous storage result', async (failure) => {
    const send = jest.fn(failure);
    const storage = new SharedThrottleStorage(endpoint, 'secret', 'test', send);
    await expect(
      storage.increment('digest', 60000, 5, 60000, 'default'),
    ).rejects.toThrow(
      new ServiceUnavailableException('Rate limit service unavailable'),
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});

// Opt in where redis-server and redis-cli are installed. Each run creates its
// own Unix-socket Redis process and removes it afterwards.
const integration =
  process.env.TEST_LOCAL_THROTTLE_REDIS === '1' ? describe : describe.skip;
integration('atomic rolling window across application replicas', () => {
  const run = promisify(execFile);
  let directory: string;
  let socket: string;
  let server: ChildProcess;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'rate-test-'));
    socket = join(directory, 'redis.sock');
    server = spawn(
      'redis-server',
      [
        '--port',
        '0',
        '--unixsocket',
        socket,
        '--unixsocketperm',
        '700',
        '--save',
        '',
        '--appendonly',
        'no',
        '--dir',
        directory,
      ],
      { stdio: 'ignore' },
    );
    const ready = (async () => {
      for (let i = 0; i < 40; i++) {
        try {
          await run('redis-cli', ['-s', socket, 'PING']);
          return;
        } catch {
          await delay(50);
        }
      }
      throw new Error('Local Redis did not start');
    })();
    await Promise.race([
      ready,
      new Promise<never>((_, reject) => server.once('error', reject)),
    ]);
  });
  afterAll(async () => {
    if (server?.pid && server.exitCode === null) {
      const stopped = new Promise<void>((resolve) =>
        server.once('exit', () => resolve()),
      );
      server.kill('SIGTERM');
      await stopped;
    }
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  function replica(namespace: string) {
    return new SharedThrottleStorage(
      endpoint,
      'test-token',
      namespace,
      async (_url, request) => {
        const command = JSON.parse(String(request?.body)) as string[];
        const { stdout } = await run('redis-cli', [
          '--json',
          '-s',
          socket,
          ...command,
        ]);
        return Response.json({ result: JSON.parse(stdout) });
      },
    );
  }
  it('admits only the shared limit, isolates namespaces and reopens after the block', async () => {
    const replicas = [replica('staging'), replica('staging')];
    const hit = (store: SharedThrottleStorage) =>
      store.increment('bucket', 10000, 5, 1000, 'default');
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => hit(replicas[i % 2])),
    );
    expect(results.filter((r) => !r.isBlocked)).toHaveLength(5);
    expect(
      results
        .filter((r) => r.isBlocked)
        .every((r) => r.timeToBlockExpire === 1),
    ).toBe(true);
    expect((await hit(replica('pilot'))).totalHits).toBe(1);
    await delay(1050);
    expect(await hit(replicas[1])).toMatchObject({
      isBlocked: false,
      totalHits: 1,
    });
  });
  it('expires admitted hits without blocking a later request', async () => {
    const store = replica('ttl');
    const hit = () => store.increment('bucket', 150, 1, 10000, 'default');
    expect((await hit()).totalHits).toBe(1);
    await delay(200);
    expect(await hit()).toMatchObject({ isBlocked: false, totalHits: 1 });
  });
});
