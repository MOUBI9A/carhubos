"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Only mounted when the server sees an auth cookie on `/`.
 * Public visitors never need to download/run this client-side role router.
 */
export default function RootAuthRouter() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!role) {
      // Missing/expired/invalid cookie: fall back to the public product page.
      router.replace('/landing');
      return;
    }

    switch (role) {
      case 'ROOT_ADMIN':
        router.replace('/admin');
        break;
      case 'OWNER':
      case 'MANAGER':
        router.replace('/dashboard');
        break;
      case 'AGENT':
        router.replace('/agent');
        break;
      case 'RENTER':
        router.replace('/portal');
        break;
      default:
        router.replace('/landing');
    }
  }, [role, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" aria-live="polite">
      <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center animate-pulse">
        <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
      </div>
      <span className="sr-only">Opening your workspace</span>
    </div>
  );
}
