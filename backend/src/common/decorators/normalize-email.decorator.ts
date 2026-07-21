import { Transform } from 'class-transformer';

/**
 * Normalizes an email field at the DTO boundary: `trim()` + `toLowerCase()`.
 *
 * Apply to every email that is an identity / lookup key (login, register,
 * founder-provisioned owner). Postgres `findUnique({ where: { email } })` is
 * case-SENSITIVE, so without this `Owner@X.ma` and `owner@x.ma` are two distinct
 * accounts: a user who signs in with different capitalization than they
 * registered with gets "invalid credentials", and a founder who provisions
 * someone else's address in a different case can lock them out.
 *
 * Because all three entry points are DTO-validated with `transform: true`,
 * normalizing here covers BOTH the write (what's stored) and the read (what's
 * looked up) — no separate service logic and, since every existing row is
 * already lowercase, no backfill migration.
 */
export function NormalizeEmail() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
