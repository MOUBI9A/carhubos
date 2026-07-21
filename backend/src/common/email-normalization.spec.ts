import { plainToInstance } from 'class-transformer';
import { LoginDto, RegisterDto } from '../auth/dto/auth.dto';
import { ProvisionTenantDto } from '../saas-admin/dto/provision-tenant.dto';

/**
 * Regression guard for the case-sensitivity bug: Postgres `findUnique({ where:
 * { email } })` is case-sensitive, so every identity email must be normalized at
 * the DTO boundary (trim + lowercase) — covering both the stored value and the
 * lookup key. `plainToInstance` runs the same @Transform the ValidationPipe does
 * (transform: true), so asserting on it proves the real request path.
 */
describe('Email normalization at the DTO boundary (@NormalizeEmail)', () => {
  it('LoginDto lowercases + trims email (so login matches the stored row)', () => {
    const dto = plainToInstance(LoginDto, { email: '  Owner@X.MA  ', password: 'secret123' });
    expect(dto.email).toBe('owner@x.ma');
  });

  it('RegisterDto lowercases + trims email (so it is stored normalized)', () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'New.User@Gmail.COM',
      password: 'secret123',
      name: 'New User',
    });
    expect(dto.email).toBe('new.user@gmail.com');
  });

  it('ProvisionTenantDto lowercases + trims ownerEmail (founder types someone else’s address)', () => {
    const dto = plainToInstance(ProvisionTenantDto, {
      agencyName: 'Atlas',
      ownerName: 'Sara',
      ownerEmail: 'Founder@Client.CO ',
      initialPassword: 'secret123',
    });
    expect(dto.ownerEmail).toBe('founder@client.co');
  });

  it('leaves a non-string value untouched (no crash on undefined)', () => {
    const dto = plainToInstance(LoginDto, { password: 'secret123' });
    expect(dto.email).toBeUndefined();
  });
});
