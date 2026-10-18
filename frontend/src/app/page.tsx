import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import RootAuthRouter from '@/components/RootAuthRouter';

/**
 * Fast public entry path.
 *
 * Authentication is still verified by the existing `/auth/me` flow for users
 * who present the HttpOnly session cookie. Visitors without any session cookie
 * can go straight to the public landing page without hydrating AuthContext and
 * waiting for a client-side redirect.
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get('infinity_token')?.value);

  if (!hasSessionCookie) {
    redirect('/landing');
  }

  return <RootAuthRouter />;
}
