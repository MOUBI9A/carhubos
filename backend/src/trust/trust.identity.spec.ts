import { TrustService } from './trust.service';

/**
 * Golden-value tests for the keyed identity derivation.
 *
 * hashIdentity() is HMAC-SHA256(IDENTITY_PEPPER, normalize(type, number)).
 * These values are PINNED under a fixed test pepper: if the hashing primitive
 * or the normalize() semantics ever change, every stored identity hash would
 * silently change too (breaking cross-agency matching and requiring a
 * backfill) — so this test locks both in place.
 *
 * hashIdentity / pepper are private; we reach them through an `any` cast.
 * They do not touch Prisma, so a null dependency is sufficient here.
 */
const TEST_PEPPER = 'test-pepper-fixed-2026';

function makeService(): any {
  return new TrustService(null as any) as any;
}

describe('TrustService identity hashing', () => {
  const savedPepper = process.env.IDENTITY_PEPPER;

  afterEach(() => {
    if (savedPepper === undefined) delete process.env.IDENTITY_PEPPER;
    else process.env.IDENTITY_PEPPER = savedPepper;
  });

  describe('golden values under a fixed pepper', () => {
    beforeEach(() => {
      process.env.IDENTITY_PEPPER = TEST_PEPPER;
    });

    it('pins the HMAC-SHA256 hash for a fixed CIN', () => {
      const svc = makeService();
      expect(svc.hashIdentity('CIN', 'AB123456')).toBe(
        '52e124b62a64c89f8d82a444d926f45431610c101ae8f0bf5e9d916502c5c8f5',
      );
    });

    it('pins the HMAC-SHA256 hash for a fixed passport number', () => {
      const svc = makeService();
      expect(svc.hashIdentity('PASSPORT', 'X9988776')).toBe(
        '432ea00045092496b9bb02068b0907ba586f92bd31988e9bf9e5c2aa576ae181',
      );
    });

    it('preserves normalize() semantics: case, whitespace and punctuation are folded', () => {
      const svc = makeService();
      // Lowercase type, lowercased number with spaces and a dash must produce
      // the exact same hash as the canonical "CIN" / "AB123456" form above.
      expect(svc.hashIdentity('cin', ' ab-123 456 ')).toBe(
        '52e124b62a64c89f8d82a444d926f45431610c101ae8f0bf5e9d916502c5c8f5',
      );
    });

    it('produces a 64-char hex digest', () => {
      const svc = makeService();
      expect(svc.hashIdentity('CIN', 'AB123456')).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('fail-fast when the pepper is missing', () => {
    it('throws when IDENTITY_PEPPER is unset', () => {
      delete process.env.IDENTITY_PEPPER;
      const svc = makeService();
      expect(() => svc.hashIdentity('CIN', 'AB123456')).toThrow(
        /IDENTITY_PEPPER is not set/,
      );
    });

    it('throws when IDENTITY_PEPPER is empty / whitespace-only', () => {
      process.env.IDENTITY_PEPPER = '   ';
      const svc = makeService();
      expect(() => svc.hashIdentity('CIN', 'AB123456')).toThrow(
        /IDENTITY_PEPPER is not set/,
      );
    });
  });
});
