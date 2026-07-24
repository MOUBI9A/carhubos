import {
  createSsrfSafeLookup,
  BlockedWebhookTargetError,
} from './webhook-ssrf-guard';

/**
 * The DTO's `isBlockedWebhookHost` only ever sees the hostname a caller typed
 * at subscribe time (see its own doc + R6's "Not done" note) — it can't catch
 * a hostname that resolves to a public IP today and a private one by the time
 * `sendPayload` actually connects (DNS rebinding). `createSsrfSafeLookup`
 * closes that by making the resolution used for validation the SAME one used
 * to open the connection, via the `lookup` option `http(s).Agent` accepts.
 * These specs inject a fake `dns.lookup` so no real DNS traffic happens.
 */
describe('createSsrfSafeLookup', () => {
  function fakeLookup(
    result:
      | { address: string; family: number }[]
      | Error,
  ) {
    return jest.fn((hostname: string, options: any, cb: any) => {
      if (result instanceof Error) {
        cb(result);
        return;
      }
      cb(null, result);
    });
  }

  it('resolves and pins to the address when it is public', (done) => {
    const lookupFn = fakeLookup([{ address: '93.184.216.34', family: 4 }]);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    lookup('hooks.example.com', {}, (err, address, family) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.216.34');
      expect(family).toBe(4);
      done();
    });
  });

  it('rejects when the resolved address is loopback', (done) => {
    const lookupFn = fakeLookup([{ address: '127.0.0.1', family: 4 }]);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    lookup('rebound.example.com', {}, (err) => {
      expect(err).toBeInstanceOf(BlockedWebhookTargetError);
      expect(err?.message).toContain('127.0.0.1');
      done();
    });
  });

  it('rejects when the resolved address is the cloud metadata link-local range', (done) => {
    const lookupFn = fakeLookup([{ address: '169.254.169.254', family: 4 }]);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    lookup('rebound.example.com', {}, (err) => {
      expect(err).toBeInstanceOf(BlockedWebhookTargetError);
      done();
    });
  });

  it('rejects the whole batch if ANY resolved address is private, even if another is public', (done) => {
    const lookupFn = fakeLookup([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    lookup('multi-answer.example.com', {}, (err) => {
      expect(err).toBeInstanceOf(BlockedWebhookTargetError);
      expect(err?.message).toContain('10.0.0.5');
      done();
    });
  });

  it('propagates a real DNS error (e.g. ENOTFOUND) unchanged', (done) => {
    const dnsError = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
      code: 'ENOTFOUND',
    });
    const lookupFn = fakeLookup(dnsError);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    lookup('does-not-exist.invalid', {}, (err) => {
      expect(err).toBe(dnsError);
      done();
    });
  });

  it('rejects when the resolver returns no addresses at all', (done) => {
    const lookupFn = fakeLookup([]);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    lookup('empty.example.com', {}, (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toMatch(/no addresses resolved/i);
      done();
    });
  });

  it('supports the (hostname, callback) call form Node uses when options is omitted', (done) => {
    const lookupFn = fakeLookup([{ address: '8.8.8.8', family: 4 }]);
    const lookup = createSsrfSafeLookup(lookupFn as any);

    // @ts-expect-error — deliberately calling the 2-arg overload
    lookup('hooks.example.com', (err: any, address: string) => {
      expect(err).toBeNull();
      expect(address).toBe('8.8.8.8');
      done();
    });
  });
});
