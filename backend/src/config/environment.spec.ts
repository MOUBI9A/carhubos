import { validateEnvironment } from './environment';

describe('production environment validation', () => {
  const valid = {
    NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:password@db:5432/fider',
    JWT_SECRET: 'a'.repeat(48), IDENTITY_PEPPER: 'b'.repeat(48),
    PUBLIC_APP_URL: 'https://app.example.com', ALLOWED_ORIGINS: 'https://app.example.com',
  };
  it('allows manual beta production without payment credentials', () => {
    expect(() => validateEnvironment(valid)).not.toThrow();
  });
  it('leaves existing local development configuration supported', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).not.toThrow();
  });
  it.each(['DATABASE_URL', 'JWT_SECRET', 'IDENTITY_PEPPER', 'PUBLIC_APP_URL', 'ALLOWED_ORIGINS'])('requires %s', (name) => {
    expect(() => validateEnvironment({ ...valid, [name]: '' })).toThrow(name);
  });
  it.each(['http://app.example.com', 'https://app.example.com/path', 'https://user:secret@app.example.com', '*', 'https://localhost'])('rejects noncanonical production origin %s', (origin) => {
    expect(() => validateEnvironment({ ...valid, PUBLIC_APP_URL: origin, ALLOWED_ORIGINS: origin })).toThrow();
  });
  it('requires application origin in allowed origins', () => {
    expect(() => validateEnvironment({ ...valid, ALLOWED_ORIGINS: 'https://other.example.com' })).toThrow('PUBLIC_APP_URL');
  });
  it.each(['mock', 'cmi', 'invalid'])('rejects unsafe or unsupported provider %s', (provider) => {
    expect(() => validateEnvironment({ ...valid, PAYMENT_PROVIDER: provider })).toThrow('PAYMENT_PROVIDER');
  });
  it('requires signed-webhook credentials when Stripe is selected', () => {
    expect(() => validateEnvironment({ ...valid, PAYMENT_PROVIDER: 'stripe' })).toThrow('STRIPE_SECRET_KEY');
    expect(() => validateEnvironment({ ...valid, PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'present' })).toThrow('STRIPE_WEBHOOK_SECRET');
  });
  it('rejects template secrets without echoing their values', () => {
    const secret = 'CHANGE_ME_private_value_never_echoed';
    expect(() => validateEnvironment({ ...valid, JWT_SECRET: secret })).toThrow('JWT_SECRET');
    try { validateEnvironment({ ...valid, JWT_SECRET: secret }); } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
