import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ProvisionTenantDto } from './provision-tenant.dto';

/**
 * `subdomain` is public routing input — it becomes the `/agency/[subdomain]`
 * path segment, the lookup key for `GET /public/agency-by-subdomain/:subdomain`,
 * and (per the wizard's own summary step) a real `<subdomain>.fider.app` host.
 * These cases pin the constraint that keeps unroutable or colliding values out
 * of a unique, publicly-addressable column.
 */
describe('ProvisionTenantDto — subdomain is public routing input', () => {
  const base = {
    agencyName: 'Atlas Rentals',
    ownerName: 'Salma Bennani',
    ownerEmail: 'owner@atlas.ma',
    initialPassword: 'correct-horse',
  };

  const errorsFor = async (patch: Record<string, unknown>) =>
    validate(plainToInstance(ProvisionTenantDto, { ...base, ...patch }));

  const subdomainErrors = async (subdomain: unknown) =>
    (await errorsFor({ subdomain })).filter((e) => e.property === 'subdomain');

  it('accepts a well-formed vanity subdomain', async () => {
    expect(await subdomainErrors('atlas-cars-2')).toHaveLength(0);
  });

  it('accepts an omitted subdomain — it is genuinely optional', async () => {
    // The wizard sends `subdomain.trim() || undefined`. @IsOptional() skips
    // undefined/null but NOT '', so this guards the interaction between
    // @IsOptional and @Matches rather than @Matches alone.
    expect(await subdomainErrors(undefined)).toHaveLength(0);
  });

  it('rejects uppercase — Postgres unique indexes are case-sensitive', async () => {
    // 'Atlas' and 'atlas' would be two distinct rows that look identical to a
    // human, with only one resolvable via the public lookup.
    expect(await subdomainErrors('Atlas')).not.toHaveLength(0);
  });

  it.each([
    ['a space', 'atlas cars'],
    ['a path separator', 'atlas/admin'],
    ['a leading hyphen', '-atlas'],
    ['a trailing hyphen', 'atlas-'],
    ['an empty string', ''],
  ])('rejects %s', async (_label, value) => {
    expect(await subdomainErrors(value)).not.toHaveLength(0);
  });

  it('rejects a value past the 63-char DNS label limit', async () => {
    expect(await subdomainErrors('a'.repeat(64))).not.toHaveLength(0);
  });
});

describe('ProvisionTenantDto — owner credential floor', () => {
  const base = {
    agencyName: 'Atlas Rentals',
    ownerName: 'Salma Bennani',
    ownerEmail: 'owner@atlas.ma',
    initialPassword: 'correct-horse',
  };

  it('rejects a password under 8 characters', async () => {
    // The founder sets this password directly (email invites aren't built), so
    // the DTO is the only thing standing between a typo and a weak owner login.
    const errors = await validate(
      plainToInstance(ProvisionTenantDto, { ...base, initialPassword: 'short' }),
    );
    expect(errors.map((e) => e.property)).toContain('initialPassword');
  });

  it('rejects a malformed owner email', async () => {
    const errors = await validate(
      plainToInstance(ProvisionTenantDto, { ...base, ownerEmail: 'not-an-email' }),
    );
    expect(errors.map((e) => e.property)).toContain('ownerEmail');
  });
});
