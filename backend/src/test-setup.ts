// Jest `setupFiles` entry — runs once per worker, before any spec file's
// imports. auth.guard.ts (and trust.service.ts) throw at import time if
// JWT_SECRET/IDENTITY_PEPPER are unset (fail-fast, see CLAUDE.md §3), so any
// spec file that transitively imports them needs these set first. Several
// spec files set process.env.JWT_SECRET themselves before their own imports
// as a local workaround, but that only works by accident when Jest happens
// to run them in the same worker before a file that doesn't — e.g.
// webhooks.spec.ts imports WebhooksController -> AuthGuard without setting
// it, and failed in CI depending on test-file scheduling. Setting both here
// removes the ordering dependency; the `||` keeps this a no-op wherever a
// real value is already provided (e.g. the e2e Jest config, which does not
// use this file).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-fixed-2026';
process.env.IDENTITY_PEPPER = process.env.IDENTITY_PEPPER || 'test-identity-pepper-fixed-2026';
