import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

/**
 * Authenticated symmetric encryption for third-party credentials we must be
 * able to READ BACK (unlike passwords, which stay one-way hashed).
 *
 * An agency's GPS/telematics API key has to be replayed verbatim on every
 * outbound provider call, so hashing is not an option — but storing it in
 * plaintext would turn one leaked database dump into live control of every
 * customer's vehicles. AES-256-GCM gives confidentiality AND integrity: a
 * tampered ciphertext fails the auth tag instead of silently decrypting to
 * garbage that we might then send somewhere.
 *
 * Wire format (single string, easy to store in one column):
 *   v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 * The `v1` prefix is deliberate — it lets a future key-rotation or algorithm
 * change coexist with rows written by this version instead of guessing.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the GCM-recommended size
const AUTH_TAG_BYTES = 16;

/**
 * FAIL FAST, exactly like JWT_SECRET and IDENTITY_PEPPER: refuse to run
 * rather than fall back to a default key. A hardcoded fallback here would
 * mean every deployment shares one key and the encryption is decorative.
 *
 * The env var may be any length; it is stretched to the 32 bytes AES-256
 * needs via SHA-256 so operators can paste a passphrase or an
 * `openssl rand -base64 48` value without a length footgun.
 */
function encryptionKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || raw.trim() === '') {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY is not set. Refusing to store or read ' +
        'third-party credentials without an encryption key — set it before ' +
        'starting the service.',
    );
  }
  return createHash('sha256').update(raw).digest();
}

/** Encrypt a UTF-8 secret. Output is safe to persist and to log-redact by prefix. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a blob produced by {@link encryptSecret}. Throws on any tampering,
 * truncation, wrong key, or unknown version — never returns partial data.
 */
export function decryptSecret(blob: string): string {
  // Key first, deliberately: a missing key is an operator/config fault, and
  // reporting "malformed blob" for it would send whoever is debugging off
  // inspecting perfectly good data instead of their environment.
  const key = encryptionKey();

  const parts = (blob ?? '').split(':');
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted credential blob.');
  }
  const [version, ivB64, tagB64, dataB64] = parts;
  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted credential version "${version}".`);
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
    throw new Error('Malformed encrypted credential blob.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Constant-time compare for secrets that arrive from outside (provider
 * webhook signatures, shared tokens). `===` on secrets leaks length and
 * prefix through timing; this does not. Length mismatch short-circuits
 * because the buffers can't be compared anyway — that leak is unavoidable
 * and harmless next to a byte-by-byte one.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a ?? '', 'utf8');
  const bufB = Buffer.from(b ?? '', 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
