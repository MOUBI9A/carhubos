import { plainToInstance } from 'class-transformer';

import { LoginDto, RegisterDto } from '../auth/dto/auth.dto';
import { CreateStaffDto } from '../agency-staff/dto/agency-staff.dto';
import { ProvisionTenantDto } from '../saas-admin/dto/provision-tenant.dto';

/**
 * Cross-cutting guard for email case normalization.
 *
 * Postgres unique indexes and `findUnique({ where: { email } })` are
 * case-SENSITIVE, so every path that creates or looks up a `User` login must
 * agree on casing. A PARTIAL fix is worse than none: once login lowercases, any
 * entry point that still writes mixed case mints an account whose owner can
 * never sign in (the lookup lowercases, the stored row doesn't match) and which
 * also slips past the duplicate check.
 *
 * That is exactly what happened once — `CreateStaffDto` was missed when
 * login/register/provision were normalized. This spec enumerates every identity
 * entry point so the next one added fails here instead of in production.
 *
 * Non-identity emails (`Customer.email`, `Agency.contactEmail`) are deliberately
 * out of scope: they are contact details, not login keys, and are not used for
 * authentication lookups.
 */
describe('identity email normalization — every User entry point agrees on casing', () => {
  const MIXED = '  Owner@Agency.MA  ';
  const NORMALIZED = 'owner@agency.ma';

  const IDENTITY_ENTRY_POINTS: Array<{
    name: string;
    cls: new () => object;
    field: string;
    payload: Record<string, unknown>;
  }> = [
    {
      name: 'LoginDto (sign in)',
      cls: LoginDto,
      field: 'email',
      payload: { password: 'whatever-123' },
    },
    {
      name: 'RegisterDto (self-serve signup)',
      cls: RegisterDto,
      field: 'email',
      payload: { password: 'whatever-123', name: 'X', agencyName: 'Y' },
    },
    {
      name: 'CreateStaffDto (owner invites staff)',
      cls: CreateStaffDto,
      field: 'email',
      payload: { name: 'X', password: 'whatever-123', preset: 'AGENT' },
    },
    {
      name: 'ProvisionTenantDto (founder provisions a tenant)',
      cls: ProvisionTenantDto,
      field: 'ownerEmail',
      payload: {
        agencyName: 'Y',
        ownerName: 'X',
        initialPassword: 'whatever-123',
      },
    },
  ];

  it.each(IDENTITY_ENTRY_POINTS)(
    '$name lowercases and trims its email',
    ({ cls, field, payload }) => {
      const dto = plainToInstance(cls, { ...payload, [field]: MIXED }) as Record<
        string,
        unknown
      >;
      expect(dto[field]).toBe(NORMALIZED);
    },
  );

  it('leaves an already-normalized address untouched', () => {
    const dto = plainToInstance(LoginDto, {
      email: NORMALIZED,
      password: 'whatever-123',
    });
    expect(dto.email).toBe(NORMALIZED);
  });

  it('does not throw on a non-string email (validation reports it instead)', () => {
    // @Transform runs BEFORE @IsEmail, so it must tolerate junk input rather
    // than crash the pipe — the 400 should come from validation, not a TypeError.
    expect(() =>
      plainToInstance(LoginDto, { email: 12345, password: 'whatever-123' }),
    ).not.toThrow();
  });
});
