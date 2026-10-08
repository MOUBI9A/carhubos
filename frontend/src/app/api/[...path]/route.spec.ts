// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('same-origin runtime API proxy', () => {
  it('uses the current server-only origin and preserves webhook bytes and cookies', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      headers: { 'content-type': 'application/json', 'set-cookie': 'infinity_token=opaque; HttpOnly; Secure; Path=/' },
    }));
    vi.stubGlobal('fetch', upstream);
    vi.stubEnv('API_INTERNAL_URL', 'http://localhost:5406');
    const raw = '{ "paid": true }';
    const response = await POST(new NextRequest('https://app.example.com/api/payments/webhooks/stripe?x=1', {
      method: 'POST', body: raw, headers: { 'stripe-signature': 'signature', cookie: 'session=opaque', 'content-type': 'application/json' },
    }));
    expect(String(upstream.mock.calls[0][0])).toBe('http://localhost:5406/api/payments/webhooks/stripe?x=1');
    const options = upstream.mock.calls[0][1];
    expect(new TextDecoder().decode(options.body)).toBe(raw);
    expect(options.headers.get('stripe-signature')).toBe('signature');
    expect(options.headers.get('cookie')).toBe('session=opaque');
    expect(options.redirect).toBe('manual');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('cache-control')).toBe('no-store');
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:6406');
    await GET(new NextRequest('https://app.example.com/api/health'));
    expect(String(upstream.mock.calls[1][0])).toBe('http://backend:6406/api/health');
  });

  it('fails closed in production when internal service configuration is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('API_INTERNAL_URL', '');
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    expect((await GET(new NextRequest('https://app.example.com/api/health'))).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('does not expose upstream connection errors', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:5406');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private-host-secret')));
    const response = await GET(new NextRequest('https://app.example.com/api/health'));
    expect(response.status).toBe(502); expect(await response.text()).not.toContain('private-host-secret');
  });

  it('rejects configured URLs containing credentials', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://user:secret@backend:5406');
    expect((await GET(new NextRequest('https://app.example.com/api/health'))).status).toBe(503);
  });
});
