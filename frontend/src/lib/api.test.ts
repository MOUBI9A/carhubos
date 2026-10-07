import { afterEach, describe, expect, it, vi } from 'vitest';
import api from './api';

afterEach(() => vi.unstubAllGlobals());

describe('API authentication redirects', () => {
  it.each(['/', '/landing', '/landing/features', '/login', '/signup', '/agency/demo'])('keeps unauthenticated visitors on %s', async (pathname) => {
    const location = { pathname, href: pathname };
    vi.stubGlobal('window', { location });
    const error = { response: { status: 401 } };
    await expect(api.get('/auth/me', { adapter: () => Promise.reject(error) })).rejects.toBe(error);
    expect(location.href).toBe(pathname);
  });

  it.each(['/dashboard', '/admin', '/agent/tasks', '/portal', '/agency-private', '/landing-admin', '/login-other'])('redirects expired sessions on %s', async (pathname) => {
    const location = { pathname, href: pathname };
    vi.stubGlobal('window', { location });
    const error = { response: { status: 401 } };
    await expect(api.get('/auth/me', { adapter: () => Promise.reject(error) })).rejects.toBe(error);
    expect(location.href).toBe('/login');
  });

  it('does not redirect capability failures', async () => {
    const location = { pathname: '/dashboard', href: '/dashboard' };
    vi.stubGlobal('window', { location });
    const error = { response: { status: 403 } };
    await expect(api.get('/expenses', { adapter: () => Promise.reject(error) })).rejects.toBe(error);
    expect(location.href).toBe('/dashboard');
  });
});
