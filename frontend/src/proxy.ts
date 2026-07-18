import { NextRequest, NextResponse } from 'next/server';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  negotiateLocale,
} from './i18n/config';

export function proxy(request: NextRequest) {
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
