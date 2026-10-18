import { NextRequest, NextResponse } from 'next/server';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  negotiateLocale,
} from './i18n/config';

export function proxy(request: NextRequest) {
  // Logged-out visitors do not need to boot the client AuthProvider and wait for
  // /auth/me just to discover that the public landing page is their destination.
  // Keep the existing client-side role redirect for authenticated users.
  if (request.nextUrl.pathname === '/' && !request.cookies.has('infinity_token')) {
    const landingUrl = request.nextUrl.clone();
    landingUrl.pathname = '/landing';
    return NextResponse.redirect(landingUrl);
  }

  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(existing)) {
    return NextResponse.next();
  }

  const locale = negotiateLocale(request.headers.get('accept-language')) || defaultLocale;
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
