/** Validate names and formats only; errors must never echo secret values. */
export function validateEnvironment(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== 'production') return;
  for (const name of ['DATABASE_URL', 'JWT_SECRET', 'IDENTITY_PEPPER', 'ALLOWED_ORIGINS', 'PUBLIC_APP_URL']) {
    if (!env[name]?.trim()) throw new Error(`${name} is required in production.`);
  }
  for (const name of ['JWT_SECRET', 'IDENTITY_PEPPER']) {
    const value = env[name]!;
    if (value.length < 32 || /change.me|your_|placeholder|ci-only|test-secret/i.test(value)) {
      throw new Error(`${name} must be a strong production secret of at least 32 characters.`);
    }
  }
  const db = parseUrl('DATABASE_URL', env.DATABASE_URL!);
  if (!['postgres:', 'postgresql:'].includes(db.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL.');
  }
  const origins = env.ALLOWED_ORIGINS!.split(',').map((origin) => origin.trim());
  for (const origin of [...origins, env.PUBLIC_APP_URL!]) {
    const url = parseUrl('Production origin', origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.origin !== origin || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('Production origins must be canonical external HTTPS origins without credentials, paths or wildcards.');
    }
  }
  if (!origins.includes(env.PUBLIC_APP_URL!)) {
    throw new Error('PUBLIC_APP_URL must be included in ALLOWED_ORIGINS.');
  }
  const provider = (env.PAYMENT_PROVIDER?.trim() || 'disabled').toUpperCase();
  if (!['DISABLED', 'STRIPE'].includes(provider)) {
    throw new Error('Production PAYMENT_PROVIDER must be DISABLED or STRIPE; CMI is not implemented and MOCK is unsafe.');
  }
  if (provider === 'STRIPE') {
    for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) {
      if (!env[name]?.trim()) throw new Error(`${name} is required for Stripe payments.`);
    }
  }
}

function parseUrl(name: string, value: string) {
  try { return new URL(value); } catch { throw new Error(`${name} must be a valid URL.`); }
}
