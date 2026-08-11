import { decryptSecret, encryptSecret, safeEqual } from './crypto';

/**
 * The credential-at-rest primitive. These tests exist because the failure
 * modes here are silent: a broken cipher still "works" (round-trips) while
 * offering no real protection, so the tests assert the properties that
 * actually matter — nondeterminism, tamper-detection, and fail-fast on a
 * missing key — not just that encrypt/decrypt are inverses.
 */
const KEY = 'test-credentials-encryption-key-2026';

describe('crypto — credential encryption at rest', () => {
  const saved = process.env.CREDENTIALS_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = saved;
  });

  it('round-trips a secret', () => {
    const secret = JSON.stringify({ email: 'a@b.co', password: 'hunter2' });
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('never emits the plaintext inside the stored blob', () => {
    const blob = encryptSecret('super-secret-api-key');
    expect(blob).not.toContain('super-secret-api-key');
    expect(blob.startsWith('v1:')).toBe(true);
  });

  it('produces a different ciphertext each time (random IV, no pattern leak)', () => {
    const a = encryptSecret('same-input');
    const b = encryptSecret('same-input');
    expect(a).not.toBe(b);
    // ...but both still decrypt correctly.
    expect(decryptSecret(a)).toBe('same-input');
    expect(decryptSecret(b)).toBe('same-input');
  });

  it('rejects a tampered ciphertext instead of returning garbage', () => {
    const blob = encryptSecret('do-not-tamper');
    const [v, iv, tag, data] = blob.split(':');
    // Flip a byte in the payload.
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;
    const tampered = [v, iv, tag, flipped.toString('base64')].join(':');

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('rejects a blob encrypted under a different key', () => {
    const blob = encryptSecret('cross-key');
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'a-completely-different-key';
    expect(() => decryptSecret(blob)).toThrow();
  });

  it('rejects malformed and unknown-version blobs', () => {
    expect(() => decryptSecret('not-a-blob')).toThrow(/Malformed/);
    expect(() => decryptSecret('v9:a:b:c')).toThrow(/Unsupported/);
  });

  it('fails fast when the key is unset rather than using a default', () => {
    // Encrypt while the key is present, so the blob itself is valid and the
    // only thing wrong on the way back is the missing key.
    const blob = encryptSecret('needs-a-key');

    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow(
      /CREDENTIALS_ENCRYPTION_KEY is not set/,
    );
    expect(() => decryptSecret(blob)).toThrow(
      /CREDENTIALS_ENCRYPTION_KEY is not set/,
    );
  });

  it('reports a missing key even when the blob is ALSO malformed (config fault first)', () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    // "Malformed blob" here would send whoever is debugging off inspecting
    // data when the actual problem is their environment.
    expect(() => decryptSecret('garbage')).toThrow(
      /CREDENTIALS_ENCRYPTION_KEY is not set/,
    );
  });

  it('fails fast on a whitespace-only key', () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = '   ';
    expect(() => encryptSecret('x')).toThrow(
      /CREDENTIALS_ENCRYPTION_KEY is not set/,
    );
  });
});

describe('crypto — safeEqual', () => {
  it('matches identical strings and rejects different ones', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });

  it('returns false on length mismatch without throwing', () => {
    expect(safeEqual('short', 'much-longer-value')).toBe(false);
  });

  it('handles empty/undefined input safely', () => {
    expect(safeEqual('', '')).toBe(true);
    expect(safeEqual(undefined as any, '')).toBe(true);
    expect(safeEqual(undefined as any, 'x')).toBe(false);
  });
});
