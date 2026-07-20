// AuthGuard throws at import time if JWT_SECRET is unset (fail-fast) — set it
// before importing, matching the pattern used in trust.assess.spec.ts for
// IDENTITY_PEPPER.
process.env.JWT_SECRET = 'test-jwt-secret-fixed-2026';

import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function makeContext(request: any) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe('AuthGuard', () => {
  it('throws Unauthorized when there is no cookie or Authorization header', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const guard = new AuthGuard(jwtService as any);

    await expect(
      guard.canActivate(makeContext({ cookies: {}, headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when the token fails verification (invalid/expired)', async () => {
    const jwtService = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad token')) };
    const guard = new AuthGuard(jwtService as any);

    await expect(
      guard.canActivate(makeContext({ cookies: { infinity_token: 'bad' }, headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid cookie token and aliases the JWT sub claim as user.id', async () => {
    const payload = { sub: 'user-1', email: 'a@b.com', role: 'OWNER', agencyId: 'agency-1' };
    const jwtService = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    const guard = new AuthGuard(jwtService as any);

    const request: any = { cookies: { infinity_token: 'good-token' }, headers: {} };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(request.user).toMatchObject({ ...payload, id: 'user-1' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good-token', {
      secret: 'test-jwt-secret-fixed-2026',
    });
  });

  it('falls back to a Bearer Authorization header when there is no cookie', async () => {
    const payload = { sub: 'user-2', role: 'AGENT', agencyId: 'agency-1' };
    const jwtService = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    const guard = new AuthGuard(jwtService as any);

    const request: any = { cookies: {}, headers: { authorization: 'Bearer header-token' } };
    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token', expect.anything());
    expect(request.user.id).toBe('user-2');
  });

  it('ignores a non-Bearer Authorization scheme', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const guard = new AuthGuard(jwtService as any);

    await expect(
      guard.canActivate(
        makeContext({ cookies: {}, headers: { authorization: 'Basic dXNlcjpwYXNz' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('prefers the cookie over the Authorization header when both are present', async () => {
    const payload = { sub: 'cookie-user' };
    const jwtService = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    const guard = new AuthGuard(jwtService as any);

    const request: any = {
      cookies: { infinity_token: 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    };
    await guard.canActivate(makeContext(request));

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('cookie-token', expect.anything());
  });
});
